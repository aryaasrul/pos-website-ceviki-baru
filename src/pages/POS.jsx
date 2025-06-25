import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { productService } from '../services/products'
import { transactionService } from '../services/transactions'
import Header from '../components/layout/Header'
import ProductCard from '../components/pos/ProductCard'
import Cart from '../components/pos/Cart'
import CheckoutModal from '../components/pos/CheckoutModal'
import ExpenseModal from '../components/pos/ExpenseModal'
import toast from 'react-hot-toast'
import { expenseService } from '../services/expenses'

export default function POS() {
  const { employee, logout } = useAuth()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [cart, setCart] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [showCheckout, setShowCheckout] = useState(false)
  const [showExpense, setShowExpense] = useState(false)
  const [showMobileCart, setShowMobileCart] = useState(false)
  const [globalDiscount, setGlobalDiscount] = useState(0)
  const [globalDiscountType, setGlobalDiscountType] = useState('amount') // 'amount' or 'percentage'

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
                       product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       product.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       product.model?.toLowerCase().includes(searchTerm.toLowerCase())
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
      return [...prev, { ...product, quantity: 1, discount: 0, discountType: 'amount' }]
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

  const handleUpdateItemDiscount = (productId, discount, discountType) => {
    setCart(prev =>
      prev.map(item =>
        item.id === productId
          ? { ...item, discount: discount, discountType: discountType }
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
      // Include both global and item discounts
      const updatedPaymentDetails = {
        ...paymentDetails,
        globalDiscount,
        globalDiscountType
      }
      
      const result = await transactionService.createTransaction(
        cart,
        employee.id,
        updatedPaymentDetails
      )
      
      toast.success(`Transaksi berhasil! No: ${result.transaction_number}`)
      setCart([])
      setGlobalDiscount(0)
      setGlobalDiscountType('amount')
      setShowCheckout(false)
      setShowMobileCart(false)
      
      // Reload products to update stock
      loadInitialData()
    } catch (error) {
      toast.error('Transaksi gagal: ' + error.message)
    }
  }

  const handleAddExpense = async (expenseData) => {
    try {
      await expenseService.createExpense({
        ...expenseData,
        created_by: employee.id
      })
      setShowExpense(false)
    } catch (error) {
      throw error
    }
  }

  const getCartItemCount = () => {
    return cart.reduce((sum, item) => sum + item.quantity, 0)
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
      
      <div className="flex h-[calc(100vh-4rem)] relative">
        {/* Products Section */}
        <div className="flex-1 p-2 md:p-4 overflow-y-auto">
          {/* Action Buttons and Search */}
          <div className="mb-3 md:mb-4 space-y-2">
            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowExpense(true)}
                className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium"
              >
                + Pengeluaran
              </button>
            </div>
            
            {/* Search and Filters */}
            <div className="flex flex-col md:flex-row gap-2 md:gap-3">
              <input
                type="text"
                placeholder="Cari produk, brand, model..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 px-3 py-2 text-sm md:text-base border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 text-sm md:text-base border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Semua Kategori</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Product Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 md:gap-3">
            {filteredProducts.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={handleAddToCart}
              />
            ))}
          </div>
        </div>
        
        {/* Desktop Cart Section */}
        <div className="hidden lg:block w-96 p-4 bg-gray-50 border-l">
          <Cart
            items={cart}
            onUpdateQuantity={handleUpdateQuantity}
            onUpdateItemDiscount={handleUpdateItemDiscount}
            onRemoveItem={handleRemoveItem}
            onCheckout={handleCheckout}
            globalDiscount={globalDiscount}
            globalDiscountType={globalDiscountType}
            onUpdateGlobalDiscount={(discount, type) => {
              setGlobalDiscount(discount)
              setGlobalDiscountType(type)
            }}
          />
        </div>

        {/* Mobile Cart Button */}
        <button
          onClick={() => setShowMobileCart(true)}
          className="lg:hidden fixed bottom-4 right-4 bg-blue-600 text-white rounded-full p-4 shadow-lg flex items-center justify-center z-40"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          {getCartItemCount() > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center">
              {getCartItemCount()}
            </span>
          )}
        </button>

        {/* Mobile Cart Modal */}
        {showMobileCart && (
          <div className="lg:hidden fixed inset-0 bg-white z-50 flex flex-col">
            <div className="bg-white shadow-sm p-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Keranjang</h2>
              <button
                onClick={() => setShowMobileCart(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <Cart
                items={cart}
                onUpdateQuantity={handleUpdateQuantity}
                onUpdateItemDiscount={handleUpdateItemDiscount}
                onRemoveItem={handleRemoveItem}
                onCheckout={handleCheckout}
                globalDiscount={globalDiscount}
                globalDiscountType={globalDiscountType}
                onUpdateGlobalDiscount={(discount, type) => {
                  setGlobalDiscount(discount)
                  setGlobalDiscountType(type)
                }}
              />
            </div>
          </div>
        )}
      </div>
      
      {/* Checkout Modal */}
      {showCheckout && (
        <CheckoutModal
          cart={cart}
          globalDiscount={globalDiscount}
          globalDiscountType={globalDiscountType}
          onConfirm={handleConfirmCheckout}
          onClose={() => setShowCheckout(false)}
        />
      )}
      
      {/* Expense Modal */}
      {showExpense && (
        <ExpenseModal
          onClose={() => setShowExpense(false)}
          onSubmit={handleAddExpense}
        />
      )}
    </div>
  )
}