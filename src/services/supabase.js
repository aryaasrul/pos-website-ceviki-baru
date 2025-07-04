import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  // Dalam production, environment variables harus ada
  if (import.meta.env.PROD) {
    throw new Error('Missing Supabase environment variables. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your deployment settings.')
  } else {
    // Dalam development, berikan pesan yang lebih informatif
    console.error('Missing Supabase environment variables. Please create .env.local file with:')
    console.error('VITE_SUPABASE_URL=your-supabase-url')
    console.error('VITE_SUPABASE_ANON_KEY=your-supabase-anon-key')
    throw new Error('Missing Supabase environment variables')
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)