const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: 'main_config',
    },
    orgName: {
      type: String,
      default: 'OSIS SKARLAKES',
      trim: true,
    },
    schoolName: {
      type: String,
      default: 'SMK Airlangga & SMK Kesehatan Airlangga',
      trim: true,
    },
    treasurerName: {
      type: String,
      default: 'Bendahara OSIS',
      trim: true,
    },
    initialBalance: {
      type: Number,
      default: 0,
    },
    kasFee: {
      type: Number,
      default: 2000,
    },
    kasFeeEffectiveDate: {
      type: String,
      default: '2026-10-01',
    },
    feeHistory: [
      {
        fee: { type: Number, required: true },
        effectiveDate: { type: String, required: true },
      },
    ],
    holidays: [
      {
        date: { type: String, required: true },
        reason: { type: String, default: '' },
      },
    ],
    activePeriod: {
      type: String,
      default: '2026-10',
    },
    currencyStyle: {
      type: String,
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
