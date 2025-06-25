import React, { useState } from 'react'
import { formatCurrency } from '../../utils/formatters'
import toast from 'react-hot-toast'

export default function CheckoutModal({ cart, onConfirm, onClose }) {
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [discountAmount, setDiscountAmount] = useState(0)
  const [loading, setLoading] = useState(false)

  const subtotal = cart.reduce((sum, item) => sum + (item.selling_price * item.quantity), 0)
  const total = subtotal - discountAmount

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (discountAmount > subtotal) {
      toast.error('Diskon tidak boleh lebih dari subtotal')
      return
    }

    try {
      setLoading(true)
      await onConfirm({
        paymentMethod,
        customerName: customerName || null,
        customerPhone: customerPhone || null,
        discountAmount
      })
    } catch (error) {
      console.error('Checkout error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Konfirmasi Pembayaran</h2>
        
        <div className="mb-4 p-4 bg-gray-50 rounded">
          <div className="flex justify-between mb-2">
            <span>Subtotal:</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span>Diskon:</span>
            <span className="text-red-600">- {formatCurrency(discountAmount)}</span>
          </div>
          <div className="flex justify-between font-bold text-lg">
            <span>Total:</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Metode Pembayaran
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="cash">Tunai</option>
              <option value="debit">Debit</option>
              <option value="credit">Credit</option>
              <option value="qris">QRIS</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nama Pelanggan (Opsional)
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              No. HP Pelanggan (Opsional)
            </label>
            <input
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="08123456789"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Diskon (Rp)
            </label>
            <input
              type="number"
              value={discountAmount}
              onChange={(e) => setDiscountAmount(Number(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="0"
              min="0"
              max={subtotal}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              disabled={loading}
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Bayar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}