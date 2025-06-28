import React, { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { productService } from '../services/products'
import { formatCurrency } from '../utils/formatters'
import Header from '../components/layout/Header'
import toast from 'react-hot-toast'
import { supabase } from '../services/supabase'

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
    // min_stock dihapus dari sini
  })
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newBrandName, setNewBrandName] = useState('')
  const [loading, setLoading] = useState(false)
  const [initialStock, setInitialStock] = useState(0);

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
    
    let finalCategoryId = formData.category_id;
    let finalBrandName = formData.brand;

    if (!finalCategoryId || (finalCategoryId === 'new' && !newCategoryName.trim())) { toast.error('Kategori wajib diisi'); return; }
    if (!finalBrandName || (finalBrandName === 'new' && !newBrandName.trim())) { toast.error('Merk wajib diisi'); return; }

    setLoading(true)
    try {
        if (finalCategoryId === 'new') {
            const { data: newCategory, error: catError } = await supabase.from('categories').insert({ name: newCategoryName.trim() }).select().single()
            if (catError) throw catError
            finalCategoryId = newCategory.id
        }

        if (finalBrandName === 'new') {
            finalBrandName = newBrandName.trim();
        }

        const productData = {
            ...formData,
            category_id: finalCategoryId,
            brand: finalBrandName,
            cost_price: parseFloat(formData.cost_price),
            selling_price: parseFloat(formData.selling_price),
            // min_stock dihapus dari sini
        }

        let error;
        if (product) {
            ({ error } = await supabase.from('products').update(productData).eq('id', product.id))
        } else {
            productData.current_stock = initialStock;
            ({ error } = await supabase.from('products').insert(productData))
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
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kategori *</label>
                <select value={formData.category_id} onChange={(e) => setFormData({ ...formData, category_id: e.target.value })} className="w-full px-3 py-2 border rounded-md">
                    <option value="">Pilih Kategori</option>
                    {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                    <option value="new">-- Tambah Kategori Baru --</option>
                </select>
                {formData.category_id === 'new' && <input type="text" placeholder="Nama kategori baru" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} className="mt-2 w-full px-3 py-2 border rounded-md" />}
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Merk *</label>
                <select value={formData.brand} onChange={(e) => setFormData({ ...formData, brand: e.target.value })} className="w-full px-3 py-2 border rounded-md">
                    <option value="">Pilih Merk</option>
                    {brands.map(b => <option key={b} value={b}>{b}</option>)}
                    <option value="new">-- Tambah Merk Baru --</option>
                </select>
                {formData.brand === 'new' && <input type="text" placeholder="Nama merk baru" value={newBrandName} onChange={(e) => setNewBrandName(e.target.value)} className="mt-2 w-full px-3 py-2 border rounded-md" />}
            </div>
            <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Model / Tipe</label>
                <input type="text" value={formData.model} onChange={(e) => setFormData({...formData, model: e.target.value})} className="w-full px-3 py-2 border rounded-md" />
            </div>
            <div className="bg-gray-50 p-3 rounded-md"><label className="block text-sm font-medium text-gray-500 mb-1">Nama Produk (Otomatis)</label><input type="text" value={formData.name} className="w-full px-3 py-2 bg-gray-200 border rounded-md" readOnly disabled /></div>
            <div className="bg-gray-50 p-3 rounded-md"><label className="block text-sm font-medium text-gray-500 mb-1">SKU (Otomatis)</label><input type="text" value={formData.sku} className="w-full px-3 py-2 bg-gray-200 border rounded-md" readOnly disabled /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Harga Modal</label><input type="number" value={formData.cost_price} onChange={(e) => setFormData({...formData, cost_price: e.target.value})} className="w-full px-3 py-2 border rounded-md" min="0" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Harga Jual</label><input type="number" value={formData.selling_price} onChange={(e) => setFormData({...formData, selling_price: e.target.value})} className="w-full px-3 py-2 border rounded-md" min="0" /></div>
            
            {!product && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stok Awal</label>
                <input type="number" value={initialStock} onChange={(e) => setInitialStock(Number(e.target.value))} className="w-full px-3 py-2 border rounded-md" min="0" />
              </div>
            )}
            
            {/* Input Stok Minimum Dihapus */}
        </div>
        
        <div className="flex gap-3 justify-end mt-6 pt-4 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-md" disabled={loading}>Batal</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md" disabled={loading}>{loading ? 'Menyimpan...' : 'Simpan'}</button>
        </div>
      </form>
    </div>
  )
}

// --- STOCK MODAL COMPONENT ---
function StockModal({ product, onClose, onSave }) {
  const [adjustmentType, setAdjustmentType] = useState('in');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!quantity || parseInt(quantity) < 0) { toast.error('Jumlah tidak valid'); return; }

    setLoading(true);
    try {
        // --- PERBAIKAN: Menghapus p_user_id ---
        const { error } = await supabase.rpc('adjust_stock', {
            p_product_id: product.id,
            p_type: adjustmentType,
            p_quantity: parseInt(quantity, 10),
            p_notes: notes || `Penyesuaian stok (${adjustmentType})`
        });

        if (error) throw error;
        toast.success('Stok berhasil diupdate');
        onSave();
    } catch (error) {
        toast.error('Gagal update stok: ' + error.message);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Penyesuaian Stok</h2>
        <div className="mb-4 p-4 bg-gray-50 rounded">
          <h3 className="font-medium">{product?.name}</h3>
          <p className="text-sm text-gray-500">Stok Saat Ini: {product?.current_stock}</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipe</label>
            <select value={adjustmentType} onChange={(e) => setAdjustmentType(e.target.value)} className="w-full px-3 py-2 border rounded-md">
              <option value="in">Stok Masuk</option>
              <option value="out">Stok Keluar</option>
              <option value="adjustment">Setel Ulang Stok</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{adjustmentType === 'adjustment' ? 'Jumlah Stok Baru' : 'Jumlah'}</label>
            <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-full px-3 py-2 border rounded-md" min="0" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full px-3 py-2 border rounded-md" rows="3" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border rounded-md" disabled={loading}>Batal</button>
            <button type="submit" className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md" disabled={loading}>{loading ? 'Menyimpan...' : 'Simpan'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
