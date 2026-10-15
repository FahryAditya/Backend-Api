// Resolusi modul lokal jika dijalankan di Windows virtual stream Google Drive
if (!process.env.NODE_PATH && !process.env.VERCEL) {
  try {
    process.env.NODE_PATH = 'C:\\Users\\ACER\\.kas_backend_node_modules\\node_modules';
    require('module').Module._initPaths();
  } catch (_) {}
}

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./config/db');
const errorHandler = require('./middlewares/errorHandler');
const apiRoutes = require('./routes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware Database Check untuk Serverless Vercel
app.use(async (req, res, next) => {
  await connectDB();
  next();
});

// Middlewares
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  app.use(morgan('dev'));
}

// Root Status
app.get('/', (req, res) => {
  res.status(200).json({
    app: 'Kas OSIS REST API',
    status: 'Active',
    platform: process.env.VERCEL ? 'Vercel Serverless' : 'Node.js Express Server',
    version: '1.0.0',
    documentation: '/api/health',
  });
});

// API Routes
app.use('/api', apiRoutes);

// Fallback 404 Route
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Endpoint tidak ditemukan: ${req.method} ${req.originalUrl}`,
  });
});

// Global Error Handler
app.use(errorHandler);

// Start Server hanya jika tidak berjalan di lingkungan Vercel Serverless
if (!process.env.VERCEL) {
  const server = app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 Server Kas OSIS berjalan pada port: ${PORT}`);
    console.log(`📡 URL API: http://localhost:${PORT}/api`);
    console.log(`🩺 Health check: http://localhost:${PORT}/api/health`);
    console.log(`====================================================`);
  });

  const handleShutdown = (signal) => {
    console.log(`\n[Server] Menerima sinyal ${signal}. Menutup server dengan aman...`);
    server.close(() => {
      console.log('[Server] Koneksi HTTP ditutup.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
}

module.exports = app;
