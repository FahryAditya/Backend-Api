# 🚀 Panduan Deploy Backend Kas OSIS ke Vercel (Serverless REST API)

Backend Kas OSIS telah dikonfigurasi secara penuh untuk dapat di-deploy ke **Vercel** sebagai Serverless Function dengan connection pooling MongoDB.

---

## 1. Persiapan Database (MongoDB Atlas)
Karena Vercel berjalan di cloud (serverless), backend membutuhkan database cloud yang dapat diakses dari internet:
1. Buat akun gratis di [MongoDB Atlas](https://www.mongodb.com/atlas).
2. Buat cluster gratis (M0 Free Tier).
3. Di menu **Network Access**, tambahkan IP Access List: `0.0.0.0/0` (Allow Access from Anywhere).
4. Di menu **Database Access**, buat user database (misal: username `admin` dan password pilihan Anda).
5. Salin connection string MongoDB Anda, contoh:
   ```text
   mongodb+srv://admin:<password>@cluster0.abcde.mongodb.net/kas_osis?retryWrites=true&w=majority
   ```

---

## 2. Cara Deploy ke Vercel

### Opsi A: Melalui Vercel Dashboard (Paling Mudah)
1. Push project Anda ke **GitHub**.
2. Masuk ke [vercel.com](https://vercel.com) dan klik **"Add New Project"** $\rightarrow$ **"Import Git Repository"**.
3. Pada bagian **Root Directory**, klik **Edit** dan pilih folder **`backend`**.
4. Buka bagian **Environment Variables** dan tambahkan:
   * **`MONGO_URI`**: *(Tempel connection string MongoDB Atlas Anda)*
   * **`NODE_ENV`**: `production`
5. Klik **"Deploy"**.
6. Selesai! Vercel akan memberikan domain publik gratis, contoh:
   ```text
   https://kas-osis-backend.vercel.app
   ```

### Opsi B: Melalui Vercel CLI
Jalankan di terminal di dalam folder `backend/`:
```bash
npm install -g vercel
vercel
```
Ikuti instruksi di terminal dan tambahkan `MONGO_URI` saat diminta.

---

## 3. Sinkronkan ke Frontend Flutter

Setelah mendapatkan domain Vercel Anda:
1. Buka aplikasi **Kas OSIS** di Flutter.
2. Masuk ke tab **Pengaturan** (ikon gear / tab 4).
3. Di kartu **Koneksi Backend API**, masukkan URL Vercel Anda diikuti `/api`:
   ```text
   https://kas-osis-backend.vercel.app/api
   ```
4. Klik tombol **"Uji & Sinkronkan ke Backend"**.
5. Indikator status akan berubah menjadi **🟢 Online (API)** dan data kas Anda akan tersinkronisasi secara real-time ke MongoDB di cloud!
