import React, { useState } from 'react'
import { formatCurrency } from '../../utils/formatters'

const CartItem = ({ item, onUpdateQuantity, onUpdateItemDiscount, onRemoveItem }) => {
  const [showDiscount, setShowDiscount] = useState(false)
  
  // Calculate item totals
  const itemSubtotal = item.selling_price * item.quantity
  const discountAmount = item.discountType === 'percentage'
    ? (itemSubtotal * item.discount / 100)
    : item.discount
  const itemTotal = itemSubtotal - discountAmount

  return (
    <div className="bg-gray-50 rounded-lg p-2 md:p-3">
      {/* Main Item Row */}
      <div className="flex items-start gap-2">
        {/* Product Info */}
        <div className="flex-1">
          <h4 className="font-medium text-xs md:text-sm line-clamp-2">{item.name}</h4>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-xs text-gray-500">{formatCurrency(item.selling_price)}</p>
            {item.brand && <span className="text-xs text-gray-400">• {item.brand}</span>}
          </div>
        </div>
        
        {/* Remove Button */}
        <button
          onClick={() => onRemoveItem(item.id)}
          className="text-red-500 hover:text-red-700 p-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Quantity and Total Row */}
      <div className="flex items-center justify-between mt-2">
        {/* Quantity Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
            className="w-7 h-7 rounded bg-white border hover:bg-gray-100 text-sm"
          >
            -
          </button>
          <span className="w-10 text-center text-sm font-medium">{item.quantity}</span>
          <button
            onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
            disabled={item.quantity >= item.current_stock}
            className="w-7 h-7 rounded bg-white border hover:bg-gray-100 disabled:opacity-50 text-sm"
          >
            +
          </button>
        </div>
        
        {/* Item Total */}
        <div className="text-right">
          <p className="font-semibold text-sm">{formatCurrency(itemTotal)}</p>
          {discountAmount > 0 && (
            <p className="text-xs text-red-600">-{formatCurrency(discountAmount)}</p>
          )}
        </div>
      </div>

      {/* Discount Section */}
      <div className="mt-2 pt-2 border-t border-gray-200">
        <button
          onClick={() => setShowDiscount(!showDiscount)}
          className="text-xs text-blue-600 hover:text-blue-800"
        >
          {showDiscount ? '- Tutup' : '+ Tambah'} Diskon
        </button>
        
        {showDiscount && (
          <div className="mt-2 flex gap-2">
            <select
              value={item.discountType}
              onChange={(e) => onUpdateItemDiscount(item.id, item.discount, e.target.value)}
              className="text-xs border rounded px-1 py-1"
            >
              <option value="amount">Rp</option>
              <option value="percentage">%</option>
            </select>
            <input
              type="number"
              value={item.discount}
              onChange={(e) => onUpdateItemDiscount(item.id, Number(e.target.value) || 0, item.discountType)}
              placeholder="0"
              min="0"
              max={item.discountType === 'percentage' ? 100 : itemSubtotal}
              className="flex-1 text-xs border rounded px-2 py-1"
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default CartItem