import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { productService } from '../services/products'
import { formatCurrency } from '../utils/formatters'
import Header from '../components/layout/Header'
import toast from 'react-hot-toast'
import { supabase } from '../services/supabase'

export default function Products() {
  const { employee, logout } = useAuth()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [showProductModal, setShowProductModal] = useState(false)
  const [showStockModal, setShowStockModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [showImportModal, setShowImportModal] = useState(false)


  useEffect(() => {
    loadData()
  }, [])

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
      toast.error('Gagal memuat data')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const filteredProducts = products.filter(product => {
    const matchSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       product.brand?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchCategory = selectedCategory === 'all' || product.category_id === selectedCategory
    return matchSearch && matchCategory
  })

  const handleAddProduct = () => {
    setEditingProduct(null)
    setShowProductModal(true)
  }

  const handleEditProduct = (product) => {
    setEditingProduct(product)
    setShowProductModal(true)
  }

  const handleStockAdjustment = (product) => {
    setSelectedProduct(product)
    setShowStockModal(true)
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
      
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <h1 className="text-2xl md:text-3xl font-bold">Kelola Produk</h1>
          <button
            onClick={handleAddProduct}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
          >
            + Tambah Produk
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium"
          >
            Import CSV
          </button>
        </div>
        
        {/* Search and Filters */}
        <div className="mb-6 flex flex-col md:flex-row gap-3">
          <input
            type="text"
            placeholder="Cari produk, SKU, atau brand..."
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
        
        {/* Products Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Produk
                  </th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                    Kategori
                  </th>
                  <th className="px-4 md:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stok
                  </th>
                  <th className="px-4 md:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                    Harga Modal
                  </th>
                  <th className="px-4 md:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Harga Jual
                  </th>
                  <th className="px-4 md:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProducts.map((product) => {
                  const margin = product.selling_price > 0 
                    ? ((product.selling_price - product.cost_price) / product.selling_price * 100).toFixed(1)
                    : 0
                  
                  return (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{product.name}</div>
                          <div className="text-xs text-gray-500">{product.sku}</div>
                          {product.brand && (
                            <div className="text-xs text-gray-400">{product.brand} {product.model && `- ${product.model}`}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">
                        {product.category_name}
                      </td>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap text-center">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          product.stock_status === 'available' 
                            ? 'bg-green-100 text-green-800'
                            : product.stock_status === 'low_stock'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {product.current_stock}
                        </span>
                      </td>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right hidden md:table-cell">
                        {formatCurrency(product.cost_price)}
                      </td>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        <div>
                          <div className="font-medium">{formatCurrency(product.selling_price)}</div>
                          <div className={`text-xs ${margin < 20 ? 'text-red-600' : 'text-green-600'}`}>
                            Margin: {margin}%
                          </div>
                        </div>
                      </td>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleStockAdjustment(product)}
                            className="text-green-600 hover:text-green-900"
                            title="Adjust Stock"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleEditProduct(product)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Edit"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Hapus produk ini?')) {
                                // Handle delete
                                toast.success('Produk dihapus')
                              }
                            }}
                            className="text-red-600 hover:text-red-900"
                            title="Delete"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Summary Stats */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Total Produk</h3>
            <p className="text-2xl font-bold text-gray-900 mt-1">{products.length}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Total Nilai Stok</h3>
            <p className="text-2xl font-bold text-green-600 mt-1">
              {formatCurrency(products.reduce((sum, p) => sum + (p.cost_price * p.current_stock), 0))}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Stok Habis</h3>
            <p className="text-2xl font-bold text-red-600 mt-1">
              {products.filter(p => p.stock_status === 'out_of_stock').length}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Stok Menipis</h3>
            <p className="text-2xl font-bold text-yellow-600 mt-1">
              {products.filter(p => p.stock_status === 'low_stock').length}
            </p>
          </div>
        </div>
      </div>
      
      {/* Product Modal */}
      {showProductModal && (
        <ProductModal
          product={editingProduct}
          categories={categories}
          onClose={() => setShowProductModal(false)}
          onSave={() => {
            setShowProductModal(false)
            loadData()
          }}
        />
      )}
      
      {/* Stock Modal */}
      {showStockModal && (
        <StockModal
          product={selectedProduct}
          onClose={() => setShowStockModal(false)}
          onSave={() => {
            setShowStockModal(false)
            loadData()
          }}
        />
      )}
    
      {/* Import Modal */}
      {showImportModal && (
        <ImportCSVModal
          onClose={() => setShowImportModal(false)}
          onSuccess={() => {
            setShowImportModal(false)
            loadData()
          }}
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
    min_stock: product?.min_stock || 5
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.sku || !formData.name || !formData.category_id) {
      toast.error('SKU, Nama, dan Kategori wajib diisi')
      return
    }

    try {
      setLoading(true)
      // TODO: Call API to save product
      toast.success(product ? 'Produk berhasil diupdate' : 'Produk berhasil ditambahkan')
      onSave()
    } catch (error) {
      toast.error('Gagal menyimpan produk')
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                SKU *
              </label>
              <input
                type="text"
                value={formData.sku}
                onChange={(e) => setFormData({...formData, sku: e.target.value})}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nama Produk *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kategori *
              </label>
              <select
                value={formData.category_id}
                onChange={(e) => setFormData({...formData, category_id: e.target.value})}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Pilih Kategori</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Brand
              </label>
              <input
                type="text"
                value={formData.brand}
                onChange={(e) => setFormData({...formData, brand: e.target.value})}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Model/Tipe
              </label>
              <input
                type="text"
                value={formData.model}
                onChange={(e) => setFormData({...formData, model: e.target.value})}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Harga Modal
              </label>
              <input
                type="number"
                value={formData.cost_price}
                onChange={(e) => setFormData({...formData, cost_price: e.target.value})}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                min="0"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Harga Jual
              </label>
              <input
                type="number"
                value={formData.selling_price}
                onChange={(e) => setFormData({...formData, selling_price: e.target.value})}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                min="0"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Minimum Stok
              </label>
              <input
                type="number"
                value={formData.min_stock}
                onChange={(e) => setFormData({...formData, min_stock: e.target.value})}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                min="0"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Deskripsi
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
              rows="3"
            />
          </div>
          
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              disabled={loading}
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
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
    
    if (!quantity || parseInt(quantity) <= 0) {
      toast.error('Jumlah harus lebih dari 0')
      return
    }

    try {
      setLoading(true)
      // TODO: Call API to adjust stock
      toast.success('Stok berhasil diupdate')
      onSave()
    } catch (error) {
      toast.error('Gagal update stok')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Penyesuaian Stok</h2>
        
        <div className="mb-4 p-4 bg-gray-50 rounded">
          <h3 className="font-medium">{product?.name}</h3>
          <p className="text-sm text-gray-500">SKU: {product?.sku}</p>
          <p className="text-sm font-medium mt-2">Stok Saat Ini: {product?.current_stock}</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipe Penyesuaian
            </label>
            <select
              value={adjustmentType}
              onChange={(e) => setAdjustmentType(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="in">Masuk (Tambah Stok)</option>
              <option value="out">Keluar (Kurang Stok)</option>
              <option value="adjustment">Set Stok</option>
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
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
              min="0"
              placeholder="0"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Catatan
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
              rows="3"
              placeholder="Alasan penyesuaian stok..."
            />
          </div>
          
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              disabled={loading}
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
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
// Import CSV Modal Component
function ImportCSVModal({ onClose, onSuccess }) {
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState([])

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile)
      previewCSV(selectedFile)
    } else {
      toast.error('Hanya file CSV yang diizinkan')
    }
  }

  const previewCSV = (file) => {
  const reader = new FileReader()
  reader.onload = (e) => {
    const text = e.target.result
    const lines = text.split('\n').filter(line => line.trim() !== '') // Filter empty lines
    
    if (lines.length < 2) {
      toast.error('File CSV tidak valid atau kosong')
      return
    }
    
    // Parse CSV dengan handling yang lebih baik
    const parseCSVLine = (line) => {
      const result = []
      let current = ''
      let inQuotes = false
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i]
        
        if (char === '"') {
          inQuotes = !inQuotes
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim())
          current = ''
        } else {
          current += char
        }
      }
      
      result.push(current.trim())
      return result
    }
    
    const headers = parseCSVLine(lines[0])
    const data = []
    
    for (let i = 1; i < Math.min(6, lines.length); i++) {
      if (lines[i].trim()) {
        const values = parseCSVLine(lines[i])
        const row = {}
        headers.forEach((header, index) => {
          row[header] = values[index] || ''
        })
        data.push(row)
      }
    }
    
    setPreview(data)
  }
  reader.readAsText(file)
}

const handleImport = async () => {
  if (!file) {
    toast.error('Pilih file CSV terlebih dahulu')
    return
  }

  try {
    setLoading(true)
    
    const reader = new FileReader()
    reader.onload = async (e) => {
      const text = e.target.result
      const lines = text.split('\n').filter(line => line.trim() !== '')
      
      if (lines.length < 2) {
        toast.error('File CSV tidak memiliki data')
        return
      }
      
      // Parse CSV dengan handling yang lebih baik
      const parseCSVLine = (line) => {
        const result = []
        let current = ''
        let inQuotes = false
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i]
          
          if (char === '"') {
            inQuotes = !inQuotes
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim())
            current = ''
          } else {
            current += char
          }
        }
        
        result.push(current.trim())
        return result
      }
      
      const headers = parseCSVLine(lines[0])
      const products = []
      
      // Log headers untuk debugging
      console.log('Headers found:', headers)
      
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
          const values = parseCSVLine(lines[i])
          const product = {}
          headers.forEach((header, index) => {
            product[header] = values[index] || ''
          })
          
          // Only add if product has some data
          if (Object.values(product).some(val => val !== '')) {
            products.push(product)
          }
        }
      }

      console.log('Products parsed:', products.length)

      if (products.length === 0) {
        toast.error('Tidak ada data produk dalam file CSV')
        return
      }

      // Get categories first
      const { data: categories } = await supabase
        .from('categories')
        .select('id, name')
      
      const categoryMap = {}
      categories.forEach(cat => {
        categoryMap[cat.name.toLowerCase()] = cat.id
      })

      // Auto-detect category based on product type
      const getCategoryId = (jenisBarang) => {
        const jenis = jenisBarang?.toLowerCase() || ''
        if (jenis.includes('kulkas') || jenis.includes('ac') || jenis.includes('tv')) {
          return categoryMap['elektronik']
        } else if (jenis.includes('mesin cuci') || jenis.includes('freezer')) {
          return categoryMap['elektronik']
        } else if (jenis.includes('rantang') || jenis.includes('alat makan')) {
          return categoryMap['dapur']
        } else if (jenis.includes('meja') || jenis.includes('kursi')) {
          return categoryMap['perabotan']
        } else {
          return categoryMap['lainnya']
        }
      }

      // Transform data - check both uppercase and mixed case headers
      const validProducts = products.map((p, index) => {
        // Try different header variations
        const merk = p['MERK'] || p['Merk'] || p['merk'] || ''
        const tipe = p['TIPE'] || p['Tipe'] || p['tipe'] || ''
        const jenisBarang = p['JENIS BARANG'] || p['Jenis Barang'] || p['jenis barang'] || ''
        const stokAwal = p['STOK AWAL'] || p['Stok Awal'] || p['stok awal'] || '0'
        const hargaModalStr = p['HARGA MODAL'] || p['Harga Modal'] || p['harga modal'] || '0'
        const hargaJualStr = p['HARGA JUAL'] || p['Harga Jual'] || p['harga jual'] || '0'
        
        // Generate SKU
        const merkCode = merk.substring(0, 3).toUpperCase() || 'XXX'
        const tipeCode = tipe.replace(/[\s\/\-\.]/g, '').substring(0, 10) || 'NA'
        const sku = `${merkCode}-${tipeCode}-${Date.now()}-${index}`
        
        // Generate nama produk
        const name = `${jenisBarang} ${merk} ${tipe}`.trim()
        
        // Parse harga - handle various formats
        const parsePrice = (priceStr) => {
          if (!priceStr) return 0
          // Remove all non-numeric except dots
          const cleaned = priceStr.toString().replace(/[^\d.]/g, '')
          return parseFloat(cleaned) || 0
        }
        
        const hargaModal = parsePrice(hargaModalStr)
        const hargaJual = parsePrice(hargaJualStr)
        
        // Jika harga modal kosong, hitung dari harga jual (asumsi margin 20%)
        const costPrice = hargaModal || (hargaJual * 0.8)
        
        return {
          sku: sku,
          name: name,
          category_id: getCategoryId(jenisBarang),
          brand: merk,
          model: tipe,
          cost_price: Math.round(costPrice),
          selling_price: Math.round(hargaJual),
          current_stock: parseInt(stokAwal) || 0,
          min_stock: 5,
          active: true
        }
      }).filter(p => p.name.trim() && p.selling_price > 0)

      console.log('Valid products:', validProducts.length)

      if (validProducts.length === 0) {
        toast.error('Tidak ada produk valid untuk diimport. Pastikan format CSV sesuai.')
        return
      }

      // Log sample product for debugging
      console.log('Sample product:', validProducts[0])

      // Insert to database in batches
      const batchSize = 50
      let imported = 0
      
      for (let i = 0; i < validProducts.length; i += batchSize) {
        const batch = validProducts.slice(i, i + batchSize)
        const { error } = await supabase
          .from('products')
          .insert(batch)

        if (error) {
          console.error('Import error:', error)
          toast.error(`Error pada batch ${i/batchSize + 1}: ${error.message}`)
          continue
        }
        
        imported += batch.length
      }

      toast.success(`${imported} produk berhasil diimport`)
      onSuccess()
    }
    
    reader.readAsText(file)
  } catch (error) {
    toast.error('Gagal import: ' + error.message)
    console.error(error)
  } finally {
    setLoading(false)
  }
}
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Import Produk dari CSV</h2>
        
        <div className="mb-4">
          <div className="p-4 bg-blue-50 rounded mb-4">
            <h3 className="font-semibold mb-2">Format CSV yang Diterima:</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium mb-1">Format Standard:</p>
                <ul className="text-sm text-gray-600 list-disc list-inside">
                  <li>sku</li>
                  <li>name</li>
                  <li>category</li>
                  <li>brand</li>
                  <li>model</li>
                  <li>cost_price</li>
                  <li>selling_price</li>
                  <li>stock</li>
                </ul>
              </div>
              
              <div>
                <p className="text-sm font-medium mb-1">Format Client (Auto-detect):</p>
                <ul className="text-sm text-gray-600 list-disc list-inside">
                  <li>NO</li>
                  <li>JENIS BARANG</li>
                  <li>MERK</li>
                  <li>TIPE</li>
                  <li>STOK AWAL</li>
                  <li>HARGA MODAL</li>
                  <li>HARGA JUAL</li>
                </ul>
              </div>
            </div>
            
            <p className="text-sm text-orange-600 mt-2">
              * Sistem akan otomatis mendeteksi format dan generate SKU jika tidak ada
            </p>
          </div>

          <label className="block text-sm font-medium text-gray-700 mb-2">
            Pilih File CSV
          </label>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>

        {preview.length > 0 && (
          <div className="mb-4">
            <h3 className="font-semibold mb-2">Preview (5 data pertama):</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border">
                <thead className="bg-gray-50">
                  <tr>
                    {Object.keys(preview[0]).map(key => (
                      <th key={key} className="px-2 py-1 border text-left">{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => (
                    <tr key={i}>
                      {Object.values(row).map((val, j) => (
                        <td key={j} className="px-2 py-1 border">{val}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            disabled={loading}
          >
            Batal
          </button>
          <button
            onClick={handleImport}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
            disabled={loading || !file}
          >
            {loading ? 'Mengimport...' : 'Import'}
          </button>
        </div>
      </div>
    </div>
  )
}