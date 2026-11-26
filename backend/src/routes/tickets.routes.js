import { Router } from 'express'
import * as ticketsController from '../controllers/tickets.controller.js'
import { autenticar, permitirRoles } from '../middlewares/autenticacion.js'

const router = Router()

// HU-3 Registro y seguimiento de los tickets propios (p19, p21 y p22).
router.post('/', autenticar, permitirRoles('usuario'), ticketsController.crear)
router.get('/:referencia', autenticar, permitirRoles('usuario'), ticketsController.detalle)
router.post('/:referencia/informacion', autenticar, permitirRoles('usuario'), ticketsController.agregarInformacion)
router.post('/:referencia/reapertura', autenticar, permitirRoles('usuario'), ticketsController.reabrir)

export default router
