import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { transactionService } from '../services/transactions'
import { formatCurrency } from '../utils/formatters'
import Header from '../components/layout/Header'
import toast from 'react-hot-toast'

export default function Dashboard() {
  const { employee, logout } = useAuth()
  const [dailySales, setDailySales] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      const [salesData, transactionsData] = await Promise.all([
        transactionService.getDailySales(),
        transactionService.getTodayTransactions()
      ])
      
      setDailySales(salesData)
      setTransactions(transactionsData)
    } catch (error) {
      toast.error('Gagal memuat data dashboard')
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
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Header employee={employee} onLogout={logout} />
      
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Total Transaksi</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {dailySales?.total_transactions || 0}
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Total Penjualan</h3>
            <p className="text-3xl font-bold text-green-600 mt-2">
              {formatCurrency(dailySales?.total_sales || 0)}
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Total Diskon</h3>
            <p className="text-3xl font-bold text-red-600 mt-2">
              {formatCurrency(dailySales?.total_discount || 0)}
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Rata-rata Transaksi</h3>
            <p className="text-3xl font-bold text-blue-600 mt-2">
              {formatCurrency(dailySales?.average_transaction || 0)}
            </p>
          </div>
        </div>
        
        {/* Recent Transactions */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-lg font-bold">Transaksi Hari Ini</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    No. Transaksi
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Waktu
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kasir
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Items
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                      Belum ada transaksi hari ini
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => (
                    <tr key={tx.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {tx.transaction_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(tx.transaction_date).toLocaleTimeString('id-ID')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {tx.cashier_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {tx.total_items} items
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {formatCurrency(tx.net_total)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Navigation Buttons */}
        <div className="mt-6 flex gap-4">
          <button
            onClick={() => window.location.href = '/pos'}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Ke POS
          </button>
          <button
            onClick={() => window.location.href = '/products'}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Kelola Produk
          </button>
        </div>
      </div>
    </div>
  )
}