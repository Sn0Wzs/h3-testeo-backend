import * as ticketsService from '../services/tickets.service.js'

// Registro del reporte y operaciones de seguimiento solicitadas por el usuario.
export async function crear(req, res) {
  res.status(201).json(await ticketsService.crearTicket(req.usuario, req.body))
}

export async function detalle(req, res) {
  res.json(await ticketsService.obtenerDetalleTicket(req.usuario, req.params.referencia))
}

export async function agregarInformacion(req, res) {
  res.json(await ticketsService.agregarInformacion(req.usuario, req.params.referencia, req.body))
}

export async function reabrir(req, res) {
  res.json(await ticketsService.reabrirTicket(req.usuario, req.params.referencia, req.body))
}
