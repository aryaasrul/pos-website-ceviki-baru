import React, { useState } from 'react'
import { formatCurrency } from '../../utils/formatters'
import toast from 'react-hot-toast'

export default function CheckoutModal({ cart, globalDiscount, globalDiscountType, onConfirm, onClose }) {
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [loading, setLoading] = useState(false)

  // Calculate totals
  const calculateTotals = () => {
    let subtotal = 0
    let totalItemDiscount = 0

    cart.forEach(item => {
      const itemSubtotal = item.selling_price * item.quantity
      const itemDiscount = item.discountType === 'percentage'
        ? (itemSubtotal * item.discount / 100)
        : item.discount
      
      subtotal += itemSubtotal
      totalItemDiscount += itemDiscount
    })

    const afterItemDiscount = subtotal - totalItemDiscount
    const globalDiscountAmount = globalDiscountType === 'percentage'
      ? (afterItemDiscount * globalDiscount / 100)
      : globalDiscount
    
    const finalTotal = Math.max(0, afterItemDiscount - globalDiscountAmount)

    return {
      subtotal,
      totalItemDiscount,
      afterItemDiscount,
      globalDiscountAmount,
      finalTotal
    }
  }

  const totals = calculateTotals()

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      setLoading(true)
      await onConfirm({
        paymentMethod,
        customerName: customerName || null,
        customerPhone: customerPhone || null,
        discountAmount: totals.globalDiscountAmount // Pass the calculated global discount
      })
    } catch (error) {
      console.error('Checkout error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-4 md:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg md:text-xl font-bold mb-4">Konfirmasi Pembayaran</h2>
        
        {/* Summary */}
        <div className="mb-4 p-3 md:p-4 bg-gray-50 rounded space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>{formatCurrency(totals.subtotal)}</span>
          </div>
          
          {totals.totalItemDiscount > 0 && (
            <div className="flex justify-between text-red-600">
              <span>Diskon Item:</span>
              <span>- {formatCurrency(totals.totalItemDiscount)}</span>
            </div>
          )}
          
          {totals.globalDiscountAmount > 0 && (
            <div className="flex justify-between text-red-600">
              <span>Diskon Transaksi:</span>
              <span>- {formatCurrency(totals.globalDiscountAmount)}</span>
            </div>
          )}
          
          <div className="flex justify-between font-bold text-base md:text-lg pt-2 border-t">
            <span>Total:</span>
            <span className="text-green-600">{formatCurrency(totals.finalTotal)}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 md:space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Metode Pembayaran
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="08123456789"
            />
          </div>

          <div className="flex gap-2 md:gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-3 md:px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm md:text-base"
              disabled={loading}
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex-1 px-3 md:px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 text-sm md:text-base font-medium"
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