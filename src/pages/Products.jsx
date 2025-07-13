import React, { useState, useEffect } from 'react'
import { Plus, Edit2, Package, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import { productService } from '../services/products'
import { supabase } from '../services/supabase'
import { useAuth } from '../contexts/AuthContext'
import Header from '../components/layout/Header'

export default function Products() {
  const { employee, logout } = useAuth()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [showStockOnly, setShowStockOnly] = useState(false)
  const [showProductModal, setShowProductModal] = useState(false)
  const [showStockModal, setShowStockModal] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [editingProduct, setEditingProduct] = useState(null)

  // Load data
  const loadData = async () => {
    try {
      setLoading(true)
      const [productsData, categoriesData] = await Promise.all([
        productService.getProducts(),
        productService.getCategories()
      ])
      setProducts(productsData)
      setCategories(categoriesData)
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Gagal memuat data produk')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Filter products
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = !selectedCategory || product.category_id === selectedCategory
    const matchesStock = !showStockOnly || product.current_stock > 0
    return matchesSearch && matchesCategory && matchesStock
  })

  const handleStockAdjustment = (product) => {
    setSelectedProduct(product)
    setShowStockModal(true)
  }

  const handleEditProduct = (product) => {
    setEditingProduct(product)
    setShowProductModal(true)
  }

  const handleAddProduct = () => {
    setEditingProduct(null)
    setShowProductModal(true)
  }

  const handleSaveProduct = () => {
    loadData()
    setShowProductModal(false)
    setEditingProduct(null)
  }

  const handleSaveStock = () => {
    loadData()
    setShowStockModal(false)
    setSelectedProduct(null)
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
      
      <div className="p-4 md:p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Kelola Produk</h1>
          
          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Cari produk..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Semua Kategori</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            
            <label className="flex items-center space-x-2 px-3 py-2 border rounded-md bg-white">
              <input
                type="checkbox"
                checked={showStockOnly}
                onChange={(e) => setShowStockOnly(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Hanya yang berStok</span>
            </label>
            
            <button
              onClick={handleAddProduct}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Produk</span>
            </button>
          </div>
        </div>

        {/* Products Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Produk
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    SKU
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kategori
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Harga
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stok
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProducts.map(product => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{product.name}</div>
                        <div className="text-sm text-gray-500">{product.brand} {product.model}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {product.sku}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {product.category_name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        Rp {product.selling_price?.toLocaleString('id-ID') || '0'}
                      </div>
                      <div className="text-xs text-gray-500">
                        HPP: Rp {product.cost_price?.toLocaleString('id-ID') || '0'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        product.current_stock <= product.min_stock
                          ? 'bg-red-100 text-red-800'
                          : product.current_stock <= product.min_stock * 2
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {product.current_stock}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleEditProduct(product)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleStockAdjustment(product)}
                        className="text-green-600 hover:text-green-900"
                      >
                        <Package className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredProducts.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">Tidak ada produk ditemukan</p>
            </div>
          )}
        </div>
      </div>

      {/* Product Modal */}
      {showProductModal && (
        <ProductModal
          product={editingProduct}
          categories={categories}
          onClose={() => {
            setShowProductModal(false)
            setEditingProduct(null)
          }}
          onSave={handleSaveProduct}
        />
      )}

      {/* Stock Modal */}
      {showStockModal && selectedProduct && (
        <StockModal
          product={selectedProduct}
          onClose={() => {
            setShowStockModal(false)
            setSelectedProduct(null)
          }}
          onSave={handleSaveStock}
        />
      )}
    </div>
  )
}

// Product Modal Component
function ProductModal({ product, categories, onClose, onSave }) {
  const [formData, setFormData] = useState({
    sku: product?.sku || '',
    name: product?.name || '',
    category_id: product?.category_id || '',
    brand: product?.brand || '',
    model: product?.model || '',
    description: product?.description || '',
    cost_price: product?.cost_price || '',
    selling_price: product?.selling_price || '',
    current_stock: product?.current_stock || '',
    min_stock: product?.min_stock || 5
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.sku || !formData.name || !formData.selling_price) {
      toast.error('SKU, Nama, dan Harga Jual harus diisi')
      return
    }

    if (loading) {
      toast.warning('Proses sedang berjalan, mohon tunggu...')
      return
    }

    setLoading(true)
    const toastId = toast.loading(product ? 'Mengupdate produk...' : 'Menambah produk...')

    try {
      const productData = {
        ...formData,
        cost_price: parseFloat(formData.cost_price) || 0,
        selling_price: parseFloat(formData.selling_price) || 0,
        current_stock: parseInt(formData.current_stock) || 0,
        min_stock: parseInt(formData.min_stock) || 5
      }

      if (product) {
        // Update existing product
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', product.id)
        
        if (error) throw error
        toast.success('Produk berhasil diupdate', { id: toastId })
      } else {
        // Create new product
        const { error } = await supabase
          .from('products')
          .insert(productData)
        
        if (error) throw error
        toast.success('Produk berhasil ditambahkan', { id: toastId })
      }

      onSave()
    } catch (error) {
      console.error('Product save error:', error)
      toast.error('Gagal menyimpan produk: ' + error.message, { id: toastId })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">
          {product ? 'Edit Produk' : 'Tambah Produk'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SKU *</label>
              <input
                type="text"
                value={formData.sku}
                onChange={(e) => setFormData({...formData, sku: e.target.value})}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                disabled={loading}
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nama Produk *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                disabled={loading}
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
              <select
                value={formData.category_id}
                onChange={(e) => setFormData({...formData, category_id: e.target.value})}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              >
                <option value="">Pilih Kategori</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
              <input
                type="text"
                value={formData.brand}
                onChange={(e) => setFormData({...formData, brand: e.target.value})}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
              <input
                type="text"
                value={formData.model}
                onChange={(e) => setFormData({...formData, model: e.target.value})}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Harga Modal</label>
              <input
                type="number"
                value={formData.cost_price}
                onChange={(e) => setFormData({...formData, cost_price: e.target.value})}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Harga Jual *</label>
              <input
                type="number"
                value={formData.selling_price}
                onChange={(e) => setFormData({...formData, selling_price: e.target.value})}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                disabled={loading}
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stok Awal</label>
              <input
                type="number"
                value={formData.current_stock}
                onChange={(e) => setFormData({...formData, current_stock: e.target.value})}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min. Stok</label>
              <input
                type="number"
                value={formData.min_stock}
                onChange={(e) => setFormData({...formData, min_stock: e.target.value})}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              rows={3}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              disabled={loading}
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Stock Modal Component
function StockModal({ product, onClose, onSave }) {
  const [adjustmentType, setAdjustmentType] = useState('in')
  const [quantity, setQuantity] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    const qty = parseInt(quantity, 10)
    if (!quantity || isNaN(qty) || qty <= 0) { 
      toast.error('Jumlah harus berupa angka positif')
      return
    }

    if (loading) {
      toast.warning('Proses sedang berjalan, mohon tunggu...')
      return
    }

    setLoading(true)
    const toastId = toast.loading('Memproses penyesuaian stok...')
    
    try {
      const { error } = await supabase.rpc('adjust_stock', {
        p_product_id: product.id,
        p_type: adjustmentType,
        p_quantity: qty,
        p_notes: notes || `Penyesuaian stok (${adjustmentType})`
      })

      if (error) throw error
      
      toast.success('Stok berhasil diperbarui', { id: toastId })
      onSave()
    } catch (error) {
      console.error('Stock adjustment error:', error)
      toast.error('Gagal memperbarui stok: ' + error.message, { id: toastId })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Penyesuaian Stok</h2>
        
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium text-gray-900">{product?.name}</h3>
          <p className="text-sm text-gray-500">SKU: {product?.sku}</p>
          <p className="text-sm text-gray-600">Stok Saat Ini: <span className="font-semibold">{product?.current_stock}</span></p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipe Penyesuaian</label>
            <select 
              value={adjustmentType} 
              onChange={(e) => setAdjustmentType(e.target.value)} 
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            >
              <option value="in">Stok Masuk (+)</option>
              <option value="out">Stok Keluar (-)</option>
              <option value="adjustment">Setel Ulang Stok (=)</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {adjustmentType === 'adjustment' ? 'Stok Baru' : 'Jumlah'}
            </label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0"
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
              disabled={loading}
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Catatan penyesuaian stok..."
              rows={3}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              disabled={loading}
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Memproses...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}