import { supabase } from './supabase'

export const reportService = {
  async getDailyReport(date) {
    try {
      const startDate = new Date(date)
      startDate.setHours(0, 0, 0, 0)
      const endDate = new Date(date)
      endDate.setHours(23, 59, 59, 999)

      return this.getReportData(startDate.toISOString(), endDate.toISOString())
    } catch (error) {
      console.error('Error getting daily report:', error)
      throw error
    }
  },

  async getWeeklyReport(date) {
    try {
      const startDate = new Date(date)
      const dayOfWeek = startDate.getDay()
      startDate.setDate(startDate.getDate() - dayOfWeek) // Start of week (Sunday)
      startDate.setHours(0, 0, 0, 0)
      
      const endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + 6) // End of week (Saturday)
      endDate.setHours(23, 59, 59, 999)

      return this.getReportData(startDate.toISOString(), endDate.toISOString())
    } catch (error) {
      console.error('Error getting weekly report:', error)
      throw error
    }
  },

  async getMonthlyReport(date) {
    try {
      const startDate = new Date(date)
      startDate.setDate(1)
      startDate.setHours(0, 0, 0, 0)
      
      const endDate = new Date(startDate)
      endDate.setMonth(endDate.getMonth() + 1)
      endDate.setDate(0) // Last day of month
      endDate.setHours(23, 59, 59, 999)

      return this.getReportData(startDate.toISOString(), endDate.toISOString())
    } catch (error) {
      console.error('Error getting monthly report:', error)
      throw error
    }
  },

  async getCustomReport(startDate, endDate) {
    try {
      const start = new Date(startDate)
      start.setHours(0, 0, 0, 0)
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)

      return this.getReportData(start.toISOString(), end.toISOString())
    } catch (error) {
      console.error('Error getting custom report:', error)
      throw error
    }
  },

  async getReportData(startDate, endDate) {
    try {
      // Get transactions
      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select(`
          *,
          transaction_items (
            quantity,
            unit_price,
            cost_price,
            discount_amount,
            subtotal,
            product:products (
              id,
              name,
              sku
            )
          ),
          cashier:employees (
            name
          )
        `)
        .gte('transaction_date', startDate)
        .lte('transaction_date', endDate)
        .eq('payment_status', 'paid')
        .order('transaction_date', { ascending: false })

      if (txError) throw txError

      // Get expenses
      const { data: expenses, error: expError } = await supabase
        .from('expenses')
        .select('*')
        .gte('expense_date', startDate)
        .lte('expense_date', endDate)
        .order('expense_date', { ascending: false })

      if (expError) throw expError

      // Calculate summaries
      let totalRevenue = 0
      let totalCost = 0
      let totalDiscount = 0
      let totalProductsSold = 0
      const productStats = {}
      const dailyStats = {}

      transactions.forEach(tx => {
        totalRevenue += tx.total_amount
        totalDiscount += tx.discount_amount || 0

        // Format date for daily stats
        const date = new Date(tx.transaction_date).toISOString().split('T')[0]
        if (!dailyStats[date]) {
          dailyStats[date] = { revenue: 0, cost: 0, transactions: 0 }
        }
        dailyStats[date].revenue += tx.total_amount
        dailyStats[date].transactions += 1

        // Process items
        tx.transaction_items?.forEach(item => {
          totalCost += (item.cost_price * item.quantity)
          totalProductsSold += item.quantity
          dailyStats[date].cost += (item.cost_price * item.quantity)

          // Track product stats
          if (item.product) {
            const productId = item.product.id
            if (!productStats[productId]) {
              productStats[productId] = {
                id: productId,
                name: item.product.name,
                sku: item.product.sku,
                quantity: 0,
                revenue: 0,
                cost: 0,
                profit: 0
              }
            }
            productStats[productId].quantity += item.quantity
            productStats[productId].revenue += item.subtotal
            productStats[productId].cost += (item.cost_price * item.quantity)
            productStats[productId].profit = productStats[productId].revenue - productStats[productId].cost
          }
        })
      })

      // Calculate expense totals
      let totalExpenses = 0
      const expenseBreakdown = {}
      
      expenses.forEach(expense => {
        totalExpenses += expense.amount
        
        if (!expenseBreakdown[expense.category]) {
          expenseBreakdown[expense.category] = {
            category: expense.category,
            total: 0,
            count: 0
          }
        }
        expenseBreakdown[expense.category].total += expense.amount
        expenseBreakdown[expense.category].count += 1

        // Add to daily stats
        const date = new Date(expense.expense_date).toISOString().split('T')[0]
        if (!dailyStats[date]) {
          dailyStats[date] = { revenue: 0, cost: 0, transactions: 0 }
        }
        if (!dailyStats[date].expenses) dailyStats[date].expenses = 0
        dailyStats[date].expenses += expense.amount
      })

      // Calculate profit
      const grossProfit = totalRevenue - totalCost
      const netProfit = grossProfit - totalExpenses
      const profitPercentage = totalRevenue > 0 ? (netProfit / totalRevenue * 100).toFixed(2) : 0

      // Prepare chart data
      const chartData = Object.entries(dailyStats).map(([date, stats]) => ({
        date: new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
        revenue: stats.revenue,
        expenses: stats.expenses || 0,
        profit: stats.revenue - stats.cost - (stats.expenses || 0)
      }))

      // Get top products
      const topProducts = Object.values(productStats)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10)

      // Calculate expense percentages
      const expenseArray = Object.values(expenseBreakdown).map(exp => ({
        ...exp,
        percentage: ((exp.total / totalExpenses) * 100).toFixed(1)
      })).sort((a, b) => b.total - a.total)

      // Format transactions for display
      const formattedTransactions = transactions.map(tx => ({
        id: tx.id,
        transaction_number: tx.transaction_number,
        transaction_date: tx.transaction_date,
        cashier_name: tx.cashier?.name || 'Unknown',
        total_items: tx.transaction_items?.reduce((sum, item) => sum + item.quantity, 0) || 0,
        total_amount: tx.total_amount,
        profit: tx.transaction_items?.reduce((sum, item) => 
          sum + ((item.unit_price - item.cost_price) * item.quantity), 0) || 0
      }))

      return {
        totalRevenue,
        totalCost,
        totalExpenses,
        totalDiscount,
        grossProfit,
        netProfit,
        profitPercentage,
        totalTransactions: transactions.length,
        totalExpenseCount: expenses.length,
        totalProductsSold,
        uniqueProducts: Object.keys(productStats).length,
        chartData,
        topProducts,
        expenseBreakdown: expenseArray,
        transactions: formattedTransactions,
        expenses
      }
    } catch (error) {
      console.error('Error getting report data:', error)
      throw error
    }
  }
}