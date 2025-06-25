import React, { useState } from 'react'
import CartItem from './CartItem'
import { formatCurrency } from '../../utils/formatters'

const Cart = ({ 
  items, 
  onUpdateQuantity, 
  onUpdateItemDiscount,
  onRemoveItem, 
  onCheckout,
  globalDiscount,
  globalDiscountType,
  onUpdateGlobalDiscount
}) => {
  const [showGlobalDiscount, setShowGlobalDiscount] = useState(false)
  
  // Calculate subtotal
  const subtotal = items.reduce((sum, item) => {
    const itemSubtotal = item.selling_price * item.quantity
    const itemDiscount = item.discountType === 'percentage' 
      ? (itemSubtotal * item.discount / 100)
      : item.discount
    return sum + (itemSubtotal - itemDiscount)
  }, 0)
  
  // Calculate global discount amount
  const globalDiscountAmount = globalDiscountType === 'percentage'
    ? (subtotal * globalDiscount / 100)
    : globalDiscount
    
  // Final total
  const total = Math.max(0, subtotal - globalDiscountAmount)
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <div className="bg-white rounded-lg shadow-lg p-3 md:p-4 h-full flex flex-col">
      <h2 className="text-base md:text-lg font-bold mb-3 md:mb-4">
        Keranjang ({totalItems} item)
      </h2>
      
      {items.length === 0 ? (
        <p className="text-gray-500 text-center py-8">Keranjang kosong</p>
      ) : (
        <>
          {/* Cart Items */}
          <div className="flex-1 space-y-2 md:space-y-3 overflow-y-auto">
            {items.map(item => (
              <CartItem
                key={item.id}
                item={item}
                onUpdateQuantity={onUpdateQuantity}
                onUpdateItemDiscount={onUpdateItemDiscount}
                onRemoveItem={onRemoveItem}
              />
            ))}
          </div>
          
          {/* Summary */}
          <div className="mt-4 pt-4 border-t space-y-2">
            {/* Subtotal */}
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            
            {/* Global Discount Toggle */}
            <div>
              <button
                onClick={() => setShowGlobalDiscount(!showGlobalDiscount)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                {showGlobalDiscount ? '- Tutup' : '+ Tambah'} Diskon Transaksi
              </button>
            </div>
            
            {/* Global Discount Input */}
            {showGlobalDiscount && (
              <div className="bg-gray-50 p-2 rounded space-y-2">
                <div className="flex gap-2">
                  <select
                    value={globalDiscountType}
                    onChange={(e) => onUpdateGlobalDiscount(globalDiscount, e.target.value)}
                    className="text-sm border rounded px-2 py-1"
                  >
                    <option value="amount">Rp</option>
                    <option value="percentage">%</option>
                  </select>
                  <input
                    type="number"
                    value={globalDiscount}
                    onChange={(e) => onUpdateGlobalDiscount(Number(e.target.value) || 0, globalDiscountType)}
                    placeholder="0"
                    min="0"
                    max={globalDiscountType === 'percentage' ? 100 : subtotal}
                    className="flex-1 text-sm border rounded px-2 py-1"
                  />
                </div>
                {globalDiscountAmount > 0 && (
                  <div className="text-xs text-red-600">
                    Diskon: -{formatCurrency(globalDiscountAmount)}
                  </div>
                )}
              </div>
            )}
            
            {/* Total */}
            <div className="flex justify-between text-base md:text-lg font-bold pt-2">
              <span>Total:</span>
              <span className="text-green-600">{formatCurrency(total)}</span>
            </div>
            
            {/* Checkout Button */}
            <button
              onClick={onCheckout}
              className="mt-2 w-full bg-green-600 text-white py-2.5 md:py-3 px-4 rounded-lg hover:bg-green-700 font-medium text-sm md:text-base"
            >
              Proses Pembayaran
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default Cart