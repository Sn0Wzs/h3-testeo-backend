import { pool } from '../db/pool.js'

// Consultas MySQL del registro, detalle, bitácora e historial de HU-3.
export const ticketsRepository = {
  async insertar(ticket, db = pool) {
    await db.query(
      `INSERT INTO tickets (
        id, codigo, usuario_id, categoria_id, subcategoria_id, ambiente_id, asunto, descripcion,
        prioridad, tiempo_esperado_horas, asignado_a, estado, creado_en, cerrado_en
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        ticket.id, ticket.codigo, ticket.usuarioId, ticket.categoriaId, ticket.subcategoriaId, ticket.ambienteId,
        ticket.asunto, ticket.descripcion, ticket.prioridad, ticket.tiempoEsperadoHoras, null, ticket.estado,
        ticket.creadoEn, null,
      ],
    )
  },

  async insertarEntradaInicial({ id, ticketId, usuarioId, mensaje, creadoEn }, db = pool) {
    await db.query(
      `INSERT INTO bitacora (id, ticket_id, autor_id, tipo, mensaje, creado_en)
       VALUES (?, ?, ?, 'publico', ?, ?)`,
      [id, ticketId, usuarioId, mensaje, creadoEn],
    )
  },

  async insertarEventoInicial({ id, ticketId, usuarioId, creadoEn }, db = pool) {
    await db.query(
      `INSERT INTO historial (id, ticket_id, tipo, estado, asignado_a, autor_id, creado_en)
       VALUES (?, ?, 'estado', 'abierto', NULL, ?, ?)`,
      [id, ticketId, usuarioId, creadoEn],
    )
  },

  async buscarDetallePropio(referencia, usuarioId, db = pool, { bloquear = false } = {}) {
    const [filas] = await db.query(
      `SELECT t.id, t.codigo, t.usuario_id AS usuarioId, t.categoria_id AS categoriaId,
        t.subcategoria_id AS subcategoriaId, t.ambiente_id AS ambienteId, t.asunto, t.descripcion,
        t.prioridad,
        COALESCE(t.tiempo_esperado_horas, s.tiempo_esperado_horas, c.tiempo_esperado_horas) AS tiempoEsperadoHoras,
        t.asignado_a AS asignadoA,
        t.estado, t.creado_en AS creadoEn, t.cerrado_en AS cerradoEn,
        c.nombre AS categoriaNombre, s.nombre AS subcategoriaNombre,
        a.codigo AS ambienteCodigo, a.nombre AS ambienteNombre,
        tecnico.id AS tecnicoId, tecnico.nombres AS tecnicoNombres, tecnico.apellidos AS tecnicoApellidos,
        tecnico.rol AS tecnicoRol
       FROM tickets t
       LEFT JOIN categorias c ON c.id = t.categoria_id
       LEFT JOIN subcategorias s ON s.id = t.subcategoria_id
       LEFT JOIN ambientes a ON a.id = t.ambiente_id
       LEFT JOIN usuarios tecnico ON tecnico.id = t.asignado_a
       WHERE (t.codigo = ? OR t.id = ?) AND t.usuario_id = ?
       LIMIT 1${bloquear ? ' FOR UPDATE' : ''}`,
      [referencia, referencia, usuarioId],
    )
    const fila = filas[0]
    if (!fila) return null
    return {
      id: fila.id,
      codigo: fila.codigo,
      usuarioId: fila.usuarioId,
      categoriaId: fila.categoriaId,
      subcategoriaId: fila.subcategoriaId,
      ambienteId: fila.ambienteId,
      asunto: fila.asunto,
      descripcion: fila.descripcion,
      prioridad: fila.prioridad,
      tiempoEsperadoHoras: fila.tiempoEsperadoHoras == null ? null : Number(fila.tiempoEsperadoHoras),
      asignadoA: fila.asignadoA,
      estado: fila.estado,
      creadoEn: fila.creadoEn,
      cerradoEn: fila.cerradoEn,
      categoria: fila.categoriaId ? { id: fila.categoriaId, nombre: fila.categoriaNombre } : null,
      subcategoria: fila.subcategoriaId ? { id: fila.subcategoriaId, nombre: fila.subcategoriaNombre } : null,
      ambiente: fila.ambienteId
        ? { id: fila.ambienteId, codigo: fila.ambienteCodigo, nombre: fila.ambienteNombre }
        : null,
      tecnico: fila.tecnicoId
        ? { id: fila.tecnicoId, nombres: fila.tecnicoNombres, apellidos: fila.tecnicoApellidos, rol: fila.tecnicoRol }
        : null,
    }
  },

  async listarEntradasPublicas(ticketId, db = pool) {
    const [filas] = await db.query(
      `SELECT b.id, b.tipo, b.mensaje, b.creado_en AS creadoEn,
        u.id AS autorId, u.nombres AS autorNombres, u.apellidos AS autorApellidos, u.rol AS autorRol
       FROM bitacora b JOIN usuarios u ON u.id = b.autor_id
       WHERE b.ticket_id = ? AND b.tipo = 'publico'
       ORDER BY b.creado_en, b.id`,
      [ticketId],
    )
    return filas.map((fila) => ({
      id: fila.id,
      tipo: fila.tipo,
      mensaje: fila.mensaje,
      creadoEn: fila.creadoEn,
      autor: { id: fila.autorId, nombres: fila.autorNombres, apellidos: fila.autorApellidos, rol: fila.autorRol },
    }))
  },

  async listarEventos(ticketId, db = pool) {
    const [filas] = await db.query(
      `SELECT h.id, h.tipo, h.estado, h.asignado_a AS asignadoA, h.motivo, h.retorno_estimado AS retornoEstimado,
        h.solucion, h.creado_en AS creadoEn,
        autor.id AS autorId, autor.nombres AS autorNombres, autor.apellidos AS autorApellidos, autor.rol AS autorRol,
        tecnico.id AS tecnicoId, tecnico.nombres AS tecnicoNombres, tecnico.apellidos AS tecnicoApellidos,
        tecnico.rol AS tecnicoRol
       FROM historial h
       JOIN usuarios autor ON autor.id = h.autor_id
       LEFT JOIN usuarios tecnico ON tecnico.id = h.asignado_a
       WHERE h.ticket_id = ?
       ORDER BY h.creado_en, h.id`,
      [ticketId],
    )
    return filas.map((fila) => ({
      id: fila.id,
      tipo: fila.tipo,
      estado: fila.estado,
      asignadoA: fila.asignadoA,
      motivo: fila.motivo,
      retornoEstimado: fila.retornoEstimado,
      solucion: fila.solucion,
      creadoEn: fila.creadoEn,
      autor: { id: fila.autorId, nombres: fila.autorNombres, apellidos: fila.autorApellidos, rol: fila.autorRol },
      tecnico: fila.tecnicoId
        ? { id: fila.tecnicoId, nombres: fila.tecnicoNombres, apellidos: fila.tecnicoApellidos, rol: fila.tecnicoRol }
        : null,
    }))
  },

  async insertarEntrada({ id, ticketId, autorId, mensaje, creadoEn }, db = pool) {
    await db.query(
      `INSERT INTO bitacora (id, ticket_id, autor_id, tipo, mensaje, creado_en)
       VALUES (?, ?, ?, 'publico', ?, ?)`,
      [id, ticketId, autorId, mensaje, creadoEn],
    )
  },

  async reabrir({ ticketId, eventoId, autorId, motivo, creadoEn }, db = pool) {
    await db.query(
      `UPDATE tickets SET estado = 'reabierto', asignado_a = NULL, cerrado_en = NULL WHERE id = ?`,
      [ticketId],
    )
    await db.query(
      `INSERT INTO historial (id, ticket_id, tipo, estado, asignado_a, autor_id, motivo, creado_en)
       VALUES (?, ?, 'estado', 'reabierto', NULL, ?, ?, ?)`,
      [eventoId, ticketId, autorId, motivo, creadoEn],
    )
  },
}
