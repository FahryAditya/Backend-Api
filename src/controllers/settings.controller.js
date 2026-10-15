const Setting = require('../models/Setting');

/**
 * GET /api/settings
 * Mengambil konfigurasi aktif atau melakukan auto-seed default jika belum ada
 */
exports.getSettings = async (req, res, next) => {
  try {
    let setting = await Setting.findById('main_config');
    if (!setting) {
      setting = await Setting.create({ _id: 'main_config' });
    }

    res.status(200).json({
      success: true,
      message: 'Berhasil mengambil konfigurasi kas OSIS',
      data: setting,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/settings
 * Memperbarui parameter kas OSIS
 * Catatan: Perubahan kasFee hanya berlaku untuk transaksi baru di masa mendatang
 */
exports.updateSettings = async (req, res, next) => {
  try {
    const {
      orgName,
      schoolName,
      treasurerName,
      initialBalance,
      kasFee,
      kasFeeEffectiveDate,
      feeHistory,
      holidays,
      activePeriod,
      currencyStyle,
      categoriesIn,
      categoriesOut,
    } = req.body;

    const updates = {};
    if (orgName !== undefined) updates.orgName = orgName;
    if (schoolName !== undefined) updates.schoolName = schoolName;
    if (treasurerName !== undefined) updates.treasurerName = treasurerName;
    if (initialBalance !== undefined) updates.initialBalance = Number(initialBalance);
    if (kasFee !== undefined) updates.kasFee = Number(kasFee);
    if (kasFeeEffectiveDate !== undefined) updates.kasFeeEffectiveDate = kasFeeEffectiveDate;
    if (feeHistory !== undefined && Array.isArray(feeHistory)) updates.feeHistory = feeHistory;
    if (holidays !== undefined && Array.isArray(holidays)) updates.holidays = holidays;
    if (activePeriod !== undefined) updates.activePeriod = activePeriod;
    if (currencyStyle !== undefined) updates.currencyStyle = currencyStyle;
    if (categoriesIn !== undefined && Array.isArray(categoriesIn)) updates.categoriesIn = categoriesIn;
    if (categoriesOut !== undefined && Array.isArray(categoriesOut)) updates.categoriesOut = categoriesOut;

    const setting = await Setting.findByIdAndUpdate(
      'main_config',
      { $set: updates },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Pengaturan kas berhasil diperbarui',
      data: setting,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/settings/categories
 * Menambahkan kategori baru untuk pemasukan ('in') atau pengeluaran ('out')
 */
exports.addCategory = async (req, res, next) => {
  try {
    const { name, type } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Nama kategori wajib diisi',
      });
    }

    if (!['in', 'out'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Tipe kategori harus "in" atau "out"',
      });
    }

    const trimmed = name.trim();
    const updateField = type === 'in' ? 'categoriesIn' : 'categoriesOut';

    const setting = await Setting.findByIdAndUpdate(
      'main_config',
      { $addToSet: { [updateField]: trimmed } },
      { new: true, upsert: true }
    );

    res.status(201).json({
      success: true,
      message: `Kategori "${trimmed}" berhasil ditambahkan ke ${type === 'in' ? 'pemasukan' : 'pengeluaran'}`,
      data: setting,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/settings/categories/:name
 * Menghapus kategori kas
 */
exports.deleteCategory = async (req, res, next) => {
  try {
    const { name } = req.params;
    const { type } = req.query; // 'in' or 'out'
    const updateField = type === 'in' ? 'categoriesIn' : 'categoriesOut';

    const setting = await Setting.findByIdAndUpdate(
      'main_config',
      { $pull: { [updateField]: name } },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: `Kategori "${name}" berhasil dihapus`,
      data: setting,
    });
  } catch (error) {
    next(error);
  }
};
