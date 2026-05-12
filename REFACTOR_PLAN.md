# Rencana Refactor Besar — POS Ceviki

> **Status:** Menunggu — lakukan setelah tidak ada komplain dari client  
> **Dibuat:** 7 Mei 2026  
> **Oleh:** Arya Asrul

---

## Keputusan Stack

| Hal | Keputusan | Alasan |
|---|---|---|
| Framework | Tetap **React + Vite** | POS tidak butuh SSR/SEO, migrasi ke Next.js terlalu besar risikonya |
| Backend | Tetap **Supabase** (RPC/stored procedures) | Sudah menjadi "server layer" yang cukup aman |
| Deployment | Tetap **Vercel** | Sudah jalan, tidak ada masalah |
| App Distribution | **PWA** dulu, pertimbangkan Capacitor kalau diminta | Paling mudah untuk client yang gaptek, zero friction |

---

## Urutan Pengerjaan

### Fase 1 — Rapikan Database

Tujuan: semua skema DB terdokumentasi dalam file SQL yang bisa di-run ulang dari nol.

**Yang dikerjakan:**
- [ ] Buat folder `supabase/migrations/` berisi file SQL berurutan
- [ ] Dokumentasikan semua tabel, kolom, tipe data, constraint
- [ ] Dokumentasikan semua stored procedure / RPC function
- [ ] Dokumentasikan semua RLS policy
- [ ] Dokumentasikan semua view (e.g. `v_transactions_with_customer`)
- [ ] Dokumentasikan semua index
- [ ] Buat seed file untuk data awal (kategori default, dll.)

**Aturan migration yang aman (karena sudah ada data):**
- Kolom baru harus pakai `DEFAULT` atau bisa `NULL`
- Jangan rename kolom/tabel yang sudah dipakai — buat kolom baru, migrasi data, baru drop yang lama
- Stored procedure: selalu `DROP FUNCTION` dulu sebelum `CREATE OR REPLACE` kalau ada perubahan parameter

**pg_cron (pending konfirmasi client):**
- [ ] Tanya client: apakah data lama (> 6 bulan / 1 tahun) boleh dihapus otomatis?
- [ ] Kalau iya: setup `pg_cron` extension di Supabase, jadwalkan hapus transaksi lama
- [ ] Alternatif: arsipkan ke tabel `archive_transactions` dulu, baru hapus setelah 2 tahun

---

### Fase 2 — Backend & Logic

Tujuan: semua logika bisnis rapi, terpusat, dan tidak duplikat antara frontend dan DB.

**Struktur folder baru `src/services/`:**
```
src/
  services/
    supabase.js          ← koneksi (sudah ada)
    products.js          ← (sudah ada, perlu review)
    transactions.js      ← (sudah ada, perlu review)
    transactionEdit.js   ← (sudah ada)
    employees.js         ← (sudah ada, perlu review)
    expenses.js          ← (sudah ada, perlu review)
    reports.js           ← (sudah ada, sudah fix)
    payments.js          ← (sudah ada, perlu review)
  types/
    transaction.types.js ← definisi shape data (JSDoc/TypeScript-style)
    product.types.js
    employee.types.js
  utils/
    formatters.js        ← (sudah ada)
    validators.js        ← validasi form terpusat (BARU)
    calculators.js       ← kalkulasi harga, diskon, pajak terpusat (BARU)
```

**Yang dikerjakan:**
- [ ] Pindahkan semua kalkulasi harga/diskon/pajak ke `utils/calculators.js` (sekarang duplikat di `Cart.jsx`, `CheckoutModal.jsx`, dan `transactions.js`) — *dari code review #6*
- [ ] Buat helper `buildReceiptData()` di `utils/` untuk mengganti konstruksi objek manual di `POS.jsx:handleCheckout` — *dari code review #8*
- [ ] Pindahkan semua validasi form ke `utils/validators.js`
- [ ] Buat JSDoc types di `src/types/` agar konsisten antar komponen
- [ ] Review setiap service file — hapus dead code, pastikan error handling konsisten
- [ ] Pastikan semua operasi yang melibatkan stok dilakukan di stored procedure (bukan di JS)
- [ ] Cek apakah `react-is` di `dependencies` masih dibutuhkan — kalau tidak, hapus — *dari code review #10*

---

### Fase 3 — UI & Frontend

