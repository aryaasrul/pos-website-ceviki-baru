import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { reportService } from '../services/reports'
import { formatCurrency, formatDate } from '../utils/formatters'
import Header from '../components/layout/Header'
import toast from 'react-hot-toast'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

export default function Reports() {
  const { employee, logout } = useAuth()
  const [activeTab, setActiveTab] = useState('daily')
  const [dateRange, setDateRange] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  })
  const [reportData, setReportData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [transactions, setTransactions] = useState([])
  const [expenses, setExpenses] = useState([])

  useEffect(() => {
    handleGenerateReport()
  }, [activeTab, dateRange])

  const handleGenerateReport = async () => {
    try {
      setLoading(true)
      let data = null
      
      switch (activeTab) {
        case 'daily':
          data = await reportService.getDailyReport(dateRange.startDate)
          break
        case 'weekly':
          data = await reportService.getWeeklyReport(dateRange.startDate)
          break
        case 'monthly':
          data = await reportService.getMonthlyReport(dateRange.startDate)
          break
        case 'custom':
          data = await reportService.getCustomReport(dateRange.startDate, dateRange.endDate)
          break
      }
      
      setReportData(data)
      setTransactions(data.transactions || [])
      setExpenses(data.expenses || [])
    } catch (error) {
      toast.error('Gagal memuat laporan')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleDateChange = (field, value) => {
    setDateRange(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleExportPDF = () => {
    toast.success('Fitur export PDF akan segera hadir')
  }

  const handleExportExcel = () => {
    toast.success('Fitur export Excel akan segera hadir')
  }

  const calculateProfit = () => {
    if (!reportData) return 0
    return reportData.totalRevenue - reportData.totalCost - reportData.totalExpenses
  }

  const calculateMargin = () => {
    if (!reportData || reportData.totalRevenue === 0) return 0
    return ((reportData.totalRevenue - reportData.totalCost) / reportData.totalRevenue * 100).toFixed(2)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading laporan...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Header employee={employee} onLogout={logout} />
      
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Laporan</h1>
          <p className="text-gray-600">Analisis performa bisnis Anda</p>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b">
            <nav className="flex flex-wrap">
              {['daily', 'weekly', 'monthly', 'custom'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 md:px-6 py-3 text-sm md:text-base font-medium border-b-2 transition-colors ${
                    activeTab === tab
                      ? 'text-blue-600 border-blue-600'
                      : 'text-gray-500 border-transparent hover:text-gray-700'
                  }`}
                >
                  {tab === 'daily' && 'Harian'}
                  {tab === 'weekly' && 'Mingguan'}
                  {tab === 'monthly' && 'Bulanan'}
                  {tab === 'custom' && 'Custom'}
                </button>
              ))}
            </nav>
          </div>
          
          {/* Date Selector */}
          <div className="p-4">
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {activeTab === 'custom' ? 'Tanggal Mulai' : 'Pilih Tanggal'}
                </label>
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => handleDateChange('startDate', e.target.value)}
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              {activeTab === 'custom' && (
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tanggal Akhir
                  </label>
                  <input
                    type="date"
                    value={dateRange.endDate}
                    onChange={(e) => handleDateChange('endDate', e.target.value)}
                    min={dateRange.startDate}
                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
              
              <div className="flex gap-2">
                <button
                  onClick={handleExportPDF}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium"
                >
                  Export PDF
                </button>
                <button
                  onClick={handleExportExcel}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium"
                >
                  Export Excel
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        {reportData && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
              <div className="bg-white p-4 rounded-lg shadow">
                <p className="text-sm font-medium text-gray-500">Total Penjualan</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {formatCurrency(reportData.totalRevenue || 0)}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  {reportData.totalTransactions || 0} transaksi
                </p>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow">
                <p className="text-sm font-medium text-gray-500">Total HPP</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {formatCurrency(reportData.totalCost || 0)}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Margin: {calculateMargin()}%
                </p>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow">
                <p className="text-sm font-medium text-gray-500">Total Pengeluaran</p>
                <p className="text-2xl font-bold text-red-600 mt-1">
                  {formatCurrency(reportData.totalExpenses || 0)}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  {reportData.totalExpenseCount || 0} transaksi
                </p>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow">
                <p className="text-sm font-medium text-gray-500">Laba Bersih</p>
                <p className={`text-2xl font-bold mt-1 ${calculateProfit() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(calculateProfit())}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  {reportData.profitPercentage || 0}% dari penjualan
                </p>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow">
                <p className="text-sm font-medium text-gray-500">Produk Terjual</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">
                  {reportData.totalProductsSold || 0}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  {reportData.uniqueProducts || 0} jenis produk
                </p>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Revenue Chart */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-4">Grafik Penjualan vs Pengeluaran</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reportData.chartData || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(1)}jt`} />
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Legend />
                      <Bar dataKey="revenue" fill="#3B82F6" name="Penjualan" />
                      <Bar dataKey="expenses" fill="#EF4444" name="Pengeluaran" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Profit Trend Chart */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-4">Trend Laba</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={reportData.chartData || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(1)}jt`} />
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Line 
                        type="monotone" 
                        dataKey="profit" 
                        stroke="#10B981" 
                        strokeWidth={2}
                        name="Laba Bersih"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Transaction Table */}
            <div className="bg-white rounded-lg shadow mb-6">
              <div className="p-4 border-b">
                <h3 className="text-lg font-semibold">Detail Transaksi</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">No. Transaksi</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tanggal</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kasir</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Items</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Laba</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm">{tx.transaction_number}</td>
                        <td className="px-4 py-3 text-sm">{formatDate(tx.transaction_date)}</td>
                        <td className="px-4 py-3 text-sm">{tx.cashier_name}</td>
                        <td className="px-4 py-3 text-sm text-center">{tx.total_items}</td>
                        <td className="px-4 py-3 text-sm text-right font-medium">
                          {formatCurrency(tx.total_amount)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-medium text-green-600">
                          {formatCurrency(tx.profit || 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Top Products */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Best Selling Products */}
              <div className="bg-white rounded-lg shadow">
                <div className="p-4 border-b">
                  <h3 className="text-lg font-semibold">Produk Terlaris</h3>
                </div>
                <div className="p-4">
                  <div className="space-y-3">
                    {reportData.topProducts?.map((product, index) => (
                      <div key={product.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold text-gray-400">#{index + 1}</span>
                          <div>
                            <p className="font-medium">{product.name}</p>
                            <p className="text-sm text-gray-500">{product.quantity} terjual</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(product.revenue)}</p>
                          <p className="text-sm text-green-600">Laba: {formatCurrency(product.profit)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Expense Breakdown */}
              <div className="bg-white rounded-lg shadow">
                <div className="p-4 border-b">
                  <h3 className="text-lg font-semibold">Breakdown Pengeluaran</h3>
                </div>
                <div className="p-4">
                  <div className="space-y-3">
                    {reportData.expenseBreakdown?.map((expense) => (
                      <div key={expense.category} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium capitalize">{expense.category}</p>
                          <p className="text-sm text-gray-500">{expense.count} transaksi</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-red-600">{formatCurrency(expense.total)}</p>
                          <p className="text-sm text-gray-500">{expense.percentage}%</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}