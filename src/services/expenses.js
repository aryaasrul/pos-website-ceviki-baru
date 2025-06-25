import { supabase } from './supabase'

export const expenseService = {
  async createExpense(expenseData) {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .insert({
          category: expenseData.category,
          amount: expenseData.amount,
          description: expenseData.description,
          created_by: expenseData.created_by,
          expense_date: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error creating expense:', error)
      throw error
    }
  },

  async getTodayExpenses() {
    try {
      const today = new Date().toISOString().split('T')[0]
      
      const { data, error } = await supabase
        .from('expenses')
        .select('*, employees(name)')
        .gte('expense_date', today)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching expenses:', error)
      throw error
    }
  },

  async getExpensesByDateRange(startDate, endDate) {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*, employees(name)')
        .gte('expense_date', startDate)
        .lte('expense_date', endDate)
        .order('expense_date', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching expenses:', error)
      throw error
    }
  }
}