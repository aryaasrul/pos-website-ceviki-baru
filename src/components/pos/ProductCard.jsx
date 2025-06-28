import React, { useState } from 'react'
import { formatCurrency } from '../../utils/formatters'

const ProductCard = ({ brand, products, onAddToCart }) => {
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [isOpen, setIsOpen] = useState(false)
  
  // Get the first available product or first product as default
  const defaultProduct = products.find(p => p.current_stock > 0) || products[0]
  
  // Check if any product in this brand has stock
  const hasStock = products.some(p => p.current_stock > 0)
  
  // Get unique product types (based on the part after brand name)
  const getProductType = (product) => {
    const name = product.name.toLowerCase()
    const brandLower = brand.toLowerCase()
    
    // Extract type from name (e.g., "AC Sharp 1 PK" -> "AC")
    const words = name.split(' ')
    const typeWords = []
    
    for (const word of words) {
      if (!brandLower.includes(word) && word !== brandLower) {
        typeWords.push(word)
      }
      if (typeWords.length > 0 && (word === brandLower || brandLower.includes(word))) {
        break
      }
    }
    
    return typeWords.join(' ').toUpperCase() || 'PRODUK'
  }
  
  const productType = getProductType(defaultProduct)
  
  const handleAddToCart = () => {
    const productToAdd = selectedProduct || defaultProduct
    if (productToAdd && productToAdd.current_stock > 0) {
      onAddToCart(productToAdd)
      setSelectedProduct(null)
      setIsOpen(false)
    } else {
      // If no product selected and default is out of stock, show dropdown
      setIsOpen(true)
    }
  }
  
  return (
    <div className={`bg-white p-3 rounded-lg shadow hover:shadow-md transition-shadow ${!hasStock ? 'opacity-60' : ''}`}>
      {/* Brand and Type Header */}
      <div className="mb-2">
        <h3 className="font-bold text-sm text-gray-900">
          {brand}
        </h3>
        <p className="text-xs text-gray-600 font-medium">
          {productType}
        </p>
      </div>
      
      {/* Product Models Dropdown */}
      <div className="relative mb-2">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-2 py-1.5 text-xs border rounded-md bg-gray-50 hover:bg-gray-100 flex items-center justify-between"
        >
          <span className="truncate">
            {selectedProduct ? selectedProduct.model || 'Pilih Model' : defaultProduct.model || 'Pilih Model'}
          </span>
          <svg 
            className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto">
            {products.map((product) => (
              <button
                key={product.id}
                onClick={() => {
                  setSelectedProduct(product)
                  setIsOpen(false)
                }}
                className={`w-full px-2 py-1.5 text-xs text-left hover:bg-gray-100 flex items-center justify-between ${
                  product.current_stock === 0 ? 'opacity-50' : ''
                }`}
                disabled={product.current_stock === 0}
              >
                <div className="flex-1">
                  <div className="font-medium truncate">
                    {product.model || product.name}
                  </div>
                  <div className="text-gray-500">
                    Stok: {product.current_stock}
                  </div>
                </div>
                <div className="text-right ml-2">
                  <div className="font-semibold text-blue-600">
                    {formatCurrency(product.selling_price)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      
      {/* Selected Product Info */}
      <div className="mb-2">
        <div className="flex items-center justify-between text-xs">
          <span className={`px-1.5 py-0.5 rounded-full ${
            (selectedProduct || defaultProduct).stock_status === 'available' 
              ? 'bg-green-100 text-green-700'
              : (selectedProduct || defaultProduct).stock_status === 'low_stock'
              ? 'bg-yellow-100 text-yellow-700'
              : 'bg-red-100 text-red-700'
          }`}>
            Stok: {(selectedProduct || defaultProduct).current_stock}
          </span>
          <span className="text-gray-500 text-xs">
            {products.length} varian
          </span>
        </div>
      </div>
      
      {/* Price */}
      <div className="mb-2">
        <p className="text-base font-bold text-blue-600">
          {formatCurrency((selectedProduct || defaultProduct).selling_price)}
        </p>
      </div>
      
      {/* Add to Cart Button */}
      <button
        onClick={handleAddToCart}
        disabled={!hasStock}
        className={`w-full py-1.5 px-2 rounded text-sm font-medium transition-colors ${
          !hasStock
            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
        }`}
      >
        {!hasStock ? 'Stok Habis' : '+ Keranjang'}
      </button>
    </div>
  )
}

export default ProductCard