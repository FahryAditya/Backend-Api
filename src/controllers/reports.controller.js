const Transaction = require('../models/Transaction');
const Setting = require('../models/Setting');

/**
 * GET /api/reports/summary
 * Menghitung rekapitulasi arus kas dan agregasi kategori untuk Donut Chart
 * Query: ?period=2026-10
 */
exports.getReportSummary = async (req, res, next) => {
  try {
    const { period } = req.query;

    const setting = await Setting.findById('main_config');
    const initialBalance = setting ? setting.initialBalance : 4752300;
    const activePeriod = period || (setting ? setting.activePeriod : '2026-10');

    // 1. Agregasi Total Arus Kas Keseluruhan
    const totalAgg = await Transaction.aggregate([
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    let totalIncome = 0;
    let totalExpense = 0;

    totalAgg.forEach((item) => {
      if (item._id === 'in') totalIncome = item.total;
      if (item._id === 'out') totalExpense = item.total;
    });

    const finalBalance = initialBalance + totalIncome - totalExpense;

    // 2. Agregasi Arus Kas Bulan yang Dipilih (Active Period)
    const monthFilter = { date: new RegExp(`^${activePeriod}`) };
    const monthAgg = await Transaction.aggregate([
      { $match: monthFilter },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
        },
      },
    ]);

    let monthIncome = 0;
    let monthExpense = 0;

    monthAgg.forEach((item) => {
      if (item._id === 'in') monthIncome = item.total;
      if (item._id === 'out') monthExpense = item.total;
    });

    // 3. Agregasi Kategori untuk Segmen Donut Chart 5-Kategori
    const categoryAgg = await Transaction.aggregate([
      {
        $group: {
          _id: { type: '$type', category: '$category' },
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          type: '$_id.type',
          category: '$_id.category',
          total: '$total',
          count: '$count',
        },
      },
      { $sort: { total: -1 } },
    ]);

    // Format segmen spesifik Donut Chart (Kas Anggota, Konsumsi, Administrasi, Perlengkapan, Surplus)
    const surplus = totalIncome - totalExpense;

    res.status(200).json({
      success: true,
      message: 'Berhasil mengambil ringkasan laporan kas OSIS',
      period: activePeriod,
      data: {
        initialBalance,
        totalIncome,
        totalExpense,
        finalBalance,
        monthIncome,
        monthExpense,
        surplus: surplus > 0 ? surplus : 0,
        ratios: {
          incomePercentage: (totalIncome + totalExpense) > 0 ? Math.round((totalIncome / (totalIncome + totalExpense)) * 100) : 0,
          expensePercentage: (totalIncome + totalExpense) > 0 ? Math.round((totalExpense / (totalIncome + totalExpense)) * 100) : 0,
        },
        categoryBreakdown: categoryAgg,
      },
    });
  } catch (error) {
    next(error);
  }
};
