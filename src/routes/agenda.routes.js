const express = require('express');
const router = express.Router();
const agendaController = require('../controllers/agenda.controller');

// CRUD Agenda
router.get('/', agendaController.getAllAgendas);
router.get('/:id', agendaController.getAgendaById);
router.post('/', agendaController.createAgenda);
router.delete('/:id', agendaController.deleteAgenda);

// Aksi Pembayaran Peserta
router.post('/:id/pay', agendaController.payParticipant);
router.post('/:id/cancel', agendaController.cancelPayment);
router.post('/:id/bulk-pay', agendaController.bulkPayClass);

module.exports = router;
