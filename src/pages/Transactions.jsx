import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { transactionService } from '../services/transactions'
import { formatCurrency, formatDate } from '../utils/formatters'
import Header from '../components/layout/Header'
import toast from 'react-hot-toast'

const PAYMENT_STATUS_LABEL = {
  paid: { label: 'Lunas', class: 'bg-green-100 text-green-800' },
  partial: { label: 'DP/Cicilan', class: 'bg-yellow-100 text-yellow-800' },
  unpaid: { label: 'Belum Bayar', class: 'bg-red-100 text-red-800' },
  overpaid: { label: 'Lebih Bayar', class: 'bg-blue-100 text-blue-800' }
}

const PAYMENT_METHOD_LABEL = {
  cash: 'Tunai',
  transfer: 'Transfer',
  qris: 'QRIS',
  debit: 'Kartu Debit',
  credit: 'Kartu Kredit'
}

export default function Transactions() {
  const { employee, logout } = useAuth()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setDate(1)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  })
  const [selectedTransaction, setSelectedTransaction] = useState(null)
  const [detail, setDetail] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  const loadTransactions = useCallback(async () => {
    try {
      setLoading(true)
      const filters = {
        startDate: `${dateRange.startDate}T00:00:00`,
        endDate: `${dateRange.endDate}T23:59:59`
      }
      if (statusFilter) filters.payment_status = statusFilter
      const data = await transactionService.getTransactions(filters)
      setTransactions(data)
    } catch (error) {
      toast.error('Gagal memuat data transaksi')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [dateRange.startDate, dateRange.endDate, statusFilter])

  useEffect(() => {
    loadTransactions()
  }, [loadTransactions])

  const handleViewDetail = async (tx) => {
    setSelectedTransaction(tx)
    setLoadingDetail(true)
    try {
      const data = await transactionService.getTransactionDetail(tx.id)
      setDetail(data)
    } catch (error) {
      toast.error('Gagal memuat detail transaksi')
    } finally {
      setLoadingDetail(false)
    }
  }

  const filtered = transactions.filter(tx => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    return (
      (tx.transaction_number || '').toLowerCase().includes(term) ||
      (tx.customer_name || '').toLowerCase().includes(term) ||
      (tx.customer_phone || '').toLowerCase().includes(term)
    )
  })

  const totalRevenue = filtered.reduce((sum, tx) => sum + (tx.total_amount || 0), 0)
  const totalPaid = filtered.reduce((sum, tx) => sum + (tx.amount_paid || 0), 0)
  const totalUnpaid = filtered.reduce((sum, tx) => sum + (tx.remaining_balance || 0), 0)

  return (
    <div className="min-h-screen bg-gray-100">
      <Header employee={employee} onLogout={logout} />

      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Riwayat Transaksi</h1>
          <p className="text-gray-600">Semua transaksi penjualan</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-sm text-gray-500">Total Penjualan</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(totalRevenue)}</p>
            <p className="text-xs text-gray-500 mt-1">{filtered.length} transaksi</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-sm text-gray-500">Total Diterima</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(totalPaid)}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-sm text-gray-500">Total Piutang</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(totalUnpaid)}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-3">
            <input
              type="text"
              placeholder="Cari no. transaksi / nama / telepon..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <div className="flex gap-2">
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                className="px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <input
                type="date"
                value={dateRange.endDate}
                min={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                className="px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">Semua Status</option>
              <option value="paid">Lunas</option>
              <option value="partial">DP/Cicilan</option>
              <option value="unpaid">Belum Bayar</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-500 text-sm">Memuat transaksi...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No. Transaksi</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pelanggan</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kasir</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Metode</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Dibayar</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Detail</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="px-4 py-10 text-center text-gray-500">
                        Tidak ada transaksi ditemukan
                      </td>
                    </tr>
                  ) : (
                    filtered.map(tx => {
                      const statusInfo = PAYMENT_STATUS_LABEL[tx.payment_status] || { label: tx.payment_status, class: 'bg-gray-100 text-gray-700' }
                      return (
                        <tr key={tx.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-mono text-gray-900">{tx.transaction_number}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{formatDate(tx.transaction_date)}</td>
                          <td className="px-4 py-3 text-sm">
                            <div className="font-medium text-gray-900">{tx.customer_name || '-'}</div>
                            {tx.customer_phone && <div className="text-xs text-gray-500">{tx.customer_phone}</div>}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{tx.cashier_name || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {PAYMENT_METHOD_LABEL[tx.payment_method] || tx.payment_method || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                            {formatCurrency(tx.total_amount)}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-green-600">
                            {formatCurrency(tx.amount_paid)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusInfo.class}`}>
                              {statusInfo.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => handleViewDetail(tx)}
                              className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                            >
                              Lihat
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Detail Transaksi</h2>
                  <p className="text-sm text-gray-500 font-mono">{selectedTransaction.transaction_number}</p>
                </div>
                <button
                  onClick={() => { setSelectedTransaction(null); setDetail(null) }}
                  className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                >
                  ×
                </button>
              </div>

              {loadingDetail ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                </div>
              ) : detail ? (
                <>
                  <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                    <div>
                      <p className="text-gray-500">Tanggal</p>
                      <p className="font-medium">{formatDate(detail.transaction_date)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Kasir</p>
                      <p className="font-medium">{detail.cashier_name || '-'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Pelanggan</p>
                      <p className="font-medium">{detail.customer_name || '-'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Telepon</p>
                      <p className="font-medium">{detail.customer_phone || '-'}</p>
                    </div>
                    {detail.customer_address && (
                      <div className="col-span-2">
                        <p className="text-gray-500">Alamat</p>
                        <p className="font-medium">{detail.customer_address}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-gray-500">Metode Bayar</p>
                      <p className="font-medium">{PAYMENT_METHOD_LABEL[detail.payment_method] || detail.payment_method || '-'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Status</p>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${(PAYMENT_STATUS_LABEL[detail.payment_status] || {}).class || 'bg-gray-100 text-gray-700'}`}>
                        {(PAYMENT_STATUS_LABEL[detail.payment_status] || {}).label || detail.payment_status}
                      </span>
                    </div>
                  </div>

                  {detail.items && detail.items.length > 0 && (
                    <div className="mb-4">
                      <h3 className="font-semibold text-gray-700 mb-2">Item Pembelian</h3>
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Produk</th>
                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">Qty</th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Harga</th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {detail.items.map((item, idx) => (
                            <tr key={idx}>
                              <td className="px-3 py-2">
                                <div>{item.product?.name || '-'}</div>
                                {item.product?.sku && <div className="text-xs text-gray-400">{item.product.sku}</div>}
                              </td>
                              <td className="px-3 py-2 text-center">{item.quantity}</td>
                              <td className="px-3 py-2 text-right">{formatCurrency(item.unit_price || item.price)}</td>
                              <td className="px-3 py-2 text-right font-medium">{formatCurrency((item.unit_price || item.price) * item.quantity)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className="border-t pt-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total</span>
                      <span className="font-bold text-lg">{formatCurrency(detail.total_amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Dibayar</span>
                      <span className="text-green-600 font-medium">{formatCurrency(detail.amount_paid)}</span>
                    </div>
                    {(detail.remaining_balance || 0) > 0 && (
                      <div className="flex justify-between text-red-600">
                        <span>Sisa Tagihan</span>
                        <span className="font-bold">{formatCurrency(detail.remaining_balance)}</span>
                      </div>
                    )}
                    {detail.notes && (
                      <div className="pt-2">
                        <span className="text-gray-500">Catatan: </span>
                        <span>{detail.notes}</span>
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
