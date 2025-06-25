import React from 'react'
import { formatCurrency } from '../../utils/formatters'

const CartItem = ({ item, onUpdateQuantity, onRemoveItem }) => {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
      <div className="flex-1">
        <h4 className="font-medium text-sm">{item.name}</h4>
        <p className="text-xs text-gray-500">{formatCurrency(item.selling_price)}</p>
      </div>
      
      <div className="flex items-center gap-2">
        <button
          onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
          className="w-8 h-8 rounded bg-white border hover:bg-gray-100"
        >
          -
        </button>
        <span className="w-12 text-center font-medium">{item.quantity}</span>
        <button
          onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
          disabled={item.quantity >= item.current_stock}
          className="w-8 h-8 rounded bg-white border hover:bg-gray-100 disabled:opacity-50"
        >
          +
        </button>
        <button
          onClick={() => onRemoveItem(item.id)}
          className="ml-2 text-red-500 hover:text-red-700"
        >
          ×
        </button>
      </div>
      
      <div className="ml-4 text-right">
        <p className="font-medium">{formatCurrency(item.selling_price * item.quantity)}</p>
      </div>
    </div>
  )
}

export default CartItem