const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: 'main_config',
    },
    orgName: {
      type: String,
      default: 'OSIS SMA Negeri 1',
      trim: true,
    },
    treasurerName: {
      type: String,
      default: 'Siyam Ahmed',
      trim: true,
    },
    initialBalance: {
      type: Number,
      default: 0,
      min: [0, 'Saldo awal tidak boleh bernilai negatif'],
    },
    kasFee: {
      type: Number,
      default: 20000,
      min: [1000, 'Iuran kas minimal Rp 1.000'],
    },
    activePeriod: {
      type: String,
      default: '2026-10',
      match: [/^\d{4}-\d{2}$/, 'Format periode aktif harus YYYY-MM (contoh: 2026-10)'],
    },
    currencyStyle: {
      type: String,
      enum: ['idr', 'mockup'],
      default: 'idr',
    },
    categoriesIn: {
      type: [String],
      default: [
        'Kas Anggota',
        'Dana Sekolah',
        'Sponsorship',
        'Donasi Alumni',
        'Bazar OSIS',
      ],
    },
    categoriesOut: {
      type: [String],
      default: [
        'Perlengkapan OSIS',
        'Konsumsi Rapat',
        'Administrasi & Cetak',
        'Dokumentasi & Publikasi',
        'Transportasi',
      ],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

module.exports = mongoose.model('Setting', settingSchema);
