import React from 'react'
import { formatCurrency } from '../../utils/formatters'

const ProductCard = ({ product, onAddToCart }) => {
  const stockColor = {
    available: 'bg-green-100 text-green-800',
    low_stock: 'bg-yellow-100 text-yellow-800',
    out_of_stock: 'bg-red-100 text-red-800'
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="font-semibold text-gray-900">{product.name}</h3>
          <p className="text-xs text-gray-500">{product.sku}</p>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full ${stockColor[product.stock_status]}`}>
          Stok: {product.current_stock}
        </span>
      </div>
      
      <div className="mt-3">
        <p className="text-lg font-bold text-blue-600">
          {formatCurrency(product.selling_price)}
        </p>
        <p className="text-xs text-gray-500">
          {product.brand} • {product.category_name}
        </p>
      </div>
      
      <button
        onClick={() => onAddToCart(product)}
        disabled={product.current_stock === 0}
        className="mt-3 w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm font-medium"
      >
        {product.current_stock === 0 ? 'Stok Habis' : 'Tambah ke Keranjang'}
      </button>
    </div>
  )
}

export default ProductCard
