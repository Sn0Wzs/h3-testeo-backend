import { beforeEach, describe, expect, it } from 'vitest'
import { CAMILA, JULIO, api, conToken, ingresar, usarBaseDePrueba } from './ayuda.js'
import { pool } from '../src/db/pool.js'

usarBaseDePrueba()

let token
beforeEach(async () => {
  token = await ingresar(CAMILA)
})

const crear = (datos, sesion = token) => {
  const peticion = api().post('/api/tickets').send(datos)
  return sesion ? peticion.set(conToken(sesion)) : peticion
}

const ticketValido = {
  categoriaId: 'cat-01',
  subcategoriaId: 'sub-01',
  ambienteId: 'amb-02',
  asunto: 'Proyector no enciende en aula A-201',
  descripcion: 'El equipo enciende, pero no muestra imagen desde el inicio de la clase.',
}

describe('POST /api/tickets (HU-3)', () => {
  it('requiere sesión y el rol usuario', async () => {
    expect((await crear(ticketValido, null)).status).toBe(401)

    const tokenTecnico = await ingresar(JULIO)
    expect((await crear(ticketValido, tokenTecnico)).status).toBe(403)
  })

  it('valida campos requeridos y límites de longitud', async () => {
    const incompleto = await crear({})
    expect(incompleto.status).toBe(400)
    expect(incompleto.body.fieldErrors).toMatchObject({
      categoriaId: expect.any(String),
      subcategoriaId: expect.any(String),
      ambienteId: expect.any(String),
      asunto: expect.any(String),
      descripcion: expect.any(String),
    })

    const demasiadoLargo = await crear({ ...ticketValido, asunto: 'a'.repeat(121) })
    expect(demasiadoLargo.status).toBe(400)
    expect(demasiadoLargo.body.fieldErrors).toHaveProperty('asunto')
  })

  it('valida categoría, subcategoría activa y ambiente del catálogo', async () => {
    const categoriaInvalida = await crear({ ...ticketValido, categoriaId: 'cat-99' })
    expect(categoriaInvalida.body.fieldErrors).toHaveProperty('categoriaId')

    const subcategoriaDeOtraCategoria = await crear({ ...ticketValido, subcategoriaId: 'sub-05' })
    expect(subcategoriaDeOtraCategoria.body.fieldErrors).toHaveProperty('subcategoriaId')

    const subcategoriaInactiva = await crear({ ...ticketValido, categoriaId: 'cat-03', subcategoriaId: 'sub-10' })
    expect(subcategoriaInactiva.body.fieldErrors).toHaveProperty('subcategoriaId')

    const ambienteInvalido = await crear({ ...ticketValido, ambienteId: 'amb-99' })
    expect(ambienteInvalido.body.fieldErrors).toHaveProperty('ambienteId')
  })

  it('crea el ticket con identidad de sesión y prioridad sugerida por catálogo', async () => {
    const respuesta = await crear({
      ...ticketValido,
      usuarioId: 'usr-008',
      prioridad: 'baja',
      asignadoA: 'usr-002',
    })

    expect(respuesta.status).toBe(201)
    expect(respuesta.body).toMatchObject({
      id: expect.stringMatching(/^tck-\d{5}$/),
      codigo: expect.stringMatching(/^TCK-\d{4}-\d{5}$/),
      usuarioId: 'usr-001',
      categoriaId: 'cat-01',
      subcategoriaId: 'sub-01',
      ambienteId: 'amb-02',
      asunto: ticketValido.asunto,
      descripcion: ticketValido.descripcion,
      prioridad: 'critica',
      tiempoEsperadoHoras: 2,
      asignadoA: null,
      estado: 'abierto',
      cerradoEn: null,
    })
    expect(respuesta.body.creadoEn).toEqual(expect.any(String))

    const [filas] = await pool.query('SELECT usuario_id, prioridad, asignado_a FROM tickets WHERE id = ?', [
      respuesta.body.id,
    ])
    expect(filas[0]).toEqual({ usuario_id: 'usr-001', prioridad: 'critica', asignado_a: null })
    const [historial] = await pool.query('SELECT estado, autor_id FROM historial WHERE ticket_id = ?', [respuesta.body.id])
    expect(historial).toEqual([{ estado: 'abierto', autor_id: 'usr-001' }])
    const [bitacora] = await pool.query('SELECT tipo, mensaje FROM bitacora WHERE ticket_id = ?', [respuesta.body.id])
    expect(bitacora).toEqual([{ tipo: 'publico', mensaje: ticketValido.descripcion }])
  })

  it('permite continuar aunque exista otro ticket abierto para el mismo ambiente y categoría', async () => {
    const respuesta = await crear({
      ...ticketValido,
      categoriaId: 'cat-04',
      subcategoriaId: 'sub-11',
      ambienteId: 'amb-06',
    })

    expect(respuesta.status).toBe(201)
  })
})

describe('GET /api/tickets (HU-3)', () => {
  it('requiere sesión y el rol usuario', async () => {
    expect((await api().get('/api/tickets')).status).toBe(401)

    const tokenTecnico = await ingresar(JULIO)
    expect((await api().get('/api/tickets').set(conToken(tokenTecnico))).status).toBe(403)
  })

  it('lista los tickets propios con sus datos de categoría y ambiente', async () => {
    const respuesta = await api().get('/api/tickets').set(conToken(token))

    expect(respuesta.status).toBe(200)
    expect(respuesta.body.length).toBeGreaterThan(0)
    expect(respuesta.body.every((ticket) => ticket.usuarioId === 'usr-001')).toBe(true)
    expect(respuesta.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'tck-00103',
          codigo: 'TCK-2026-00103',
          categoriaNombre: expect.any(String),
          subcategoriaNombre: expect.any(String),
          ambienteCodigo: expect.any(String),
        }),
      ]),
    )
    expect(respuesta.body.some((ticket) => ticket.id === 'tck-00146')).toBe(false)
  })
})

