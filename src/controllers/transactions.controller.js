const Transaction = require('../models/Transaction');
const Member = require('../models/Member');
const Setting = require('../models/Setting');

// Helper penanggalan
const getTodayDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const getCurrentTime = () => {
  return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
};

/**
 * GET /api/transactions
 * Mengambil daftar transaksi dengan filter tipe, kategori, bulan, dan pencarian teks
 */
exports.getTransactions = async (req, res, next) => {
  try {
    const { type, category, month, search, limit = 100, page = 1 } = req.query;

    const filter = {};

    if (type && ['in', 'out'].includes(type)) {
      filter.type = type;
    }

    if (category && category !== 'all') {
      filter.category = category;
    }

    if (month && /^\d{4}-\d{2}$/.test(month)) {
      filter.date = new RegExp(`^${month}`);
    }

    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { title: new RegExp(q, 'i') },
        { category: new RegExp(q, 'i') },
        { recorder: new RegExp(q, 'i') },
        { note: new RegExp(q, 'i') },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const transactions = await Transaction.find(filter)
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('memberId', 'name role')
      .lean();

    const total = await Transaction.countDocuments(filter);

    res.status(200).json({
      success: true,
      message: 'Berhasil mengambil daftar transaksi',
      total,
      page: Number(page),
      limit: Number(limit),
      data: transactions,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/transactions
 * Menambah pemasukan / pengeluaran umum
 */
exports.createTransaction = async (req, res, next) => {
  try {
    const { type, title, category, amount, date, time, recorder, iconBrand, note } = req.body;

    const setting = await Setting.findById('main_config');
    const defaultRecorder = setting ? setting.treasurerName : 'Bendahara OSIS';

    const transaction = await Transaction.create({
      type,
      title,
      category,
      amount: Number(amount),
      date: date || getTodayDate(),
      time: time || getCurrentTime(),
      recorder: recorder || defaultRecorder,
      iconBrand: iconBrand || 'general',
      note: note || '',
    });

    res.status(201).json({
      success: true,
      message: 'Transaksi berhasil disimpan',
      data: transaction,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/transactions/kas-payment
 * Mencatat pembayaran kas perorangan (single member)
 * Body: { memberId, period, amount, note }
 */
exports.createKasPayment = async (req, res, next) => {
  try {
    const { memberId, period, amount, note } = req.body;

    if (!memberId || !period || !amount) {
      return res.status(400).json({
        success: false,
        message: 'memberId, period (YYYY-MM), dan amount wajib diisi',
      });
    }

    if (Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Nominal pembayaran kas harus lebih besar dari 0',
      });
    }

    // Pastikan member ada dan aktif
    const member = await Member.findOne({ _id: memberId, isActive: true });
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Data anggota tidak ditemukan atau sudah tidak aktif',
      });
    }

    // Compound Check: Cegah dobel pembayaran kas pada periode yang sama
    const existingPayment = await Transaction.findOne({
      memberId,
      period,
      type: 'in',
    });

    if (existingPayment) {
      return res.status(400).json({
        success: false,
        message: `Anggota ${member.name} sudah tercatat lunas pada periode ${period}.`,
      });
    }

    const setting = await Setting.findById('main_config');
    const recorder = setting ? setting.treasurerName : 'Bendahara OSIS';

    const transaction = await Transaction.create({
      type: 'in',
      title: `Kas OSIS - ${member.name} (${period})`,
      category: 'Kas Anggota',
      amount: Number(amount),
      date: getTodayDate(),
      time: getCurrentTime(),
      recorder,
      iconBrand: 'kas',
      memberId: member._id,
      period,
      note: note || '',
    });

    res.status(201).json({
      success: true,
      message: `Pembayaran kas ${member.name} untuk periode ${period} berhasil disimpan`,
      data: transaction,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/transactions/kas-payment/bulk
 * Melunasi semua anggota yang belum bayar pada periode aktif dalam satu kali transaksi massal
 * Body: { period, amount, note }
 */
exports.createBulkKasPayment = async (req, res, next) => {
  try {
    const { period, amount, note } = req.body;

    if (!period || !amount) {
      return res.status(400).json({
        success: false,
        message: 'period (YYYY-MM) dan amount wajib diisi',
      });
    }

    const nominal = Number(amount);
    if (nominal <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Nominal pembayaran massal harus lebih dari 0',
      });
    }

    // Ambil seluruh anggota aktif
    const activeMembers = await Member.find({ isActive: true }).lean();
    if (activeMembers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Belum ada anggota aktif untuk dilakukan pembayaran massal',
      });
    }

    // Ambil anggota yang sudah bayar pada periode ini
    const paidTxs = await Transaction.find({
      memberId: { $in: activeMembers.map((m) => m._id) },
      period,
      type: 'in',
    }).select('memberId').lean();

    const paidMemberIdSet = new Set(paidTxs.map((t) => t.memberId.toString()));
    const unpaidMembers = activeMembers.filter((m) => !paidMemberIdSet.has(m._id.toString()));

    if (unpaidMembers.length === 0) {
      return res.status(200).json({
        success: true,
        message: `Seluruh anggota sudah lunas pada periode ${period}. Tidak ada transaksi baru dibuat.`,
        data: { count: 0, period },
      });
    }

    const setting = await Setting.findById('main_config');
    const recorder = setting ? setting.treasurerName : 'Bendahara OSIS';
    const today = getTodayDate();
    const nowTime = getCurrentTime();

    const newDocuments = unpaidMembers.map((member) => ({
      type: 'in',
      title: `Kas OSIS - ${member.name} (${period})`,
      category: 'Kas Anggota',
      amount: nominal,
      date: today,
      time: nowTime,
      recorder,
      iconBrand: 'kas',
      memberId: member._id,
      period,
      note: note || 'Pembayaran massal kas OSIS',
    }));

    const inserted = await Transaction.insertMany(newDocuments);

    res.status(201).json({
      success: true,
      message: `Berhasil mencatat pembayaran kas massal untuk ${inserted.length} anggota`,
      data: {
        count: inserted.length,
        period,
        totalCollected: inserted.length * nominal,
        transactions: inserted,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/transactions/:id
 * Mengubah transaksi yang sudah ada
 */
exports.updateTransaction = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, category, amount, date, time, recorder, note } = req.body;

    const updates = {};
    if (title !== undefined) updates.title = title;
    if (category !== undefined) updates.category = category;
    if (amount !== undefined) updates.amount = Number(amount);
    if (date !== undefined) updates.date = date;
    if (time !== undefined) updates.time = time;
    if (recorder !== undefined) updates.recorder = recorder;
    if (note !== undefined) updates.note = note;

    const transaction = await Transaction.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaksi tidak ditemukan',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Transaksi berhasil diperbarui',
      data: transaction,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/transactions/:id
 * Menghapus transaksi (otomatis mengembalikan status anggota kas menjadi belum bayar)
 */
exports.deleteTransaction = async (req, res, next) => {
  try {
    const { id } = req.params;

    const transaction = await Transaction.findByIdAndDelete(id);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaksi tidak ditemukan',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Transaksi berhasil dihapus. Saldo dan status kas terkait telah diperbarui.',
      data: { id: transaction._id, type: transaction.type, amount: transaction.amount },
    });
  } catch (error) {
    next(error);
  }
};
