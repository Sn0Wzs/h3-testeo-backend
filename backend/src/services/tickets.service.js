import { enTransaccion, siguienteId } from '../db/pool.js'
import { catalogoRepository } from '../repositories/catalogo.repository.js'
import { ticketsRepository } from '../repositories/tickets.repository.js'
import { ServiceError, validationError } from '../utils/ServiceError.js'

const TEXTO_REQUERIDO = 'Completa este campo.'
const AMBIENTE_REQUERIDO = 'Elige el aula o ambiente de la lista.'
const DIAS_PLAZO_REAPERTURA = 7
const PLAZO_REAPERTURA_MS = DIAS_PLAZO_REAPERTURA * 24 * 60 * 60 * 1000

function normalizarDatos(datos) {
  return {
    categoriaId: typeof datos?.categoriaId === 'string' ? datos.categoriaId.trim() : '',
    subcategoriaId: typeof datos?.subcategoriaId === 'string' ? datos.subcategoriaId.trim() : '',
    ambienteId: typeof datos?.ambienteId === 'string' ? datos.ambienteId.trim() : '',
    asunto: typeof datos?.asunto === 'string' ? datos.asunto.trim() : '',
    descripcion: typeof datos?.descripcion === 'string' ? datos.descripcion.trim() : '',
  }
}

function validarDatos(datos) {
  const errores = {
    categoriaId: datos.categoriaId ? null : TEXTO_REQUERIDO,
    subcategoriaId: datos.subcategoriaId ? null : TEXTO_REQUERIDO,
    ambienteId: datos.ambienteId ? null : AMBIENTE_REQUERIDO,
    asunto: datos.asunto ? null : TEXTO_REQUERIDO,
    descripcion: datos.descripcion ? null : TEXTO_REQUERIDO,
  }

  if (datos.asunto.length > 120) errores.asunto = 'Usa como máximo 120 caracteres.'
  if (datos.descripcion.length > 600) errores.descripcion = 'Usa como máximo 600 caracteres.'
  return Object.fromEntries(Object.entries(errores).filter(([, mensaje]) => mensaje))
}

// Crea el reporte con datos del catálogo y registra su estado inicial.
export async function crearTicket(usuario, entrada) {
  if (usuario?.rol !== 'usuario') {
    throw new ServiceError(403, 'FORBIDDEN', 'Solo una cuenta de usuario puede registrar tickets.')
  }

  const datos = normalizarDatos(entrada)
  const fieldErrors = validarDatos(datos)
  if (Object.keys(fieldErrors).length > 0) throw validationError(fieldErrors)

  const categoria = await catalogoRepository.buscarCategoriaActiva(datos.categoriaId)
  if (!categoria) throw validationError({ categoriaId: 'Elige una categoría disponible.' })

  const subcategoria = await catalogoRepository.buscarSubcategoriaActiva(datos.subcategoriaId, categoria.id)
  if (!subcategoria) {
    throw validationError({ subcategoriaId: 'Elige una subcategoría disponible para esta categoría.' })
  }

  const ambiente = await catalogoRepository.buscarAmbiente(datos.ambienteId)
  if (!ambiente) throw validationError({ ambienteId: AMBIENTE_REQUERIDO })

  return enTransaccion(async (db) => {
    const id = await siguienteId(db, 'tickets', 'tck', 5)
    const creadoEn = new Date()
    const ticket = {
      id,
      codigo: `TCK-${creadoEn.getFullYear()}-${id.slice('tck-'.length)}`,
      usuarioId: usuario.id,
      categoriaId: categoria.id,
      subcategoriaId: subcategoria.id,
      ambienteId: ambiente.id,
      asunto: datos.asunto,
      descripcion: datos.descripcion,
      prioridad: subcategoria.prioridadPorDefecto ?? categoria.prioridadPorDefecto,
      tiempoEsperadoHoras: subcategoria.tiempoEsperadoHoras ?? categoria.tiempoEsperadoHoras,
      estado: 'abierto',
      creadoEn,
      cerradoEn: null,
      asignadoA: null,
    }

    await ticketsRepository.insertar(ticket, db)
    await ticketsRepository.insertarEventoInicial({
      id: await siguienteId(db, 'historial', 'his'),
      ticketId: id,
      usuarioId: usuario.id,
      creadoEn,
    }, db)
    await ticketsRepository.insertarEntradaInicial({
      id: await siguienteId(db, 'bitacora', 'bit'),
      ticketId: id,
      usuarioId: usuario.id,
      mensaje: datos.descripcion,
      creadoEn,
    }, db)
    return ticket
  })
}

