const mongoose = require('mongoose');

// Fungsi pembantu sanitasi Title Case
const toTitleCase = (str) => {
  if (!str) return '';
  return str
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const memberSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Nama anggota wajib diisi'],
      trim: true,
    },
    nickname: {
      type: String,
      default: '',
      trim: true,
    },
    role: {
      type: String,
      default: 'Anggota OSIS',
      trim: true,
    },
    className: {
      type: String,
      default: '',
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Pre-save hook: Sanitasi nama otomatis menjadi Title Case
memberSchema.pre('save', function (next) {
  if (this.isModified('name')) {
    this.name = toTitleCase(this.name);
  }
  next();
});

module.exports = mongoose.model('Member', memberSchema);
