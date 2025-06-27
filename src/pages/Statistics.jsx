import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { statisticsService } from '../services/statistics'
import { formatCurrency } from '../utils/formatters'
import Header from '../components/layout/Header'
import toast from 'react-hot-toast'
import { 
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts'

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316']

export default function Statistics() {
  const { employee, logout } = useAuth()
  const [period, setPeriod] = useState('month')
  const [year, setYear] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(true)
  const [statistics, setStatistics] = useState(null)

  useEffect(() => {
    loadStatistics()
  }, [period, year])

  const loadStatistics = async () => {
    try {
      setLoading(true)
      const data = await statisticsService.getStatistics(period, year)
      setStatistics(data)
    } catch (error) {
      toast.error('Gagal memuat statistik')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading statistik...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Header employee={employee} onLogout={logout} />
      
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Statistik</h1>
            <p className="text-gray-600">Analisis mendalam performa toko</p>
          </div>
          
          <div className="flex gap-3">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="week">Mingguan</option>
              <option value="month">Bulanan</option>
              <option value="year">Tahunan</option>
            </select>
            
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {[2024, 2025, 2026].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {statistics && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-500">Rata-rata Transaksi/Hari</p>
                  <span className={`text-sm ${statistics.avgDailyTransactions.trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {statistics.avgDailyTransactions.trend > 0 ? '↑' : '↓'} {Math.abs(statistics.avgDailyTransactions.trend)}%
                  </span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{statistics.avgDailyTransactions.value}</p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-500">Nilai Rata-rata/Transaksi</p>
                  <span className={`text-sm ${statistics.avgTransactionValue.trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {statistics.avgTransactionValue.trend > 0 ? '↑' : '↓'} {Math.abs(statistics.avgTransactionValue.trend)}%
                  </span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(statistics.avgTransactionValue.value)}</p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-500">Tingkat Konversi</p>
                  <span className={`text-sm ${statistics.conversionRate.trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {statistics.conversionRate.trend > 0 ? '↑' : '↓'} {Math.abs(statistics.conversionRate.trend)}%
                  </span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{statistics.conversionRate.value}%</p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-500">Customer Retention</p>
                  <span className={`text-sm ${statistics.customerRetention.trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {statistics.customerRetention.trend > 0 ? '↑' : '↓'} {Math.abs(statistics.customerRetention.trend)}%
                  </span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{statistics.customerRetention.value}%</p>
              </div>
            </div>

            {/* Revenue Trend */}
            <div className="bg-white p-6 rounded-lg shadow mb-6">
              <h3 className="text-lg font-semibold mb-4">Trend Pendapatan</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={statistics.revenueTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(0)}jt`} />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Area type="monotone" dataKey="revenue" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} />
                    <Area type="monotone" dataKey="profit" stroke="#10B981" fill="#10B981" fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Category Performance */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-4">Performa per Kategori</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statistics.categoryPerformance}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {statistics.categoryPerformance.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Peak Hours */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-4">Jam Sibuk</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={statistics.peakHours}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="hour" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="transactions" stroke="#3B82F6" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Product Performance Table */}
            <div className="bg-white rounded-lg shadow mb-6">
              <div className="p-4 border-b">
                <h3 className="text-lg font-semibold">Performa Produk</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produk</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Terjual</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Pendapatan</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Margin</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Trend</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {statistics.productPerformance.map((product) => (
                      <tr key={product.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-sm font-medium">{product.name}</p>
                            <p className="text-xs text-gray-500">{product.sku}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center text-sm">{product.quantity}</td>
                        <td className="px-4 py-3 text-right text-sm font-medium">
                          {formatCurrency(product.revenue)}
                        </td>
                        <td className="px-4 py-3 text-right text-sm">
                          <span className={`font-medium ${product.margin < 20 ? 'text-red-600' : 'text-green-600'}`}>
                            {product.margin}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-sm ${product.trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {product.trend > 0 ? '↑' : '↓'} {Math.abs(product.trend)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Additional Insights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-6 rounded-lg shadow">
                <h4 className="font-semibold mb-3">Hari Tersibuk</h4>
                <p className="text-2xl font-bold text-blue-600">{statistics.busiestDay}</p>
                <p className="text-sm text-gray-500 mt-1">Rata-rata {statistics.busiestDayTransactions} transaksi</p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow">
                <h4 className="font-semibold mb-3">Produk Tercepat Habis</h4>
                <p className="text-lg font-bold">{statistics.fastestMovingProduct.name}</p>
                <p className="text-sm text-gray-500 mt-1">Rata-rata {statistics.fastestMovingProduct.daysToSellOut} hari habis</p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow">
                <h4 className="font-semibold mb-3">Efisiensi Operasional</h4>
                <p className="text-2xl font-bold text-green-600">{statistics.operationalEfficiency}%</p>
                <p className="text-sm text-gray-500 mt-1">Rasio biaya terhadap pendapatan</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}