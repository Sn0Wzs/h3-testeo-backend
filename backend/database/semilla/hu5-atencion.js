import { fecha, insertarFilas } from './insertarFilas.js'

export async function cargarAtencion(conexion, seed) {
  await insertarFilas(
    conexion,
    'bitacora',
    ['id', 'ticket_id', 'autor_id', 'tipo', 'mensaje', 'creado_en'],
    seed.bitacora.map(({ id, ticketId, autorId, tipo, mensaje, creadoEn }) => [
      id, ticketId, autorId, tipo, mensaje, fecha(creadoEn),
    ]),
  )

  await insertarFilas(
    conexion,
    'historial',
    ['id', 'ticket_id', 'tipo', 'estado', 'asignado_a', 'autor_id', 'motivo', 'retorno_estimado', 'solucion', 'creado_en'],
    seed.historial.map(({ id, ticketId, tipo, estado, asignadoA, autorId, motivo, retornoEstimado, solucion, creadoEn }) => [
      id, ticketId, tipo, estado, asignadoA, autorId, motivo,
      retornoEstimado ? fecha(retornoEstimado) : null, solucion, fecha(creadoEn),
    ]),
  )
}
