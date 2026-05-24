/**
 * Utility untuk menambahkan timeout ke setiap operasi Supabase.
 * Mencegah loading forever saat RLS reject, session expired, atau network issue.
 */
const DEFAULT_TIMEOUT = 15000 // 15 detik

export async function withTimeout(promise, ms = DEFAULT_TIMEOUT) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Koneksi timeout. Periksa internet Anda.')), ms)
    ),
  ])
}

export default withTimeout