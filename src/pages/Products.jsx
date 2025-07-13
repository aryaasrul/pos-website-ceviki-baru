import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { productService } from '../services/products';
import { formatCurrency, formatDate } from '../utils/formatters'; // Menambahkan formatDate
import Header from '../components/layout/Header';
import toast from 'react-hot-toast';
import { supabase } from '../services/supabase';
import { stockHistoryService } from '../services/stockHistory'; // Import service baru

// --- Komponen Modal Riwayat Stok ---
// Ditempatkan di sini agar sesuai dengan struktur kode Anda
function StockHistoryModal({ product, onClose }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!product) return;
      try {
        setLoading(true);
        const data = await stockHistoryService.getStockHistory(product.id);
        setHistory(data);
      } catch (error) {
        toast.error('Gagal memuat riwayat stok.');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [product]);

  const getTypeClass = (type) => {
    switch (type) {
      case 'sale': return 'bg-red-100 text-red-800';
      case 'adjustment':
      case 'stock_in': return 'bg-green-100 text-green-800';
      case 'return': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="p-5 border-b">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-gray-800">Riwayat Stok</h2>
              <p className="text-sm text-gray-600">{product.name} ({product.sku})</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
        <div className="p-5 overflow-y-auto">
          {loading ? (
            <div className="text-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div><p className="mt-4 text-gray-600">Memuat...</p></div>
          ) : history.length === 0 ? (
            <div className="text-center py-10"><p className="text-gray-500">Tidak ada riwayat pergerakan stok.</p></div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tanggal</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jenis</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Jumlah</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Catatan</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Oleh</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {history.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatDate(item.created_at, true)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm"><span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getTypeClass(item.type)}`}>{item.type.replace('_', ' ')}</span></td>
                    <td className={`px-6 py-4 whitespace-nowrap text-right text-sm font-bold ${item.quantity < 0 ? 'text-red-600' : 'text-green-600'}`}>{item.quantity}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.notes || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{item.created_by_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="p-4 bg-gray-50 border-t text-right">
          <button onClick={onClose} className="px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700">Tutup</button>
        </div>
      </div>
    </div>
  );
}


// --- MAIN COMPONENT ---
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

  // --- PENAMBAHAN STATE UNTUK HISTORY MODAL ---
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [selectedProductForHistory, setSelectedProductForHistory] = useState(null)


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
      setProducts(productsData || [])
      setCategories(categoriesData || [])
    } catch (error) {
      toast.error('Gagal memuat data')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const uniqueBrands = useMemo(() => {
    const brandsSet = new Set(products.map(p => p.brand).filter(Boolean))
    return Array.from(brandsSet).sort()
  }, [products])

  const filteredProducts = products.filter(product => {
    if (!product) return false;
    const matchSearch = product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
  
  // --- PENAMBAHAN FUNGSI UNTUK MENAMPILKAN HISTORY ---
  const handleShowHistory = (product) => {
    setSelectedProductForHistory(product);
    setShowHistoryModal(true);
  };

  const handleDeleteProduct = async (productId) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus produk ini? Aksi ini tidak dapat dibatalkan.')) {
      try {
        const { error } = await supabase.from('products').delete().eq('id', productId)
        if (error) throw error
        toast.success('Produk berhasil dihapus')
        loadData()
      } catch (error) {
        toast.error('Gagal menghapus produk: ' + error.message)
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat data produk...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Header employee={employee} onLogout={logout} />
      
      <main className="p-4 md:p-6 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <h1 className="text-2xl md:text-3xl font-bold">Kelola Produk</h1>
          <button
            onClick={handleAddProduct}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium flex items-center gap-2"
          >
            + Tambah Produk
          </button>
        </div>
        
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
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 md:w-64"
          >
            <option value="all">Semua Kategori</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>
        
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Produk</th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Kategori</th>
                  <th className="px-4 md:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Stok</th>
                  <th className="px-4 md:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Harga Jual</th>
                  <th className="px-4 md:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{product.name}</div>
                          <div className="text-xs text-gray-500">{product.sku}</div>
                        </div>
                      </td>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">{product.category_name}</td>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap text-center">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${product.current_stock > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {product.current_stock}
                        </span>
                      </td>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">{formatCurrency(product.selling_price)}</td>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2">
                          {/* --- PENAMBAHAN TOMBOL HISTORY --- */}
                          <button onClick={() => handleShowHistory(product)} className="text-gray-500 hover:text-gray-800" title="Lihat Riwayat Stok">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v11.494m-5.747-8.247l11.494 0M4.253 12.000h15.494" transform="rotate(45 12 12)"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
                          </button>
                          <button onClick={() => handleStockAdjustment(product)} className="text-green-600 hover:text-green-900" title="Penyesuaian Stok">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>
                          </button>
                          <button onClick={() => handleEditProduct(product)} className="text-blue-600 hover:text-blue-900" title="Edit">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                          <button onClick={() => handleDeleteProduct(product.id)} className="text-red-600 hover:text-red-900" title="Hapus">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
      
      {showProductModal && (
        <ProductModal
          product={editingProduct}
          categories={categories}
          brands={uniqueBrands}
          onClose={() => setShowProductModal(false)}
          onSave={() => {
            setShowProductModal(false)
            loadData()
          }}
        />
      )}
      
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

      {/* --- PENAMBAHAN RENDER UNTUK HISTORY MODAL --- */}
      {showHistoryModal && (
        <StockHistoryModal
          product={selectedProductForHistory}
          onClose={() => setShowHistoryModal(false)}
        />
      )}
    </div>
  )
}

// --- PRODUCT MODAL COMPONENT ---
function ProductModal({ product, categories, brands, onClose, onSave }) {
  const [formData, setFormData] = useState({
    category_id: product?.category_id || '',
    brand: product?.brand || '',
    model: product?.model || '',
    name: product?.name || '',
    sku: product?.sku || '',
    cost_price: product?.cost_price || 0,
    selling_price: product?.selling_price || 0,
  })
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newBrandName, setNewBrandName] = useState('')
  const [loading, setLoading] = useState(false)
  const [initialStock, setInitialStock] = useState(0)

  useEffect(() => {
    const { category_id, brand, model } = formData
    const category = categories.find(c => c.id === category_id)
    const categoryName = category_id === 'new' ? newCategoryName : category?.name || ''
    const brandName = brand === 'new' ? newBrandName : brand || ''
    
    const generatedName = [categoryName, brandName, model].filter(Boolean).join(' ')
    const generatedSKU = [
        brandName?.substring(0, 3).toUpperCase(),
        categoryName?.substring(0, 3).toUpperCase(),
        model?.replace(/\s/g, '').toUpperCase()
    ].filter(Boolean).join('-')

    setFormData(prev => ({ ...prev, name: generatedName, sku: generatedSKU }))
  }, [formData.category_id, formData.brand, formData.model, newCategoryName, newBrandName, categories])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validation
    let finalCategoryId = formData.category_id
    let finalBrandName = formData.brand

    if (!finalCategoryId || (finalCategoryId === 'new' && !newCategoryName.trim())) { 
      toast.error('Kategori wajib diisi')
      return
    }
    if (!finalBrandName || (finalBrandName === 'new' && !newBrandName.trim())) { 
      toast.error('Merk wajib diisi')
      return
    }

    // Prevent double submission
    if (loading) return
    
    setLoading(true)
    try {
        // Create new category if needed
        if (finalCategoryId === 'new') {
            const { data: newCategory, error: catError } = await supabase
              .from('categories')
              .insert({ name: newCategoryName.trim() })
              .select()
              .single()
            if (catError) throw catError
            finalCategoryId = newCategory.id
        }

        // Use new brand name if creating new
        if (finalBrandName === 'new') {
            finalBrandName = newBrandName.trim()
        }

        const productData = {
            ...formData,
            category_id: finalCategoryId,
            brand: finalBrandName,
            cost_price: parseFloat(formData.cost_price),
            selling_price: parseFloat(formData.selling_price),
        }

        let error
        if (product) {
            // Update existing product
            ({ error } = await supabase
              .from('products')
              .update(productData)
              .eq('id', product.id))
        } else {
            // Create new product with initial stock
            productData.current_stock = initialStock
            ({ error } = await supabase
              .from('products')
              .insert(productData))
        }

        if (error) throw error
        toast.success(product ? 'Produk berhasil diupdate' : 'Produk berhasil ditambahkan')
        onSave()
    } catch (error) {
        toast.error('Gagal menyimpan produk: ' + error.message)
    } finally {
        setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <form onSubmit={handleSubmit} className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-6">{product ? 'Edit Produk' : 'Tambah Produk'}</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-5">
            {/* Category Selection */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kategori *</label>
                <select 
                  value={formData.category_id} 
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })} 
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                >
                    <option value="">Pilih Kategori</option>
                    {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                    <option value="new">-- Tambah Kategori Baru --</option>
                </select>
                {formData.category_id === 'new' && (
                  <input 
                    type="text" 
                    placeholder="Nama kategori baru" 
                    value={newCategoryName} 
                    onChange={(e) => setNewCategoryName(e.target.value)} 
                    className="mt-2 w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                    disabled={loading}
                  />
                )}
            </div>
            
            {/* Brand Selection */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Merk *</label>
                <select 
                  value={formData.brand} 
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })} 
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                >
                    <option value="">Pilih Merk</option>
                    {brands.map(b => <option key={b} value={b}>{b}</option>)}
                    <option value="new">-- Tambah Merk Baru --</option>
                </select>
                {formData.brand === 'new' && (
                  <input 
                    type="text" 
                    placeholder="Nama merk baru" 
                    value={newBrandName} 
                    onChange={(e) => setNewBrandName(e.target.value)} 
                    className="mt-2 w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                    disabled={loading}
                  />
                )}
            </div>
            
            {/* Model */}
            <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Model / Tipe</label>
                <input 
                  type="text" 
                  value={formData.model} 
                  onChange={(e) => setFormData({...formData, model: e.target.value})} 
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                />
            </div>
            
            {/* Auto-generated Name */}
            <div className="bg-gray-50 p-3 rounded-md">
                <label className="block text-sm font-medium text-gray-500 mb-1">Nama Produk (Otomatis)</label>
                <input 
                  type="text" 
                  value={formData.name} 
                  className="w-full px-3 py-2 bg-gray-200 border rounded-md" 
                  readOnly 
                  disabled 
                />
            </div>
            
            {/* Auto-generated SKU */}
            <div className="bg-gray-50 p-3 rounded-md">
                <label className="block text-sm font-medium text-gray-500 mb-1">SKU (Otomatis)</label>
                <input 
                  type="text" 
                  value={formData.sku} 
                  className="w-full px-3 py-2 bg-gray-200 border rounded-md" 
                  readOnly 
                  disabled 
                />
            </div>
            
            {/* Cost Price */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Harga Modal</label>
                <input 
                  type="number" 
                  value={formData.cost_price} 
                  onChange={(e) => setFormData({...formData, cost_price: e.target.value})} 
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500" 
                  min="0"
                  disabled={loading}
                />
            </div>
            
            {/* Selling Price */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Harga Jual</label>
                <input 
                  type="number" 
                  value={formData.selling_price} 
                  onChange={(e) => setFormData({...formData, selling_price: e.target.value})} 
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500" 
                  min="0"
                  disabled={loading}
                />
            </div>
            
            {/* Initial Stock (only for new products) */}
            {!product && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stok Awal</label>
                <input 
                  type="number" 
                  value={initialStock} 
                  onChange={(e) => setInitialStock(Number(e.target.value))} 
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500" 
                  min="0"
                  disabled={loading}
                />
              </div>
            )}
        </div>
        
        {/* Action Buttons */}
        <div className="flex gap-3 justify-end mt-6 pt-4 border-t">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium" 
              disabled={loading}
            >
              Batal
            </button>
            <button 
              type="submit" 
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium disabled:bg-blue-400 disabled:cursor-not-allowed" 
              disabled={loading}
            >
              {loading ? 'Menyimpan...' : 'Simpan'}
            </button>
        </div>
      </form>
    </div>
  )
}

// --- STOCK MODAL COMPONENT ---
function StockModal({ product, onClose, onSave }) {
  const [adjustmentType, setAdjustmentType] = useState('in')
  const [quantity, setQuantity] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validation
    const qty = parseInt(quantity, 10)
    if (!quantity || isNaN(qty) || qty <= 0) { 
      toast.error('Jumlah harus berupa angka positif')
      return
    }

    // Prevent double submission
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
        
        {/* Product Info */}
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium text-gray-900">{product?.name}</h3>
          <p className="text-sm text-gray-500">SKU: {product?.sku}</p>
          <p className="text-sm text-gray-600">Stok Saat Ini: <span className="font-semibold">{product?.current_stock}</span></p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Adjustment Type */}
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
          
          {/* Quantity Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {adjustmentType === 'adjustment' ? 'Jumlah Stok Baru' : 'Jumlah'}
            </label>
            <input 
              type="number" 
              value={quantity} 
              onChange={(e) => setQuantity(e.target.value)} 
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500" 
              min="0" 
              step="1"
              placeholder={adjustmentType === 'adjustment' ? 'Masukkan jumlah stok final' : 'Masukkan jumlah'}
              disabled={loading}
              required 
            />
            {adjustmentType !== 'adjustment' && quantity && (
              <p className="text-xs text-gray-500 mt-1">
                Stok akan menjadi: {adjustmentType === 'in' 
                  ? product.current_stock + parseInt(quantity || 0) 
                  : Math.max(0, product.current_stock - parseInt(quantity || 0))
                }
              </p>
            )}
          </div>
          
          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
            <textarea 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)} 
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500" 
              rows="3"
              placeholder="Catatan penyesuaian stok (opsional)"
              disabled={loading}
            />
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button 
              type="button" 
              onClick={onClose} 
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium" 
              disabled={loading}
            >
              Batal
            </button>
            <button 
              type="submit" 
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium disabled:bg-green-400 disabled:cursor-not-allowed" 
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
