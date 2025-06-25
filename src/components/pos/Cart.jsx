import React from 'react'
import CartItem from './CartItem'
import { formatCurrency } from '../../utils/formatters'

const Cart = ({ items, onUpdateQuantity, onRemoveItem, onCheckout }) => {
  const subtotal = items.reduce((sum, item) => sum + (item.selling_price * item.quantity), 0)
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <h2 className="text-lg font-bold mb-4">Keranjang ({totalItems} item)</h2>
      
      {items.length === 0 ? (
        <p className="text-gray-500 text-center py-8">Keranjang kosong</p>
      ) : (
        <>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {items.map(item => (
              <CartItem
                key={item.id}
                item={item}
                onUpdateQuantity={onUpdateQuantity}
                onRemoveItem={onRemoveItem}
              />
            ))}
          </div>
          
          <div className="mt-4 pt-4 border-t">
            <div className="flex justify-between text-lg font-bold">
              <span>Total:</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            
            <button
              onClick={onCheckout}
              className="mt-4 w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 font-medium"
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