// Pastikan Node dapat memuat package dari local path jika berjalan di Windows drive virtual
if (!process.env.NODE_PATH) {
  process.env.NODE_PATH = 'C:\\Users\\ACER\\.kas_backend_node_modules\\node_modules';
  require('module').Module._initPaths();
}

require('dotenv').config();
const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (_) {}

const mongoose = require('mongoose');
const Setting = require('../models/Setting');
const Member = require('../models/Member');
const Transaction = require('../models/Transaction');

const seedData = async () => {
  const mongoURI =
    process.env.MONGODB_URI ||
    process.env.MONGO_URI ||
    'mongodb://127.0.0.1:27017/kas_osis';

  console.log('[Seeder] Menghubungkan ke database:', mongoURI);
  await mongoose.connect(mongoURI);

  console.log('[Seeder] Membersihkan data lama...');
  await Setting.deleteMany({});
  await Member.deleteMany({});
  await Transaction.deleteMany({});

  // 1. Seed Konfigurasi Kas OSIS
  console.log('[Seeder] Membuat konfigurasi Setting default...');
  const setting = await Setting.create({
    _id: 'main_config',
    orgName: 'OSIS SMA Negeri 1',
    treasurerName: 'Siyam Ahmed',
    initialBalance: 4752300,
    kasFee: 20000,
    activePeriod: '2026-10',
    currencyStyle: 'idr',
    categoriesIn: ['Kas Anggota', 'Dana Sekolah', 'Sponsorship', 'Donasi Alumni', 'Bazar OSIS'],
    categoriesOut: ['Perlengkapan OSIS', 'Konsumsi Rapat', 'Administrasi & Cetak', 'Dokumentasi & Publikasi', 'Transportasi'],
  });

  // 2. Seed 10 Anggota OSIS
  console.log('[Seeder] Membuat 10 anggota OSIS...');
  const rawMembers = [
    { name: 'BAMBANG YUDISONO', role: 'Ketua OSIS' },
    { name: 'SITI NURHALIZA PUTRI', role: 'Wakil Ketua' },
    { name: 'SIYAM AHMED', role: 'Bendahara Umum' },
    { name: 'NADIA AULIA RAHMA', role: 'Sekretaris I' },
    { name: 'RIZKY PRATAMA', role: 'Sekbid Keimanan' },
    { name: 'DIMAS ANGGARA', role: 'Sekbid Bela Negara' },
    { name: 'PUTRI MAHARANI', role: 'Sekbid Kesenian' },
    { name: 'FAJAR NUGROHO', role: 'Sekbid Olahraga' },
    { name: 'AULIA ZAHRA', role: 'Sekbid Humas' },
    { name: 'KEVIN SANJAYA', role: 'Sekbid TIK' },
  ];

  const createdMembers = await Member.create(rawMembers);
  console.log(`[Seeder] Berhasil membuat ${createdMembers.length} anggota dengan nama Title Case.`);

  // 3. Seed Transaksi Demo
  console.log('[Seeder] Membuat transaksi pengeluaran dan kas anggota demo...');
  const transactions = [
    // 3 Pengeluaran Ikonik dari Mockup
    {
      type: 'out',
      title: 'Apple Inc. (iCloud Dokumentasi OSIS)',
      category: 'Dokumentasi & Publikasi',
      amount: 230500,
      date: '2026-10-14',
      time: '03:02 PM',
      recorder: 'Siyam Ahmed',
      iconBrand: 'apple',
      note: 'Langganan cloud dokumentasi kegiatan OSIS',
    },
    {
      type: 'out',
      title: 'Adobe (Lisensi Desain Sekbid TIK)',
      category: 'Dokumentasi & Publikasi',
      amount: 130500,
      date: '2026-10-13',
      time: '03:22 PM',
      recorder: 'Siyam Ahmed',
      iconBrand: 'adobe',
      note: 'Lisensi Adobe Photoshop / Illustrator bulanan',
    },
    {
      type: 'out',
      title: 'Amazon (Alat Tulis & Arsip Kas)',
      category: 'Administrasi & Cetak',
      amount: 20500,
      date: '2026-10-12',
      time: '02:02 PM',
      recorder: 'Siyam Ahmed',
      iconBrand: 'amazon',
      note: 'Map arsip bendahara dan kertas nota',
    },
    // 6 Pembayaran Kas Anggota Periode 2026-10 (6 * 20.000 = +120.000)
    {
      type: 'in',
      title: `Kas OSIS - ${createdMembers[0].name} (2026-10)`,
      category: 'Kas Anggota',
      amount: 20000,
      date: '2026-10-05',
      time: '08:15 AM',
      recorder: 'Siyam Ahmed',
      iconBrand: 'kas',
      memberId: createdMembers[0]._id,
      period: '2026-10',
      note: 'Bayar tunai kas Oktober',
    },
    {
      type: 'in',
      title: `Kas OSIS - ${createdMembers[1].name} (2026-10)`,
      category: 'Kas Anggota',
      amount: 20000,
      date: '2026-10-05',
      time: '08:20 AM',
      recorder: 'Siyam Ahmed',
      iconBrand: 'kas',
      memberId: createdMembers[1]._id,
      period: '2026-10',
      note: 'Bayar tunai kas Oktober',
    },
    {
      type: 'in',
      title: `Kas OSIS - ${createdMembers[2].name} (2026-10)`,
      category: 'Kas Anggota',
      amount: 20000,
      date: '2026-10-05',
      time: '08:22 AM',
      recorder: 'Siyam Ahmed',
      iconBrand: 'kas',
      memberId: createdMembers[2]._id,
      period: '2026-10',
      note: 'Potong kas bendahara',
    },
    {
      type: 'in',
      title: `Kas OSIS - ${createdMembers[3].name} (2026-10)`,
      category: 'Kas Anggota',
      amount: 20000,
      date: '2026-10-06',
      time: '09:10 AM',
      recorder: 'Siyam Ahmed',
      iconBrand: 'kas',
      memberId: createdMembers[3]._id,
      period: '2026-10',
      note: 'Transfer bank',
    },
    {
      type: 'in',
      title: `Kas OSIS - ${createdMembers[4].name} (2026-10)`,
      category: 'Kas Anggota',
      amount: 20000,
      date: '2026-10-06',
      time: '09:40 AM',
      recorder: 'Siyam Ahmed',
      iconBrand: 'kas',
      memberId: createdMembers[4]._id,
      period: '2026-10',
      note: 'Bayar tunai kas Oktober',
    },
    {
      type: 'in',
      title: `Kas OSIS - ${createdMembers[5].name} (2026-10)`,
      category: 'Kas Anggota',
      amount: 20000,
      date: '2026-10-07',
      time: '10:05 AM',
      recorder: 'Siyam Ahmed',
      iconBrand: 'kas',
      memberId: createdMembers[5]._id,
      period: '2026-10',
      note: 'Bayar tunai kas Oktober',
    },
    // 1 Pembayaran Kas Periode 2026-09 (+80.000)
    {
      type: 'in',
      title: `Kas OSIS - ${createdMembers[0].name} (2026-09)`,
      category: 'Kas Anggota',
      amount: 80000,
      date: '2026-09-20',
      time: '11:00 AM',
      recorder: 'Siyam Ahmed',
      iconBrand: 'kas',
      memberId: createdMembers[0]._id,
      period: '2026-09',
      note: 'Pelunasan kas September',
    },
  ];

  await Transaction.create(transactions);

  // Verifikasi saldo akhir
  const totalIn = transactions.filter((t) => t.type === 'in').reduce((s, t) => s + t.amount, 0);
  const totalOut = transactions.filter((t) => t.type === 'out').reduce((s, t) => s + t.amount, 0);
  const finalBalance = setting.initialBalance + totalIn - totalOut;

  console.log('--------------------------------------------------');
  console.log(`[Seeder SUKSES] Data demo Kas OSIS berhasil di-seed!`);
  console.log(`Saldo Awal        : Rp ${setting.initialBalance.toLocaleString('id-ID')}`);
  console.log(`Total Pemasukan   : +Rp ${totalIn.toLocaleString('id-ID')}`);
  console.log(`Total Pengeluaran : -Rp ${totalOut.toLocaleString('id-ID')}`);
  console.log(`Saldo Akhir Kas   : Rp ${finalBalance.toLocaleString('id-ID')} (Target: Rp 4.570.800)`);
  console.log('--------------------------------------------------');

  await mongoose.disconnect();
  process.exit(0);
};

seedData().catch((err) => {
  console.error('[Seeder Gagal]', err);
  process.exit(1);
});
