import { supabase } from './supabase'

export const employeeService = {
  async getEmployees() {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching employees:', error)
      throw error
    }
  },

  async createEmployee(employeeData) {
    try {
      // Create auth user first
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: employeeData.email,
        password: employeeData.password,
        email_confirm: true
      })

      if (authError) throw authError

      // Then create employee record
      const { data, error } = await supabase
        .from('employees')
        .insert({
          id: authData.user.id,
          email: employeeData.email,
          name: employeeData.name,
          role: employeeData.role,
          phone: employeeData.phone,
          active: true
        })
        .select()
        .single()

      if (error) {
        // Rollback auth user if employee creation fails
        await supabase.auth.admin.deleteUser(authData.user.id)
        throw error
      }

      return data
    } catch (error) {
      console.error('Error creating employee:', error)
      throw error
    }
  },

  async updateEmployee(id, updates) {
    try {
      const { data, error } = await supabase
        .from('employees')
        .update({
          name: updates.name,
          role: updates.role,
          phone: updates.phone,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error updating employee:', error)
      throw error
    }
  },

  async updateEmployeeStatus(id, active) {
    try {
      const { data, error } = await supabase
        .from('employees')
        .update({ 
          active,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error updating employee status:', error)
      throw error
    }
  }
}