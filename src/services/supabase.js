import { createClient } from '@supabase/supabase-js'

// Environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Validasi environment variables
const validateEnvVariables = () => {
  const missing = []
  
  if (!supabaseUrl) missing.push('VITE_SUPABASE_URL')
  if (!supabaseAnonKey) missing.push('VITE_SUPABASE_ANON_KEY')
  
  if (missing.length > 0) {
    const errorMessage = `Missing required environment variables: ${missing.join(', ')}`
    
    if (import.meta.env.PROD) {
      // Dalam production, throw error
      throw new Error(`${errorMessage}. Please configure these variables in your deployment settings.`)
    } else {
      // Dalam development, berikan pesan yang lebih informatif
      console.error('❌ Missing Supabase environment variables!')
      console.error('Please create a .env.local file in your project root with:')
      console.error('VITE_SUPABASE_URL=your-supabase-project-url')
      console.error('VITE_SUPABASE_ANON_KEY=your-supabase-anon-key')
      console.error('')
      console.error('You can find these values in your Supabase project settings:')
      console.error('https://app.supabase.com/project/[your-project]/settings/api')
      
      throw new Error(errorMessage)
    }
  }
}

// Validasi environment variables
try {
  validateEnvVariables()
} catch (error) {
  console.error('Supabase configuration error:', error.message)
  throw error
}

// Konfigurasi Supabase client
const supabaseConfig = {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  },
  global: {
    headers: {
      'x-client-info': 'pos-toko@1.0.0'
    }
  },
  db: {
    schema: 'public'
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
}

// Buat Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, supabaseConfig)

// Helper functions untuk debugging
export const supabaseHelpers = {
  /**
   * Check connection ke Supabase
   */
  async checkConnection() {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('count')
        .limit(1)
      
      if (error) {
        console.error('Supabase connection error:', error)
        return { connected: false, error: error.message }
      }
      
      return { connected: true, data }
    } catch (error) {
      console.error('Supabase connection check failed:', error)
      return { connected: false, error: error.message }
    }
  },

  /**
   * Get current session info
   */
  async getSessionInfo() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        return { session: null, error: error.message }
      }
      
      return { 
        session,
        user: session?.user || null,
        isAuthenticated: !!session,
        expiresAt: session?.expires_at ? new Date(session.expires_at * 1000) : null
      }
    } catch (error) {
      return { session: null, error: error.message }
    }
  },

  /**
   * Test database query
   */
  async testQuery(table = 'employees') {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
      
      if (error) {
        return { success: false, error: error.message }
      }
      
      return { success: true, count }
    } catch (error) {
      return { success: false, error: error.message }
    }
  },

  /**
   * Get Supabase project info
   */
  getProjectInfo() {
    const url = new URL(supabaseUrl)
    const projectRef = url.hostname.split('.')[0]
    
    return {
      url: supabaseUrl,
      projectRef,
      region: url.hostname.includes('supabase.co') ? 'US East' : 'Unknown',
      hasValidConfig: !!(supabaseUrl && supabaseAnonKey)
    }
  }
}

// Error handler untuk Supabase
export const handleSupabaseError = (error, context = '') => {
  console.error(`Supabase error ${context}:`, error)
  
  // Handle specific error types
  switch (error?.code) {
    case 'PGRST301':
      return 'Data tidak ditemukan'
    case 'PGRST116':
      return 'Tidak ada data yang cocok'
    case '23505':
      return 'Data sudah ada (duplikasi)'
    case '23503':
      return 'Data terkait tidak ditemukan'
    case '42501':
      return 'Akses ditolak'
    case 'PGRST102':
      return 'Tabel atau kolom tidak ditemukan'
    default:
      return error?.message || 'Terjadi kesalahan pada database'
  }
}

// Database connection monitor
let connectionMonitor = null

export const startConnectionMonitor = () => {
  if (connectionMonitor) return
  
  connectionMonitor = setInterval(async () => {
    const { connected } = await supabaseHelpers.checkConnection()
    if (!connected) {
      console.warn('Supabase connection lost, attempting to reconnect...')
    }
  }, 30000) // Check every 30 seconds
}

export const stopConnectionMonitor = () => {
  if (connectionMonitor) {
    clearInterval(connectionMonitor)
    connectionMonitor = null
  }
}

// Export default
export default supabase

// Log configuration in development
if (import.meta.env.DEV) {
  console.log('🚀 Supabase configured:', supabaseHelpers.getProjectInfo())
}