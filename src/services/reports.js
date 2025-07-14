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
      // Get transactions dengan join yang specific
      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select(`
          id,
          transaction_number,
          transaction_date,
          total_amount,
          discount_amount,
          payment_method,
          cashier_id,
          payment_status
        `)
        .gte('transaction_date', startDate)
        .lte('transaction_date', endDate)
        .eq('payment_status', 'paid')
        .order('transaction_date', { ascending: false })

      if (txError) throw txError

      // Early return if no transactions
      if (!transactions || transactions.length === 0) {
        return {
          totalRevenue: 0,
          totalCost: 0,
          totalExpenses: 0,
          totalDiscount: 0,
          grossProfit: 0,
          netProfit: 0,
          profitPercentage: 0,
          totalTransactions: 0,
          totalExpenseCount: 0,
          totalProductsSold: 0,
          uniqueProducts: 0,
          chartData: [],
          topProducts: [],
          expenseBreakdown: [],
          transactions: [],
          expenses: []
        }
      }

      // Get transaction items separately
      const transactionIds = transactions.map(tx => tx.id)
      const { data: transactionItems, error: itemsError } = await supabase
        .from('transaction_items')
        .select(`
          transaction_id,
          quantity,
          unit_price,
          cost_price,
          discount_amount,
          subtotal,
          product_id
        `)
        .in('transaction_id', transactionIds)

      if (itemsError) throw itemsError

      // Get products for the items
      const productIds = [...new Set(transactionItems?.map(item => item.product_id) || [])]
      let products = []
      if (productIds.length > 0) {
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('id, name, sku')
          .in('id', productIds)

        if (productsError) throw productsError
        products = productsData || []
      }

      // Get employees/cashiers
      const cashierIds = [...new Set(transactions.map(tx => tx.cashier_id))]
      let employees = []
      if (cashierIds.length > 0) {
        const { data: employeesData, error: empError } = await supabase
          .from('employees')
          .select('id, name')
          .in('id', cashierIds)

        if (empError) throw empError
        employees = employeesData || []
      }

      // Get expenses
      const { data: expenses, error: expError } = await supabase
        .from('expenses')
        .select('*')
        .gte('expense_date', startDate)
        .lte('expense_date', endDate)
        .order('expense_date', { ascending: false })

      if (expError) throw expError

      // Create lookup maps
      const productMap = {}
      products.forEach(p => {
        productMap[p.id] = p
      })

      const employeeMap = {}
      employees.forEach(e => {
        employeeMap[e.id] = e
      })

      const itemsByTransaction = {}
      transactionItems?.forEach(item => {
        if (!itemsByTransaction[item.transaction_id]) {
          itemsByTransaction[item.transaction_id] = []
        }
        itemsByTransaction[item.transaction_id].push({
          ...item,
          product: productMap[item.product_id] || { id: item.product_id, name: 'Unknown Product', sku: '-' }
        })
      })

      // Merge data back together
      const enrichedTransactions = transactions.map(tx => ({
        ...tx,
        cashier: employeeMap[tx.cashier_id] || { id: tx.cashier_id, name: 'Unknown Cashier' },
        transaction_items: itemsByTransaction[tx.id] || []
      }))

      // Calculate summaries
      let totalRevenue = 0
      let totalCost = 0
      let totalDiscount = 0
      let totalProductsSold = 0
      const productStats = {}
      const dailyStats = {}

      enrichedTransactions.forEach(tx => {
        totalRevenue += tx.total_amount || 0
        totalDiscount += tx.discount_amount || 0

        // Format date for daily stats
        const date = new Date(tx.transaction_date).toISOString().split('T')[0]
        if (!dailyStats[date]) {
          dailyStats[date] = { revenue: 0, cost: 0, transactions: 0, expenses: 0 }
        }
        dailyStats[date].revenue += tx.total_amount || 0
        dailyStats[date].transactions += 1

        // Process items
        tx.transaction_items?.forEach(item => {
          const itemCost = (item.cost_price || 0) * (item.quantity || 0)
          totalCost += itemCost
          totalProductsSold += item.quantity || 0
          dailyStats[date].cost += itemCost

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
            productStats[productId].quantity += item.quantity || 0
            productStats[productId].revenue += item.subtotal || 0
            productStats[productId].cost += itemCost
            productStats[productId].profit = productStats[productId].revenue - productStats[productId].cost
          }
        })
      })

      // Calculate expense totals
      let totalExpenses = 0
      const expenseBreakdown = {}
      
      expenses?.forEach(expense => {
        totalExpenses += expense.amount || 0
        
        if (!expenseBreakdown[expense.category]) {
          expenseBreakdown[expense.category] = {
            category: expense.category,
            total: 0,
            count: 0
          }
        }
        expenseBreakdown[expense.category].total += expense.amount || 0
        expenseBreakdown[expense.category].count += 1

        // Add to daily stats
        const date = new Date(expense.expense_date).toISOString().split('T')[0]
        if (!dailyStats[date]) {
          dailyStats[date] = { revenue: 0, cost: 0, transactions: 0, expenses: 0 }
        }
        dailyStats[date].expenses += expense.amount || 0
      })

      // Calculate profit
      const grossProfit = totalRevenue - totalCost
      const netProfit = grossProfit - totalExpenses
      const profitPercentage = totalRevenue > 0 ? 
        ((netProfit / totalRevenue) * 100).toFixed(2) : 0

      // Prepare chart data
      const chartData = Object.entries(dailyStats)
        .map(([date, stats]) => ({
          date: new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
          revenue: stats.revenue,
          expenses: stats.expenses || 0,
          profit: stats.revenue - stats.cost - (stats.expenses || 0)
        }))
        .sort((a, b) => new Date(a.date) - new Date(b.date))

      // Get top products
      const topProducts = Object.values(productStats)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10)

      // Calculate expense percentages
      const expenseArray = Object.values(expenseBreakdown)
        .map(exp => ({
          ...exp,
          percentage: totalExpenses > 0 ? ((exp.total / totalExpenses) * 100).toFixed(1) : '0.0'
        }))
        .sort((a, b) => b.total - a.total)

      // Format transactions for display
      const formattedTransactions = enrichedTransactions.map(tx => ({
        id: tx.id,
        transaction_number: tx.transaction_number,
        transaction_date: tx.transaction_date,
        cashier_name: tx.cashier?.name || 'Unknown',
        total_items: tx.transaction_items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0,
        total_amount: tx.total_amount || 0,
        profit: tx.transaction_items?.reduce((sum, item) => 
          sum + (((item.unit_price || 0) - (item.cost_price || 0)) * (item.quantity || 0)), 0) || 0
      }))

      return {
        totalRevenue,
        totalCost,
        totalExpenses,
        totalDiscount,
        grossProfit,
        netProfit,
        profitPercentage,
        totalTransactions: enrichedTransactions.length,
        totalExpenseCount: expenses?.length || 0,
        totalProductsSold,
        uniqueProducts: Object.keys(productStats).length,
        chartData,
        topProducts,
        expenseBreakdown: expenseArray,
        transactions: formattedTransactions,
        expenses: expenses || []
      }
    } catch (error) {
      console.error('Error getting report data:', error)
      throw error
    }
  }
}