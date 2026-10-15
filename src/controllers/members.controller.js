const Member = require('../models/Member');
const Transaction = require('../models/Transaction');
const Setting = require('../models/Setting');

/**
 * GET /api/members
 * Mengambil daftar anggota lengkap dengan status pelunasan kas pada periode yang dipilih
 * Query: ?period=2026-10&search=bambang
 */
exports.getMembers = async (req, res, next) => {
  try {
    let { period, search } = req.query;

    // Default ke activePeriod dari settings jika tidak disediakan
    if (!period) {
      const setting = await Setting.findById('main_config');
      period = setting ? setting.activePeriod : '2026-10';
    }

    const queryFilter = { isActive: true };
    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      queryFilter.$or = [{ name: regex }, { role: regex }];
    }

    const members = await Member.find(queryFilter).sort({ createdAt: 1 }).lean();

    // Ambil seluruh transaksi kas masuk pada periode tersebut
    const memberIds = members.map((m) => m._id);
    const transactions = await Transaction.find({
      memberId: { $in: memberIds },
      period,
      type: 'in',
    }).lean();

    // Map transaksi ke memberId untuk O(1) lookup
    const txMap = new Map();
    transactions.forEach((tx) => {
      txMap.set(tx.memberId.toString(), tx);
    });

    const membersWithStatus = members.map((member) => {
      const paidTx = txMap.get(member._id.toString());
      return {
        ...member,
        isPaid: Boolean(paidTx),
        paidAmount: paidTx ? paidTx.amount : 0,
        paidTransactionId: paidTx ? paidTx._id : null,
        paidDate: paidTx ? paidTx.date : null,
      };
    });

    res.status(200).json({
      success: true,
      message: `Daftar anggota untuk periode ${period}`,
      period,
      total: membersWithStatus.length,
      paidCount: membersWithStatus.filter((m) => m.isPaid).length,
      unpaidCount: membersWithStatus.filter((m) => !m.isPaid).length,
      data: membersWithStatus,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/members
 * Menambah anggota baru dengan sanitasi otomatis Title Case
 */
exports.createMember = async (req, res, next) => {
  try {
    const { name, role } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Nama anggota wajib diisi',
      });
    }

    // Cek duplikasi nama anggota aktif
    const existing = await Member.findOne({
      name: new RegExp(`^${name.trim()}$`, 'i'),
      isActive: true,
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Anggota dengan nama "${name.trim()}" sudah ada di database.`,
      });
    }

    const member = await Member.create({
      name: name.trim(),
      role: role && role.trim() ? role.trim() : 'Anggota OSIS',
    });

    res.status(201).json({
      success: true,
      message: 'Anggota OSIS berhasil ditambahkan',
      data: member,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/members/:id
 * Mengubah nama atau jabatan anggota
 */
exports.updateMember = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, role } = req.body;

    const member = await Member.findById(id);
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Anggota tidak ditemukan',
      });
    }

    if (name) member.name = name;
    if (role) member.role = role;

    await member.save();

    res.status(200).json({
      success: true,
      message: 'Data anggota berhasil diperbarui',
      data: member,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/members/:id
 * Soft delete anggota (mengubah isActive: false)
 */
exports.deleteMember = async (req, res, next) => {
  try {
    const { id } = req.params;

    const member = await Member.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );

    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Anggota tidak ditemukan',
      });
    }

    res.status(200).json({
      success: true,
      message: `Anggota ${member.name} berhasil dinonaktifkan`,
    });
  } catch (error) {
    next(error);
  }
};
