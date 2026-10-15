/**
 * Global Error Handler Middleware
 * Menjamin format respon JSON error yang konsisten di seluruh endpoint
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Terjadi kesalahan pada server';

  // Penanganan error Mongoose Duplicate Key (E11000)
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue || {}).join(', ');
    message = `Duplikasi data: Nilai untuk ${field || 'entri'} sudah terdaftar sebelumnya.`;
  }

  // Penanganan Mongoose ValidationError
  if (err.name === 'ValidationError') {
    statusCode = 400;
    const details = Object.values(err.errors).map((e) => e.message);
    message = `Validasi gagal: ${details.join('; ')}`;
  }

  // Penanganan CastError (Invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Format ID tidak valid: ${err.value}`;
  }

  if (process.env.NODE_ENV !== 'production' && statusCode === 500) {
    console.error('[Error Trace]', err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
};

module.exports = errorHandler;
