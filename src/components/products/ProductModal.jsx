import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import toast from 'react-hot-toast';

export default function ProductModal({ product, categories, onSave, onClose }) {
  const isEdit = !!product;
  
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category_id: '',
    brand: '',
    model: '',
    description: '',
    cost_price: '',
    selling_price: '',
    min_stock: '5',
    active: true
  });
  
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        sku: product.sku || '',
        category_id: product.category_id || '',
        brand: product.brand || '',
        model: product.model || '',
        description: product.description || '',
        cost_price: product.cost_price || '',
        selling_price: product.selling_price || '',
        min_stock: product.min_stock || '5',
        active: product.active ?? true
      });
    }
  }, [product]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      toast.error('Nama produk wajib diisi');
      return false;
    }
    if (!formData.sku.trim()) {
      toast.error('SKU wajib diisi');
      return false;
    }
    if (!formData.category_id) {
      toast.error('Kategori wajib dipilih');
      return false;
    }
    if (!formData.selling_price || parseFloat(formData.selling_price) <= 0) {
      toast.error('Harga jual harus lebih dari 0');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    try {
      const productData = {
        name: formData.name.trim(),
        sku: formData.sku.trim().toUpperCase(),
        category_id: formData.category_id,
        brand: formData.brand.trim() || null,
        model: formData.model.trim() || null,
        description: formData.description.trim() || null,
        cost_price: parseFloat(formData.cost_price) || 0,
        selling_price: parseFloat(formData.selling_price),
        min_stock: parseInt(formData.min_stock) || 5,
        active: formData.active,
        updated_at: new Date().toISOString()
      };

      if (isEdit) {
        // Update existing product
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', product.id);

        if (error) throw error;
        toast.success('Produk berhasil diperbarui');
      } else {
        // Create new product
        productData.current_stock = 0; // New products start with 0 stock
        
        const { error } = await supabase
          .from('products')
          .insert(productData);

        if (error) throw error;
        toast.success('Produk berhasil ditambahkan');
      }

      onSave();
    } catch (error) {
      console.error('Error saving product:', error);
      if (error.code === '23505') {
        toast.error('SKU sudah digunakan');
      } else {
        toast.error('Gagal menyimpan produk');
      }
    } finally {
      setLoading(false);
    }
  };

  // Calculate profit margin
  const profitMargin = formData.cost_price && formData.selling_price
    ? ((parseFloat(formData.selling_price) - parseFloat(formData.cost_price)) / parseFloat(formData.selling_price) * 100).toFixed(1)
    : 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="relative w-full max-w-2xl bg-white rounded-lg shadow-xl">
          <div className="border-b px-6 py-4">
            <h2 className="text-xl font-semibold text-gray-900">
              {isEdit ? 'Edit Produk' : 'Tambah Produk Baru'}
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Nama Produk */}
              <div className="md:col-span-2">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Nama Produk <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Contoh: TV LED Samsung 32 inch"
                  required
                />
              </div>

              {/* SKU */}
              <div>
                <label htmlFor="sku" className="block text-sm font-medium text-gray-700 mb-1">
                  SKU <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="sku"
                  name="sku"
                  value={formData.sku}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Contoh: TV-SAM-32"
                  required
                />
              </div>

              {/* Kategori */}
              <div>
                <label htmlFor="category_id" className="block text-sm font-medium text-gray-700 mb-1">
                  Kategori <span className="text-red-500">*</span>
                </label>
                <select
                  id="category_id"
                  name="category_id"
                  value={formData.category_id}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Pilih Kategori</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Brand */}
              <div>
                <label htmlFor="brand" className="block text-sm font-medium text-gray-700 mb-1">
                  Brand/Merek
                </label>
                <input
                  type="text"
                  id="brand"
                  name="brand"
                  value={formData.brand}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Contoh: Samsung"
                />
              </div>

              {/* Model */}
              <div>
                <label htmlFor="model" className="block text-sm font-medium text-gray-700 mb-1">
                  Model/Tipe
                </label>
                <input
                  type="text"
                  id="model"
                  name="model"
                  value={formData.model}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Contoh: UA32T4500"
                />
              </div>

              {/* Harga Modal */}
              <div>
                <label htmlFor="cost_price" className="block text-sm font-medium text-gray-700 mb-1">
                  Harga Modal (HPP)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                    Rp
                  </span>
                  <input
                    type="number"
                    id="cost_price"
                    name="cost_price"
                    value={formData.cost_price}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0"
                    min="0"
                    step="1"
                  />
                </div>
              </div>

              {/* Harga Jual */}
              <div>
                <label htmlFor="selling_price" className="block text-sm font-medium text-gray-700 mb-1">
                  Harga Jual <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                    Rp
                  </span>
                  <input
                    type="number"
                    id="selling_price"
                    name="selling_price"
                    value={formData.selling_price}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0"
                    min="0"
                    step="1"
                    required
                  />
                </div>
                {profitMargin > 0 && (
                  <p className="text-xs text-green-600 mt-1">
                    Margin: {profitMargin}%
                  </p>
                )}
              </div>

              {/* Stok Minimum */}
              <div>
                <label htmlFor="min_stock" className="block text-sm font-medium text-gray-700 mb-1">
                  Stok Minimum
                </label>
                <input
                  type="number"
                  id="min_stock"
                  name="min_stock"
                  value={formData.min_stock}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="5"
                  min="0"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Notifikasi akan muncul jika stok di bawah nilai ini
                </p>
              </div>

              {/* Deskripsi */}
              <div className="md:col-span-2">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Deskripsi
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows="3"
                  placeholder="Deskripsi produk (opsional)"
                />
              </div>

              {/* Status Aktif */}
              <div className="md:col-span-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="active"
                    checked={formData.active}
                    onChange={handleInputChange}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Produk Aktif
                  </span>
                </label>
                <p className="text-xs text-gray-500 mt-1 ml-6">
                  Produk tidak aktif tidak akan muncul di POS
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-blue-400"
              >
                {loading ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Tambah Produk'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}