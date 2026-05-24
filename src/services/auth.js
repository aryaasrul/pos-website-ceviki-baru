import { supabase } from './supabase'
import { withTimeout } from '../utils/supabaseTimeout'

export const authService = {
  async login(email, password) {
    const { data: authData, error: authError } = await withTimeout(
      supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      })
    )

    if (authError) throw new Error(authError.message)
    if (!authData.user) throw new Error('Login gagal')

    const { data: employee, error: employeeError } = await withTimeout(
      supabase
        .from('employees')
        .select('*')
        .eq('id', authData.user.id)
        .eq('active', true)
        .single()
    )

    if (employeeError || !employee) {
      await supabase.auth.signOut()
      throw new Error('Data karyawan tidak ditemukan atau akun tidak aktif')
    }

    return { user: authData.user, employee, session: authData.session }
  },

  async logout() {
    const { error } = await withTimeout(supabase.auth.signOut())
    if (error) throw error
  },

  async getCurrentUser() {
    try {
      const { data: { user } } = await withTimeout(supabase.auth.getUser())
      if (!user) return null

      const { data: employee } = await withTimeout(
        supabase
          .from('employees')
          .select('*')
          .eq('id', user.id)
          .eq('active', true)
          .single()
      )

      if (!employee) return null

      return { user, employee }
    } catch {
      return null
    }
  },

  async checkSessionExists() {
    try {
      const { data } = await withTimeout(supabase.auth.getSession())
      return !!data?.session
    } catch {
      return null // null = tidak tahu (error)
    }
  },

  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback)
  },
}
