import { fecha, insertarFilas } from './insertarFilas.js'

// Carga los tickets de ejemplo del seed compartido del frontend.
export async function cargarTickets(conexion, seed) {
  await insertarFilas(
    conexion,
    'tickets',
    [
      'id', 'codigo', 'usuario_id', 'categoria_id', 'subcategoria_id', 'ambiente_id', 'asunto', 'descripcion',
      'prioridad', 'tiempo_esperado_horas', 'asignado_a', 'estado', 'creado_en', 'cerrado_en',
    ],
    seed.tickets.map((ticket) => [
      ticket.id, ticket.codigo, ticket.usuarioId, ticket.categoriaId ?? null, ticket.subcategoriaId ?? null,
      ticket.ambienteId ?? null, ticket.asunto ?? null, ticket.descripcion ?? null, ticket.prioridad ?? null,
      ticket.tiempoEsperadoHoras ?? null, ticket.asignadoA, ticket.estado, fecha(ticket.creadoEn), fecha(ticket.cerradoEn),
    ]),
  )
}