describe('detalle e información del ticket (HU-3)', () => {
  it('devuelve el detalle del ticket propio y oculta entradas internas', async () => {
    const respuesta = await api().get('/api/tickets/TCK-2026-00103').set(conToken(token))

    expect(respuesta.status).toBe(200)
    expect(respuesta.body).toMatchObject({
      ticket: {
        id: 'tck-00103',
        codigo: 'TCK-2026-00103',
        usuarioId: 'usr-001',
        categoria: { id: 'cat-01', nombre: 'Audiovisuales' },
        ambiente: { id: 'amb-02', codigo: 'A-305' },
      },
      permisos: { comentar: false },
    })
    expect(respuesta.body.bitacora.length).toBeGreaterThan(0)
    expect(respuesta.body.bitacora.every((entrada) => entrada.tipo === 'publico')).toBe(true)
    expect(JSON.stringify(respuesta.body)).not.toContain('guía izquierda está doblada')
  })

  it('no revela el detalle de tickets de otra persona', async () => {
    const respuesta = await api().get('/api/tickets/TCK-2026-00146').set(conToken(token))

    expect(respuesta.status).toBe(404)
    expect(respuesta.body.code).toBe('TICKET_NOT_FOUND')
  })

  it('agrega información pública a un ticket propio todavía abierto', async () => {
    const respuesta = await api()
      .post('/api/tickets/TCK-2026-00147/informacion')
      .set(conToken(token))
      .send({ mensaje: 'La falla continúa después de reiniciar el equipo.' })

    expect(respuesta.status).toBe(200)
    expect(respuesta.body.bitacora.at(-1)).toMatchObject({
      tipo: 'publico',
      mensaje: 'La falla continúa después de reiniciar el equipo.',
      autor: { id: 'usr-001', rol: 'usuario' },
    })
  })

  describe('POST /api/tickets/:referencia/reapertura (HU-3)', () => {
    const codigoCerradoPropio = 'TCK-2026-00103'

    it('reabre dentro de 7 días, limpia la asignación y registra el motivo en el historial', async () => {
      const cerradoEn = new Date(Date.now() - 24 * 60 * 60 * 1000)
      await pool.query('UPDATE tickets SET cerrado_en = ? WHERE codigo = ?', [cerradoEn, codigoCerradoPropio])

      const respuesta = await api()
        .post(`/api/tickets/${codigoCerradoPropio}/reapertura`)
        .set(conToken(token))
        .send({ motivo: 'La falla volvió después de la reparación.' })

      expect(respuesta.status).toBe(200)
      expect(respuesta.body.ticket).toMatchObject({
        id: 'tck-00103',
        estado: 'reabierto',
        asignadoA: null,
        cerradoEn: null,
      })
      expect(respuesta.body.eventos.at(-1)).toMatchObject({
        tipo: 'estado',
        estado: 'reabierto',
        motivo: 'La falla volvió después de la reparación.',
        autor: { id: 'usr-001', rol: 'usuario' },
      })

      const [filas] = await pool.query('SELECT estado, asignado_a, cerrado_en FROM tickets WHERE id = ?', ['tck-00103'])
      expect(filas[0]).toEqual({ estado: 'reabierto', asignado_a: null, cerrado_en: null })
    })

    it('exige un motivo y rechaza tickets que no están cerrados', async () => {
      const sinMotivo = await api()
        .post(`/api/tickets/${codigoCerradoPropio}/reapertura`)
        .set(conToken(token))
        .send({ motivo: ' ' })
      expect(sinMotivo.status).toBe(400)
      expect(sinMotivo.body.fieldErrors).toHaveProperty('motivo')

      const abierto = await api()
        .post('/api/tickets/TCK-2026-00147/reapertura')
        .set(conToken(token))
        .send({ motivo: 'La falla volvió.' })
      expect(abierto.status).toBe(409)
      expect(abierto.body.code).toBe('TICKET_NOT_CLOSED')
    })

    it('rechaza tickets fuera del plazo y no revela tickets de otra persona', async () => {
      const cerradoEn = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)
      await pool.query('UPDATE tickets SET cerrado_en = ? WHERE codigo = ?', [cerradoEn, codigoCerradoPropio])

      const vencido = await api()
        .post(`/api/tickets/${codigoCerradoPropio}/reapertura`)
        .set(conToken(token))
        .send({ motivo: 'La falla volvió.' })
      expect(vencido.status).toBe(409)
      expect(vencido.body.code).toBe('REOPEN_PERIOD_EXPIRED')

      const ajeno = await api()
        .post('/api/tickets/TCK-2026-00146/reapertura')
        .set(conToken(token))
        .send({ motivo: 'La falla volvió.' })
      expect(ajeno.status).toBe(404)
      expect(ajeno.body.code).toBe('TICKET_NOT_FOUND')
    })
  })

  it('valida el mensaje y rechaza comentarios para un ticket cerrado', async () => {
    const vacio = await api()
      .post('/api/tickets/TCK-2026-00147/informacion')
      .set(conToken(token))
      .send({ mensaje: '  ' })
    expect(vacio.status).toBe(400)
    expect(vacio.body.fieldErrors).toHaveProperty('mensaje')

    const cerrado = await api()
      .post('/api/tickets/TCK-2026-00103/informacion')
      .set(conToken(token))
      .send({ mensaje: 'La falla volvió.' })
    expect(cerrado.status).toBe(409)
    expect(cerrado.body.code).toBe('TICKET_CLOSED')
  })
})
