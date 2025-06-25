import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { productService } from '../services/products'
import { transactionService } from '../services/transactions'
import Header from '../components/layout/Header'
import ProductCard from '../components/pos/ProductCard'
import Cart from '../components/pos/Cart'
import CheckoutModal from '../components/pos/CheckoutModal'
import toast from 'react-hot-toast'

export default function POS() {
  const { employee, logout } = useAuth()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [cart, setCart] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [showCheckout, setShowCheckout] = useState(false)

  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    try {
      setLoading(true)
      const [productsData, categoriesData] = await Promise.all([
        productService.getProducts(),
        productService.getCategories()
      ])
      
      setProducts(productsData)
      setCategories(categoriesData)
    } catch (error) {
      toast.error('Gagal memuat data')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const filteredProducts = products.filter(product => {
    const matchSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       product.sku.toLowerCase().includes(searchTerm.toLowerCase())
    const matchCategory = selectedCategory === 'all' || product.category_id === selectedCategory
    return matchSearch && matchCategory
  })

  const handleAddToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id)
      if (existing) {
        if (existing.quantity >= product.current_stock) {
          toast.error('Stok tidak mencukupi')
          return prev
        }
        toast.success('Quantity ditambah')
        return prev.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      toast.success('Produk ditambahkan ke keranjang')
      return [...prev, { ...product, quantity: 1, discount: 0 }]
    })
  }

  const handleUpdateQuantity = (productId, newQuantity) => {
    if (newQuantity < 1) {
      handleRemoveItem(productId)
      return
    }
    
    const product = products.find(p => p.id === productId)
    if (newQuantity > product.current_stock) {
      toast.error('Stok tidak mencukupi')
      return
    }
    
    setCart(prev =>
      prev.map(item =>
        item.id === productId
          ? { ...item, quantity: newQuantity }
          : item
      )
    )
  }

  const handleRemoveItem = (productId) => {
    setCart(prev => prev.filter(item => item.id !== productId))
    toast.success('Produk dihapus dari keranjang')
  }

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast.error('Keranjang kosong')
      return
    }
    setShowCheckout(true)
  }

  const handleConfirmCheckout = async (paymentDetails) => {
    try {
      const result = await transactionService.createTransaction(
        cart,
        employee.id,
        paymentDetails
      )
      
      toast.success(`Transaksi berhasil! No: ${result.transaction_number}`)
      setCart([])
      setShowCheckout(false)
      
      // Reload products to update stock
      loadInitialData()
    } catch (error) {
      toast.error('Transaksi gagal: ' + error.message)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading products...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Header employee={employee} onLogout={logout} />
      
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Products Section */}
        <div className="flex-1 p-4 overflow-y-auto">
          {/* Search and Filters */}
          <div className="mb-4 flex gap-3">
            <input
              type="text"
              placeholder="Cari produk..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Semua Kategori</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          
          {/* Product Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={handleAddToCart}
              />
            ))}
          </div>
        </div>
        
        {/* Cart Section */}
        <div className="w-96 p-4 bg-gray-50 border-l">
          <Cart
            items={cart}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveItem}
            onCheckout={handleCheckout}
          />
        </div>
      </div>
      
      {/* Checkout Modal */}
      {showCheckout && (
        <CheckoutModal
          cart={cart}
          onConfirm={handleConfirmCheckout}
          onClose={() => setShowCheckout(false)}
        />
      )}
    </div>
  )
}