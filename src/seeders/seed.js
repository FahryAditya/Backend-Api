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

const seedData = async () => {
  const mongoURI =
    process.env.MONGODB_URI ||
    process.env.MONGO_URI ||
    'mongodb://127.0.0.1:27017/kas_osis';

  console.log('[Seeder] Menghubungkan ke database:', mongoURI);
  await mongoose.connect(mongoURI);

  console.log('[Seeder] Menyiapkan konfigurasi default bersih (tanpa data dummy)...');

  // Inisialisasi atau perbarui konfigurasi utama
  const setting = await Setting.findByIdAndUpdate(
    'main_config',
    {
      $set: {
        orgName: 'OSIS SKARLAKES',
        schoolName: 'SMK Airlangga & SMK Kesehatan Airlangga',
        treasurerName: 'Bendahara OSIS',
        initialBalance: 0,
        kasFee: 2000,
        kasFeeEffectiveDate: '2026-10-01',
        activePeriod: '2026-10',
        currencyStyle: 'idr',
        categoriesIn: [
          'Kas Anggota',
          'Dana Sekolah',
          'Sponsorship',
          'Donasi Alumni',
          'Bazar OSIS',
        ],
        categoriesOut: [
          'Perlengkapan OSIS',
          'Konsumsi Rapat',
          'Administrasi & Cetak',
          'Dokumentasi & Publikasi',
          'Transportasi',
        ],
      },
    },
    { new: true, upsert: true }
  );

  console.log('--------------------------------------------------');
  console.log('[Seeder SUKSES] Konfigurasi Kas OSIS berhasil disiapkan!');
  console.log(`Organisasi  : ${setting.orgName}`);
  console.log(`Sekolah     : ${setting.schoolName}`);
  console.log(`Bendahara   : ${setting.treasurerName}`);
  console.log(`Kas/Minggu  : Rp ${setting.kasFee.toLocaleString('id-ID')}`);
  console.log('--------------------------------------------------');

  await mongoose.disconnect();
  process.exit(0);
};

seedData().catch((err) => {
  console.error('[Seeder Gagal]', err);
  process.exit(1);
});
