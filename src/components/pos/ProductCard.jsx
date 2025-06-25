import React from 'react'
import { formatCurrency } from '../../utils/formatters'

const ProductCard = ({ product, onAddToCart }) => {
  const isOutOfStock = product.current_stock === 0
  
  return (
    <div className={`bg-white p-2 md:p-3 rounded-lg shadow hover:shadow-md transition-shadow ${isOutOfStock ? 'opacity-60' : ''}`}>
      {/* Product Info */}
      <div className="mb-2">
        <h3 className="font-medium text-xs md:text-sm text-gray-900 line-clamp-2 min-h-[2rem] md:min-h-[2.5rem]">
          {product.name}
        </h3>
        {product.brand && product.model && (
          <p className="text-xs text-gray-500 truncate">
            {product.brand} - {product.model}
          </p>
        )}
        <p className="text-xs text-gray-400">{product.sku}</p>
      </div>
      
      {/* Stock Badge */}
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs px-1.5 py-0.5 rounded-full ${
          product.stock_status === 'available' 
            ? 'bg-green-100 text-green-700'
            : product.stock_status === 'low_stock'
            ? 'bg-yellow-100 text-yellow-700'
            : 'bg-red-100 text-red-700'
        }`}>
          Stok: {product.current_stock}
        </span>
      </div>
      
      {/* Price */}
      <div className="mb-2">
        <p className="text-sm md:text-base font-bold text-blue-600">
          {formatCurrency(product.selling_price)}
        </p>
      </div>
      
      {/* Add to Cart Button */}
      <button
        onClick={() => onAddToCart(product)}
        disabled={isOutOfStock}
        className={`w-full py-1.5 px-2 rounded text-xs md:text-sm font-medium transition-colors ${
          isOutOfStock
            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
        }`}
      >
        {isOutOfStock ? 'Stok Habis' : '+ Keranjang'}
      </button>
    </div>
  )
}

export default ProductCard