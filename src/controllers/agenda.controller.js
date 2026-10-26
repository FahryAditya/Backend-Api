const Agenda = require('../models/Agenda');
const Transaction = require('../models/Transaction');
const Member = require('../models/Member');

// Helper penanggalan
const getTodayDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const getCurrentTime = () => {
  return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
};

// Helper pendeteksi kelas
const getGradeLevel = (className) => {
  if (!className) return 10;
  const normalized = String(className).trim().toUpperCase();
  if (normalized.includes('XI') || normalized.includes('11') || normalized.startsWith('KELAS 11')) {
    return 11;
  }
  return 10;
};

/**
 * GET /api/agendas
 * Mengambil seluruh daftar agenda kegiatan
 */
exports.getAllAgendas = async (req, res, next) => {
  try {
    const agendas = await Agenda.find().sort({ createdAt: -1 }).lean();
    res.status(200).json({
      success: true,
      message: 'Berhasil mengambil daftar agenda',
      total: agendas.length,
      data: agendas,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/agendas/:id
 * Mengambil detail agenda dan daftar pesertanya
 */
exports.getAgendaById = async (req, res, next) => {
  try {
    const agenda = await Agenda.findById(req.params.id).lean();
    if (!agenda) {
      return res.status(404).json({
        success: false,
        message: 'Agenda tidak ditemukan',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Berhasil mengambil detail agenda',
      data: agenda,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/agendas
 * Membuat agenda baru dan otomatis mengalokasikan siswa berdasarkan target kelas
 */
exports.createAgenda = async (req, res, next) => {
  try {
    const { title, description = '', feeAmount, targetAudience = 'allClasses', mergeWithMainKas = false, dueDate } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Nama agenda/kegiatan wajib diisi',
      });
    }
    
    if (!feeAmount || Number(feeAmount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Nominal iuran harus lebih besar dari 0',
      });
    }

    // Ambil data anggota aktif dari database
    const members = await Member.find({ isActive: true }).sort({ name: 1 }).lean();
    const participants = [];

    for (const member of members) {
      const grade = getGradeLevel(member.className);
      let include = false;

      if (targetAudience === 'allClasses') {
        include = true;
      } else if (targetAudience === 'class10') {
        include = (grade === 10);
      } else if (targetAudience === 'class11') {
        include = (grade === 11);
      }

      if (include) {
        participants.push({
          memberId: String(member._id),
          memberName: member.name,
          className: member.className || '',
          grade,
          isPaid: false,
          paidAmount: 0,
          paidAt: null,
          transactionId: null,
        });
      }
    }

    const agenda = await Agenda.create({
      title: title.trim(),
      description: description.trim(),
      feeAmount: Number(feeAmount),
      targetAudience,
      mergeWithMainKas: Boolean(mergeWithMainKas),
      dueDate: dueDate || null,
      participants,
    });

    res.status(201).json({
      success: true,
      message: 'Agenda dan alokasi peserta berhasil dibuat',
      data: agenda,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/agendas/:id/pay
 * Membayar iuran agenda per peserta (Mendukung Opsi B mergeWithMainKas)
 */
exports.payParticipant = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { memberId, amount, recorder = 'Bendahara OSIS', note, walletType = 'cash' } = req.body;

    const agenda = await Agenda.findById(id);
    if (!agenda) {
      return res.status(404).json({
        success: false,
        message: 'Agenda tidak ditemukan',
      });
    }

    const participant = agenda.participants.find((p) => p.memberId === memberId);
    if (!participant) {
      return res.status(404).json({
        success: false,
        message: 'Peserta tidak ditemukan dalam agenda ini',
      });
    }

    const currentPaid = participant.paidAmount || 0;
    if (currentPaid >= agenda.feeAmount) {
      return res.status(400).json({
        success: false,
        message: 'Peserta ini sudah berstatus lunas',
      });
    }

    const payAmount = Number(amount) || (agenda.feeAmount - currentPaid);
    const newTotalPaid = currentPaid + payAmount;
    const isFullLunas = newTotalPaid >= agenda.feeAmount;

    const today = getTodayDate();
    const time = getCurrentTime();
    let transactionId = null;

    // JIKA mergeWithMainKas aktif: Buat transaksi kas masuk di database
    if (agenda.mergeWithMainKas) {
      const createdTx = await Transaction.create({
        type: 'in',
        title: `Iuran ${agenda.title} - ${participant.memberName}${isFullLunas ? ' (Pelunasan)' : ' (Cicilan)'}`,
        category: 'Iuran Agenda',
        amount: payAmount,
        date: today,
        time,
        recorder,
        iconBrand: 'general',
        walletType: walletType === 'digital' ? 'digital' : 'cash',
        note: note || `Pembayaran iuran ${agenda.title} (${payAmount >= agenda.feeAmount ? 'Lunas' : `Cicilan Rp${payAmount}`})`,
      });
      transactionId = String(createdTx._id);
    }

    participant.isPaid = isFullLunas;
    participant.paidAmount = newTotalPaid;
    participant.paidAt = `${today} ${time}`;
    participant.transactionId = transactionId;
    participant.walletType = walletType === 'digital' ? 'digital' : 'cash';
    participant.recorder = recorder;
    participant.note = note || '';

    await agenda.save();

    res.status(200).json({
      success: true,
      message: `Pembayaran ${participant.memberName} berhasil dicatat`,
      data: agenda,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/agendas/:id/cancel
 * Membatalkan pembayaran iuran peserta dan menghapus transaksi kas jika ada
 */
exports.cancelPayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { memberId } = req.body;

    const agenda = await Agenda.findById(id);
    if (!agenda) {
      return res.status(404).json({
        success: false,
        message: 'Agenda tidak ditemukan',
      });
    }

    const participant = agenda.participants.find((p) => p.memberId === memberId);
    if (!participant) {
      return res.status(404).json({
        success: false,
        message: 'Peserta tidak ditemukan dalam agenda ini',
      });
    }

    if (!participant.isPaid) {
      return res.status(400).json({
        success: false,
        message: 'Peserta belum bayar, tidak ada pembayaran yang dibatalkan',
      });
    }

    // Jika ada transactionId, hapus transaksi dari buku kas
    if (participant.transactionId) {
      await Transaction.findByIdAndDelete(participant.transactionId);
    }

    participant.isPaid = false;
    participant.paidAmount = 0;
    participant.paidAt = null;
    participant.transactionId = null;

    await agenda.save();

    res.status(200).json({
      success: true,
      message: `Pembayaran ${participant.memberName} berhasil dibatalkan`,
      data: agenda,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/agendas/:id/bulk-pay
 * Melunasi seluruh siswa yang belum bayar dalam satu kelas (Kelas 10 atau 11)
 */
exports.bulkPayClass = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { grade, recorder = 'Bendahara OSIS', walletType = 'cash' } = req.body;

    const agenda = await Agenda.findById(id);
    if (!agenda) {
      return res.status(404).json({
        success: false,
        message: 'Agenda tidak ditemukan',
      });
    }

    const today = getTodayDate();
    const time = getCurrentTime();
    let paidCount = 0;

    for (const p of agenda.participants) {
      if (p.grade === Number(grade) && !p.isPaid) {
        let transactionId = null;

        if (agenda.mergeWithMainKas) {
          const createdTx = await Transaction.create({
            type: 'in',
            title: `Iuran ${agenda.title} - ${p.memberName}`,
            category: 'Iuran Agenda',
            amount: agenda.feeAmount,
            date: today,
            time,
            recorder,
            iconBrand: 'general',
            walletType: walletType === 'digital' ? 'digital' : 'cash',
            note: `Pembayaran massal iuran ${agenda.title} Kelas ${grade}`,
          });
          transactionId = String(createdTx._id);
        }

        p.isPaid = true;
        p.paidAmount = agenda.feeAmount;
        p.paidAt = `${today} ${time}`;
        p.transactionId = transactionId;
        p.walletType = walletType === 'digital' ? 'digital' : 'cash';
        p.recorder = recorder;
        p.note = `Pembayaran massal Kelas ${grade}`;
        paidCount++;
      }
    }

    await agenda.save();

    res.status(200).json({
      success: true,
      message: `Berhasil melunasi ${paidCount} siswa Kelas ${grade}`,
      paidCount,
      data: agenda,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/agendas/:id
 * Menghapus agenda dan seluruh transaksi kas yang berkaitan bila ada
 */
exports.deleteAgenda = async (req, res, next) => {
  try {
    const { id } = req.params;
    const agenda = await Agenda.findById(id);

    if (!agenda) {
      return res.status(404).json({
        success: false,
        message: 'Agenda tidak ditemukan',
      });
    }

    // Kumpulkan semua transactionId jika pernah digabung ke kas
    const txIds = agenda.participants
      .map((p) => p.transactionId)
      .filter((txId) => txId);

    if (txIds.length > 0) {
      await Transaction.deleteMany({ _id: { $in: txIds } });
    }

    await Agenda.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Agenda beserta transaksi terkait berhasil dihapus',
    });
  } catch (error) {
    next(error);
  }
};
