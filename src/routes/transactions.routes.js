const express = require('express');
const router = express.Router();
const transactionsController = require('../controllers/transactions.controller');

// Transaksi umum
router.get('/', transactionsController.getTransactions);
router.post('/', transactionsController.createTransaction);
router.put('/:id', transactionsController.updateTransaction);
router.delete('/', transactionsController.deleteAllTransactions);
router.delete('/:id', transactionsController.deleteTransaction);

// Pembayaran kas anggota (single & bulk)
router.post('/kas-payment', transactionsController.createKasPayment);
router.post('/kas-payment/bulk', transactionsController.createBulkKasPayment);

module.exports = router;