Tujuan: komponen bersih, konsisten, tidak ada logika bisnis di dalam UI.

**Struktur folder yang dirapikan:**
```
src/
  components/
    layout/
      Header.jsx
    ui/                  ← komponen generik (BARU — pindah dari pos/ dan transactions/)
      Modal.jsx
      LoadingSpinner.jsx
      StatusBadge.jsx
      CurrencyInput.jsx
    pos/
      ProductCard.jsx
      Cart.jsx
      CheckoutModal.jsx
      ExpenseModal.jsx
    transactions/
      TransactionList.jsx
      TransactionDetail.jsx
      EditTransactionModal.jsx
    products/
      ProductForm.jsx
      ...
  pages/
    POS.jsx
    Dashboard.jsx
    Transactions.jsx
    Reports.jsx
    Products.jsx
    Employees.jsx
    Login.jsx
```

**Yang dikerjakan:**
- [ ] Ekstrak komponen `<LoadingSpinner>` generik — sekarang ada 5+ tempat dengan HTML yang identik
- [ ] Ekstrak `<Modal>` generik sebagai wrapper — sekarang setiap modal copy-paste struktur yang sama
- [ ] Pisahkan komponen yang terlalu besar (> 300 baris) menjadi sub-komponen
- [ ] Pastikan tidak ada kalkulasi harga di dalam komponen UI — pakai `calculators.js`
- [ ] Pastikan tidak ada fetch data di dalam komponen yang bukan page — pakai custom hook atau lewat props
- [ ] Review semua `useEffect` — pastikan tidak ada dependency yang hilang atau infinite loop potensial
- [ ] Perbaiki konsistensi semicolon di semua file — tambahkan ESLint rule `semi` agar auto-fix lewat `eslint --fix` — *dari code review #9*
- [ ] Evaluasi pola dual-render `<Cart>` (desktop + mobile di `POS.jsx`) — pertimbangkan ekstrak ke hook atau shared state yang lebih eksplisit agar perubahan di komponen Cart tidak mengejutkan — *dari code review #7*

---

### Fase 4 — Integrasi & PWA

Tujuan: jahit semua perubahan, test end-to-end, deploy sebagai PWA.

**PWA Setup:**
- [ ] Buat `public/manifest.json` dengan nama app, icon, warna tema
- [ ] Setup `vite-plugin-pwa` (Workbox) untuk service worker
- [ ] Test "Add to Home Screen" di Android Chrome
- [ ] Test "Install App" di Chrome Windows
- [ ] Pastikan Bluetooth printer tetap jalan di PWA context

**Testing sebelum deploy:**
- [ ] Test alur checkout end-to-end
- [ ] Test edit transaksi
- [ ] Test laporan semua date range
- [ ] Test di mobile (Android Chrome)
- [ ] Test di desktop (Chrome Windows)
- [ ] Test printer Bluetooth

**Deploy:**
- [ ] Vercel auto-deploy dari `git push` (sudah jalan)
- [ ] Pastikan environment variables di Vercel sudah benar
- [ ] Monitor Supabase logs setelah deploy

---

## Yang TIDAK diubah

Hal-hal berikut sudah jalan dan tidak perlu disentuh:

- Sistem autentikasi (Supabase Auth)
- Logika payment DP / partial payment
- Koneksi Bluetooth printer
- Struktur tabel utama (`transactions`, `transaction_items`, `products`, `employees`)
- Deployment pipeline Vercel

---

## Estimasi Waktu

| Fase | Estimasi | Catatan |
|---|---|---|
| Fase 1 (DB) | 1–2 hari | Tergantung berapa banyak stored proc yang ada |
| Fase 2 (Backend/Logic) | 2–3 hari | Bagian paling kritis, tidak boleh terburu-buru |
| Fase 3 (UI) | 2–3 hari | Banyak komponen tapi logikanya sederhana |
| Fase 4 (PWA + Testing) | 1–2 hari | PWA setup cepat, testing yang lama |
| **Total** | **~7–10 hari kerja** | Asumsi fokus, tidak ada interupsi client |

---

## Trigger Mulai

Mulai Fase 1 kalau sudah:

- [ ] Tidak ada komplain baru dari client selama minimal 3–5 hari
- [ ] Konfirmasi dari client soal pg_cron (hapus data lama)
- [ ] Keputusan final: apakah client mau versi Android (Capacitor) atau PWA cukup
