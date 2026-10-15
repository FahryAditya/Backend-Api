const mongoose = require('mongoose');

const paymentOrderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member',
      required: true,
    },
    memberName: {
      type: String,
      required: true,
      trim: true,
    },
    memberRole: {
      type: String,
      default: '',
    },
    allocatedWeeks: {
      type: [String],
      required: true,
      default: [],
    },
    period: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{2}$/, 'Format periode kas harus YYYY-MM'],
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    adminFee: {
      type: Number,
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    paymentType: {
      type: String,
      enum: ['qris', 'dana', 'bank_transfer'],
      default: 'qris',
    },
    qrCodeUrl: {
      type: String,
      default: null,
    },
    qrString: {
      type: String,
      default: null,
    },
    deeplinkUrl: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'expired', 'failed', 'cancelled'],
      default: 'pending',
    },
    transactionId: {
      type: String,
      default: null,
    },
    paymentGatewayResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    paidAt: {
      type: Date,
      default: null,
    },
    expiredAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

paymentOrderSchema.index({ orderId: 1 });
paymentOrderSchema.index({ memberId: 1, status: 1 });

module.exports = mongoose.model('PaymentOrder', paymentOrderSchema);
