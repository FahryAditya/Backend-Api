const mongoose = require('mongoose');

const agendaParticipantSchema = new mongoose.Schema(
  {
    memberId: {
      type: String,
      required: true,
    },
    memberName: {
      type: String,
      required: true,
      trim: true,
    },
    className: {
      type: String,
      default: '',
    },
    grade: {
      type: Number,
      enum: [10, 11],
      default: 10,
    },
    isPaid: {
      type: Boolean,
      default: false,
    },
    paidAmount: {
      type: Number,
      default: 0,
    },
    paidAt: {
      type: String,
      default: null,
    },
    transactionId: {
      type: String,
      default: null,
    },
    walletType: {
      type: String,
      enum: ['cash', 'digital'],
      default: 'cash',
    },
    recorder: {
      type: String,
      default: 'Bendahara',
    },
    note: {
      type: String,
      default: '',
    },
  },
  { _id: false }
);

const agendaSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Nama agenda kegiatan wajib diisi'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    feeAmount: {
      type: Number,
      required: [true, 'Nominal iuran wajib diisi'],
      min: [1, 'Nominal iuran harus lebih dari 0'],
    },
    targetAudience: {
      type: String,
      enum: ['class10', 'class11', 'allClasses'],
      default: 'allClasses',
    },
    mergeWithMainKas: {
      type: Boolean,
      default: false,
    },
    createdAtDate: {
      type: String,
      default: () => new Date().toISOString().split('T')[0],
    },
    dueDate: {
      type: String,
      default: null,
    },
    participants: {
      type: [agendaParticipantSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

module.exports = mongoose.model('Agenda', agendaSchema);