function exigirUsuario(usuario) {
  if (usuario?.rol !== 'usuario') {
    throw new ServiceError(403, 'FORBIDDEN', 'Solo una cuenta de usuario puede consultar sus tickets.')
  }
}

// Devuelve solo tickets del usuario y oculta las notas internas del equipo.
async function detallePropio(referencia, usuarioId, db) {
  const ticket = await ticketsRepository.buscarDetallePropio(referencia, usuarioId, db)
  if (!ticket) {
    throw new ServiceError(404, 'TICKET_NOT_FOUND', 'No encontramos un ticket de tu cuenta con ese código.')
  }
  const [bitacora, eventos] = await Promise.all([
    ticketsRepository.listarEntradasPublicas(ticket.id, db),
    ticketsRepository.listarEventos(ticket.id, db),
  ])
  return {
    ticket,
    espera: null,
    tiempos: { esperadoHoras: ticket.tiempoEsperadoHoras },
    desenlace: null,
    bitacora,
    eventos,
    permisos: { comentar: !['cerrado', 'cancelado'].includes(ticket.estado) },
  }
}

export async function obtenerDetalleTicket(usuario, referencia) {
  exigirUsuario(usuario)
  return detallePropio(referencia, usuario.id)
}

export async function agregarInformacion(usuario, referencia, entrada) {
  exigirUsuario(usuario)
  const mensaje = typeof entrada?.mensaje === 'string' ? entrada.mensaje.trim() : ''
  const fieldErrors = {}
  if (!mensaje) fieldErrors.mensaje = 'Escribe un mensaje antes de guardar.'
  else if (mensaje.length > 600) fieldErrors.mensaje = 'Usa como máximo 600 caracteres.'
  if (Object.keys(fieldErrors).length > 0) throw validationError(fieldErrors)

  await enTransaccion(async (db) => {
    const ticket = await ticketsRepository.buscarDetallePropio(referencia, usuario.id, db, { bloquear: true })
    if (!ticket) {
      throw new ServiceError(404, 'TICKET_NOT_FOUND', 'No encontramos un ticket de tu cuenta con ese código.')
    }
    if (['cerrado', 'cancelado'].includes(ticket.estado)) {
      throw new ServiceError(409, 'TICKET_CLOSED', 'El ticket ya no admite comentarios.')
    }
    await ticketsRepository.insertarEntrada({
      id: await siguienteId(db, 'bitacora', 'bit'),
      ticketId: ticket.id,
      autorId: usuario.id,
      mensaje,
      creadoEn: new Date(),
    }, db)
  })

  return detallePropio(referencia, usuario.id)
}

// Reabre un ticket propio dentro del plazo y deja el motivo en el historial.
export async function reabrirTicket(usuario, referencia, entrada) {
  exigirUsuario(usuario)
  const motivo = typeof entrada?.motivo === 'string' ? entrada.motivo.trim() : ''
  const fieldErrors = {}
  if (!motivo) fieldErrors.motivo = 'Indica por qué necesitas reabrir el ticket.'
  else if (motivo.length > 600) fieldErrors.motivo = 'Usa como máximo 600 caracteres.'
  if (Object.keys(fieldErrors).length > 0) throw validationError(fieldErrors)

  await enTransaccion(async (db) => {
    const ticket = await ticketsRepository.buscarDetallePropio(referencia, usuario.id, db, { bloquear: true })
    if (!ticket) {
      throw new ServiceError(404, 'TICKET_NOT_FOUND', 'No encontramos un ticket de tu cuenta con ese código.')
    }
    if (ticket.estado !== 'cerrado') {
      throw new ServiceError(409, 'TICKET_NOT_CLOSED', 'Solo puedes reabrir un ticket que está cerrado.')
    }

    const cerradoEn = new Date(ticket.cerradoEn).getTime()
    const ahora = Date.now()
    if (
      !Number.isFinite(cerradoEn) ||
      cerradoEn > ahora ||
      ahora - cerradoEn > PLAZO_REAPERTURA_MS
    ) {
      throw new ServiceError(
        409,
        'REOPEN_PERIOD_EXPIRED',
        `El plazo de reapertura de ${DIAS_PLAZO_REAPERTURA} días ya venció.`,
      )
    }

    await ticketsRepository.reabrir({
      ticketId: ticket.id,
      eventoId: await siguienteId(db, 'historial', 'his'),
      autorId: usuario.id,
      motivo,
      creadoEn: new Date(ahora),
    }, db)
  })

  return detallePropio(referencia, usuario.id)
}
