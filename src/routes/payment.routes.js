const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');

// 1. Buat order pembayaran QRIS baru
router.post('/create-order', paymentController.createOrder);

// 2. Cek status pembayaran real-time berdasarkan orderId
router.get('/status/:orderId', paymentController.getOrderStatus);

// 3. Webhook callback dari Payment Gateway (Midtrans)
router.post('/webhook', paymentController.handleWebhook);
router.get('/webhook', (req, res) => res.status(200).json({ success: true, message: 'Midtrans Webhook Endpoint Active' }));

// 4. Simulasi bayar untuk testing / sandbox
router.post('/simulate/:orderId', paymentController.simulatePayment);

module.exports = router;
