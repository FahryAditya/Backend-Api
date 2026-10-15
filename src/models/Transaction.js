const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: {
        values: ['in', 'out'],
        message: 'Tipe transaksi harus "in" (masuk) atau "out" (keluar)',
      },
      required: [true, 'Tipe transaksi wajib diisi'],
    },
    title: {
      type: String,
      required: [true, 'Keterangan transaksi wajib diisi'],
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Kategori transaksi wajib diisi'],
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, 'Nominal transaksi wajib diisi'],
      min: [1, 'Nominal transaksi harus lebih dari 0'],
    },
    date: {
      type: String,
      required: [true, 'Tanggal transaksi wajib diisi (format: YYYY-MM-DD)'],
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD'],
    },
    time: {
      type: String,
      default: () => {
        const d = new Date();
        return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      },
    },
    recorder: {
      type: String,
      required: [true, 'Nama pencatat transaksi wajib diisi'],
      trim: true,
    },
    iconBrand: {
      type: String,
      enum: ['apple', 'adobe', 'amazon', 'kas', 'general'],
      default: 'general',
    },
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member',
      default: null,
    },
    period: {
      type: String,
      default: null,
    },
    allocatedWeeks: {
      type: [String],
      default: [],
    },
    weeksCount: {
      type: Number,
      default: 1,
    },
    note: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/**
 * ATURAN WAJIB (Compound Partial Unique Index):
 * Mencegah duplikasi pembayaran kas untuk anggota dan periode yang sama.
 * Index ini hanya aktif jika memberId ada dan type === 'in'.
 */
transactionSchema.index(
  { memberId: 1, period: 1, type: 1 },
  {
    unique: true,
    partialFilterExpression: {
      memberId: { $exists: true, $ne: null },
      type: 'in',
    },
  }
);

module.exports = mongoose.model('Transaction', transactionSchema);
