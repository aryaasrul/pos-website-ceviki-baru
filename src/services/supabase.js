import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
  db: { schema: 'public' },
})

export const handleSupabaseError = (error) => {
  switch (error?.code) {
    case 'PGRST301': return 'Data tidak ditemukan'
    case 'PGRST116': return 'Tidak ada data yang cocok'
    case '23505': return 'Data sudah ada (duplikasi)'
    case '23503': return 'Data terkait tidak ditemukan'
    case '42501': return 'Akses ditolak'
    case 'PGRST102': return 'Tabel atau kolom tidak ditemukan'
    default: return error?.message || 'Terjadi kesalahan pada database'
  }
}

export default supabase
