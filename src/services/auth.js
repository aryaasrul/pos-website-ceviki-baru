import { supabase } from './supabase'

export const authService = {
  async login(email, password) {
    try {
      // Sign in with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      
      if (authError) throw authError
      
      // Get employee data
      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select('*')
        .eq('email', email)
        .single()
      
      if (employeeError) throw employeeError
      
      return {
        user: authData.user,
        employee: employee,
        session: authData.session
      }
    } catch (error) {
      console.error('Login error:', error)
      throw error
    }
  },

  async logout() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },

  async getCurrentSession() {
    const { data: { session } } = await supabase.auth.getSession()
    return session
  },

  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return null
    
    const { data: employee } = await supabase
      .from('employees')
      .select('*')
      .eq('id', user.id)
      .single()
    
    return { user, employee }
  },

  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback)
  }
}