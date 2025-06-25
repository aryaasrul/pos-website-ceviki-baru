import { supabase } from './supabase'

export const transactionService = {
  async createTransaction(cartItems, cashierId, paymentDetails = {}) {
    try {
      // Prepare items for the stored procedure
      const itemsJson = cartItems.map(item => ({
        product_id: item.id,
        quantity: item.quantity,
        price: item.selling_price,
        discount: item.discount || 0
      }))

      // Call the stored procedure
      const { data, error } = await supabase.rpc('process_transaction', {
        p_items: itemsJson,
        p_cashier_id: cashierId,
        p_discount_amount: paymentDetails.discountAmount || 0,
        p_payment_method: paymentDetails.paymentMethod || 'cash',
        p_customer_name: paymentDetails.customerName || null,
        p_customer_phone: paymentDetails.customerPhone || null
      })

      if (error) throw error
      
      if (!data.success) {
        throw new Error(data.error || 'Transaction failed')
      }

      return data
    } catch (error) {
      console.error('Transaction error:', error)
      throw error
    }
  },

  async getTodayTransactions() {
    try {
      const today = new Date().toISOString().split('T')[0]
      
      const { data, error } = await supabase
        .from('v_transaction_summary')
        .select('*')
        .gte('transaction_date', today)
        .order('transaction_date', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching transactions:', error)
      throw error
    }
  },

  async getDailySales() {
    try {
      const today = new Date().toISOString().split('T')[0]
      
      const { data, error } = await supabase
        .from('v_daily_sales')
        .select('*')
        .eq('sales_date', today)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      
      return data || {
        total_transactions: 0,
        total_sales: 0,
        total_discount: 0,
        average_transaction: 0
      }
    } catch (error) {
      console.error('Error fetching daily sales:', error)
      throw error
    }
  }
}