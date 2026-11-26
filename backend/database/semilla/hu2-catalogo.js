import { insertarFilas } from './insertarFilas.js'

// HU-2 (mínimo): solo las columnas que lee HU-1
export async function cargarCatalogo(conexion, seed) {
  await insertarFilas(
    conexion,
    'categorias',
    ['id', 'nombre', 'activa', 'prioridad_por_defecto', 'tiempo_esperado_horas'],
    seed.categorias.map(({ id, nombre, activa, prioridadPorDefecto, tiempoEsperadoHoras }) => [
      id, nombre, activa, prioridadPorDefecto, tiempoEsperadoHoras,
    ]),
  )
  await insertarFilas(
    conexion,
    'subcategorias',
    ['id', 'categoria_id', 'nombre', 'descripcion', 'activa', 'prioridad_por_defecto', 'tiempo_esperado_horas'],
    seed.subcategorias.map(({ id, categoriaId, nombre, descripcion, activa, prioridadPorDefecto, tiempoEsperadoHoras }) => [
      id, categoriaId, nombre, descripcion, activa, prioridadPorDefecto, tiempoEsperadoHoras,
    ]),
  )
  await insertarFilas(
    conexion,
    'ambientes',
    ['id', 'codigo', 'nombre'],
    seed.ambientes.map(({ id, codigo, nombre }) => [id, codigo, nombre]),
  )
}
