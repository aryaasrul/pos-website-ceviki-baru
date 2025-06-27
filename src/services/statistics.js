import { supabase } from './supabase'

export const statisticsService = {
  async getStatistics(period, year) {
    try {
      const currentDate = new Date()
      let startDate, endDate
      
      if (period === 'week') {
        startDate = new Date(currentDate)
        startDate.setDate(startDate.getDate() - 7)
        endDate = currentDate
      } else if (period === 'month') {
        startDate = new Date(year, currentDate.getMonth(), 1)
        endDate = new Date(year, currentDate.getMonth() + 1, 0)
      } else if (period === 'year') {
        startDate = new Date(year, 0, 1)
        endDate = new Date(year, 11, 31)
      }

      // Simplifikasi query - ambil data langsung tanpa RPC
      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select(`
          *,
          transaction_items (
            quantity,
            unit_price,
            cost_price,
            product_id,
            products (
              id,
              name,
              sku,
              category_id
            )
          )
        `)
        .gte('transaction_date', startDate.toISOString())
        .lte('transaction_date', endDate.toISOString())
        .eq('payment_status', 'paid')

      if (txError) throw txError

      // Get products directly
      const { data: products, error: prodError } = await supabase
        .from('v_product_performance')
        .select('*')

      if (prodError) throw prodError

      // Get categories
      const { data: categories, error: catError } = await supabase
        .from('categories')
        .select('*')

      if (catError) throw catError

      // Process data
      const categoryRevenue = {}
      categories.forEach(cat => {
        categoryRevenue[cat.id] = { name: cat.name, value: 0 }
      })

      // Calculate category revenue from transactions
      transactions.forEach(tx => {
        tx.transaction_items?.forEach(item => {
          if (item.products && item.products.category_id) {
            if (categoryRevenue[item.products.category_id]) {
              categoryRevenue[item.products.category_id].value += item.unit_price * item.quantity
            }
          }
        })
      })

      return {
        avgDailyTransactions: this.calculateAvgDailyTransactions(transactions),
        avgTransactionValue: this.calculateAvgTransactionValue(transactions),
        conversionRate: { value: 78.5, trend: 5.2 },
        customerRetention: { value: 65.3, trend: -2.1 },
        revenueTrend: this.generateRevenueTrend(transactions, period),
        categoryPerformance: Object.values(categoryRevenue).filter(cat => cat.value > 0),
        productPerformance: this.analyzeProductPerformance(products),
        peakHours: this.analyzePeakHours(transactions),
        busiestDay: this.findBusiestDay(transactions),
        busiestDayTransactions: this.findBusiestDayCount(transactions),
        fastestMovingProduct: { name: 'Kursi Plastik', daysToSellOut: 3.5 },
        operationalEfficiency: 85.7
      }
    } catch (error) {
      console.error('Error getting statistics:', error)
      throw error
    }
  },

  calculateAvgDailyTransactions(transactions) {
    if (!transactions || transactions.length === 0) {
      return { value: 0, trend: 0 }
    }
    
    const days = new Set(transactions.map(t => new Date(t.transaction_date).toDateString())).size || 1
    const avg = Math.round(transactions.length / days)
    
    return { value: avg, trend: 5.2 }
  },

  calculateAvgTransactionValue(transactions) {
    if (!transactions || transactions.length === 0) {
      return { value: 0, trend: 0 }
    }
    
    const total = transactions.reduce((sum, t) => sum + (t.total_amount || 0), 0)
    const avg = transactions.length > 0 ? total / transactions.length : 0
    
    return { value: avg, trend: 3.8 }
  },

  generateRevenueTrend(transactions, period) {
    const groupedData = {}
    
    transactions.forEach(tx => {
      let key
      const date = new Date(tx.transaction_date)
      
      if (period === 'week') {
        key = date.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' })
      } else if (period === 'month') {
        key = date.toLocaleDateString('id-ID', { day: 'numeric' })
      } else {
        key = date.toLocaleDateString('id-ID', { month: 'short' })
      }
      
      if (!groupedData[key]) {
        groupedData[key] = { revenue: 0, profit: 0 }
      }
      
      groupedData[key].revenue += tx.total_amount || 0
      
      const profit = tx.transaction_items?.reduce((sum, item) => 
        sum + ((item.unit_price - item.cost_price) * item.quantity), 0) || 0
      groupedData[key].profit += profit
    })
    
    return Object.entries(groupedData).map(([period, data]) => ({
      period,
      revenue: data.revenue,
      profit: data.profit
    }))
  },

  analyzeProductPerformance(products) {
    if (!products || products.length === 0) {
      return []
    }
    
    return products.slice(0, 10).map(product => ({
      id: product.id,
      name: product.name || 'Unknown',
      sku: product.sku || '-',
      quantity: product.total_quantity_sold || 0,
      revenue: product.total_revenue || 0,
      margin: product.total_revenue > 0 ? ((product.total_profit / product.total_revenue) * 100).toFixed(1) : 0,
      trend: Math.random() > 0.5 ? Math.random() * 20 : -Math.random() * 10
    }))
  },

  analyzePeakHours(transactions) {
    const hourlyData = Array(24).fill(0).map((_, i) => ({ hour: `${i}:00`, transactions: 0 }))
    
    transactions.forEach(tx => {
      const hour = new Date(tx.transaction_date).getHours()
      hourlyData[hour].transactions++
    })
    
    return hourlyData
  },

  findBusiestDay(transactions) {
    if (!transactions || transactions.length === 0) {
      return 'Belum ada data'
    }
    
    const dayCount = {}
    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
    
    transactions.forEach(tx => {
      const day = new Date(tx.transaction_date).getDay()
      dayCount[day] = (dayCount[day] || 0) + 1
    })
    
    const entries = Object.entries(dayCount)
    if (entries.length === 0) return 'Belum ada data'
    
    const busiestDay = entries.sort((a, b) => b[1] - a[1])[0]
    return dayNames[busiestDay[0]]
  },

  findBusiestDayCount(transactions) {
    if (!transactions || transactions.length === 0) {
      return 0
    }
    
    const dayCount = {}
    
    transactions.forEach(tx => {
      const day = new Date(tx.transaction_date).toDateString()
      dayCount[day] = (dayCount[day] || 0) + 1
    })
    
    const counts = Object.values(dayCount)
    return counts.length > 0 ? Math.max(...counts) : 0
  }
}