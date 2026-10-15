const express = require('express');
const router = express.Router();

const settingsRoutes = require('./settings.routes');
const membersRoutes = require('./members.routes');
const transactionsRoutes = require('./transactions.routes');
const reportsRoutes = require('./reports.routes');

router.use('/settings', settingsRoutes);
router.use('/members', membersRoutes);
router.use('/transactions', transactionsRoutes);
router.use('/reports', reportsRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Backend Kas OSIS API berjalan dengan baik',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
