const mongoose = require('mongoose');
const dns = require('dns');

// Gunakan Google DNS & Cloudflare DNS untuk memastikan querySrv MongoDB Atlas berjalan lancar di Windows & Cloud
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (_) {}

/**
 * Global cache untuk koneksi MongoDB di lingkungan Serverless (Vercel)
 * Mencegah exhaustion koneksi akibat instansiasi lambda baru
 */
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
  const mongoURI =
    process.env.MONGODB_URI ||
    process.env.MONGO_URI ||
    'mongodb+srv://Vercel-Admin-database-uangkas:S7EclAxTmqXy7QeK@database-uangkas.fi39tka.mongodb.net/kas_osis?retryWrites=true&w=majority';

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: true,
      serverSelectionTimeoutMS: 8000,
    };

    cached.promise = mongoose.connect(mongoURI, opts).then((m) => {
      console.log(`[MongoDB] Terhubung ke database: ${m.connection.name}`);
      return m;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    console.error(`[MongoDB Error] Gagal terhubung ke database: ${error.message}`);
    throw error;
  }

  return cached.conn;
};

module.exports = connectDB;
