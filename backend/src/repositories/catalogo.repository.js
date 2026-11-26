import { pool } from '../db/pool.js'

// Listas que usan los formularios de HU-1. Unidades y vínculos son de HU-1;
// categorías y ambientes son de HU-2 y aquí solo se leen.
export const catalogoRepository = {
  async listarUnidades() {
    const [filas] = await pool.query('SELECT nombre FROM unidades ORDER BY id')
    return filas.map((fila) => fila.nombre)
  },

  async listarVinculos() {
    const [filas] = await pool.query('SELECT nombre FROM vinculos ORDER BY id')
    return filas.map((fila) => fila.nombre)
  },

  async listarCategoriasActivas() {
    const [filas] = await pool.query('SELECT id, nombre FROM categorias WHERE activa = TRUE ORDER BY id')
    return filas
  },

  async listarAmbientes() {
    const [filas] = await pool.query('SELECT id, codigo, nombre FROM ambientes ORDER BY codigo')
    return filas
  },

  async buscarCategoriaActiva(id, db = pool) {
    const [filas] = await db.query(
      `SELECT id, nombre, prioridad_por_defecto AS prioridadPorDefecto,
        tiempo_esperado_horas AS tiempoEsperadoHoras
       FROM categorias WHERE id = ? AND activa = TRUE`,
      [id],
    )
    return filas[0] ?? null
  },

  async buscarSubcategoriaActiva(id, categoriaId, db = pool) {
    const [filas] = await db.query(
      `SELECT id, categoria_id AS categoriaId, nombre,
        prioridad_por_defecto AS prioridadPorDefecto,
        tiempo_esperado_horas AS tiempoEsperadoHoras
       FROM subcategorias WHERE id = ? AND categoria_id = ? AND activa = TRUE`,
      [id, categoriaId],
    )
    return filas[0] ?? null
  },

  async buscarAmbiente(id, db = pool) {
    const [filas] = await db.query('SELECT id, codigo, nombre FROM ambientes WHERE id = ?', [id])
    return filas[0] ?? null
  },
}
