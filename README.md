# 🚀 Backend Kas OSIS REST API (Node.js + Express + MongoDB)

Dokumentasi resmi backend RESTful API untuk aplikasi **Kas OSIS**.

---

## 🛠️ Persyaratan Lingkungan
- **Node.js:** v18.x ke atas
- **MongoDB:** MongoDB lokal (`mongodb://127.0.0.1:27017/kas_osis`) atau [MongoDB Atlas](https://www.mongodb.com/atlas) (Cloud)

---

## ⚙️ Cara Menjalankan

### 1. Konfigurasi Environment (`.env`)
Salin file `.env.example` menjadi `.env`:
```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/kas_osis
CORS_ORIGIN=*
```
> **Catatan:** Jika menggunakan MongoDB Atlas, ubah `MONGO_URI` dengan connection string Anda, contoh:
> `MONGO_URI=mongodb+srv://<user>:<password>@cluster0.mongodb.net/kas_osis?retryWrites=true&w=majority`

### 2. Seeding Data Demo OSIS (Target: Saldo Rp 4.570.800)
Jalankan perintah berikut untuk mengisi data demo awal (10 anggota OSIS, saldo awal Rp 4.752.300, 3 transaksi pengeluaran demo Apple/Adobe/Amazon, dan 6 pembayaran kas Oktober):
```bash
npm run seed
```

### 3. Menjalankan Server
```bash
# Menjalankan server produksi
npm start

# Atau mode development (auto-reload via nodemon)
npm run dev
```
Server akan aktif di: **`http://localhost:5000`**

---

## 📋 Dokumentasi Endpoint API

Format Respon Standar:
```json
{
  "success": true,
  "message": "Pesan deskripsi",
  "data": { ... }
}
```

### 1. Pengaturan Kas (`/api/settings`)
* **`GET /api/settings`**: Mengambil konfigurasi aktif (otomatis inisialisasi jika kosong).
* **`PUT /api/settings`**: Memperbarui nama organisasi, nama bendahara, saldo awal, iuran kas default (`kasFee`), periode aktif (`activePeriod`), atau `currencyStyle`.
  - *Catatan:* Perubahan `kasFee` hanya mempengaruhi pembayaran baru dan tidak merubah riwayat transaksi lama.
* **`POST /api/settings/categories`**: Menambah kategori baru.
  - Body: `{ "name": "Bazar OSIS", "type": "in" }` (type: `"in"` atau `"out"`)

### 2. Manajemen Anggota OSIS (`/api/members`)
* **`GET /api/members?period=2026-10&search=bambang`**:
  - Mengembalikan daftar anggota beserta status kas pada periode tersebut: `isPaid` (boolean), `paidAmount`, dan `paidTransactionId`.
* **`POST /api/members`**: Menambah anggota baru (otomatis diformat ke *Title Case*).
  - Body: `{ "name": "BAMBANG YUDISONO", "role": "Ketua OSIS" }`
* **`PUT /api/members/:id`**: Mengubah nama atau jabatan anggota.
* **`DELETE /api/members/:id`**: Menonaktifkan anggota (*soft delete* `isActive: false`).

### 3. Pembayaran Uang Kas Anggota (`/api/transactions`)
* **`POST /api/transactions/kas-payment`**: Mencatat pembayaran kas perorangan.
  - Body: `{ "memberId": "65...", "period": "2026-10", "amount": 20000, "note": "Bayar tunai" }`
  - Validasi: Otomatis menolak dobel bayar (*Compound Check*) untuk anggota & periode yang sama.
* **`POST /api/transactions/kas-payment/bulk`**: Melunasi seluruh anggota yang belum bayar dalam satu kali aksi.
  - Body: `{ "period": "2026-10", "amount": 20000, "note": "Pembayaran massal kas OSIS" }`

### 4. Transaksi Umum (`/api/transactions`)
* **`GET /api/transactions?type=in&category=all&month=2026-10&search=...`**: Mengambil riwayat transaksi terurut terbaru.
* **`POST /api/transactions`**: Mencatat pemasukan atau pengeluaran umum di luar kas.
  - Body: `{ "type": "out", "title": "Beli Kertas HVS", "category": "Administrasi & Cetak", "amount": 45000, "date": "2026-10-15", "recorder": "Siyam Ahmed" }`
* **`PUT /api/transactions/:id`**: Mengedit transaksi tersimpan.
* **`DELETE /api/transactions/:id`**: Menghapus transaksi (otomatis mengembalikan status anggota kas terkait menjadi *Belum Bayar*).

### 5. Laporan & Agregasi Donut Chart (`/api/reports/summary`)
* **`GET /api/reports/summary?period=2026-10`**:
  - Menghitung agregasi MongoDB: Saldo Awal, Total Pemasukan, Total Pengeluaran, Saldo Akhir, Surplus Kas, serta rincian per kategori untuk visual Donut Chart.
