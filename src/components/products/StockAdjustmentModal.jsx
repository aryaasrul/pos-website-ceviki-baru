import React, { useState } from 'react';
import { supabase } from '../../services/supabase';
import toast from 'react-hot-toast';

export default function StockAdjustmentModal({ product, onSave, onClose }) {
  const [adjustmentType, setAdjustmentType] = useState('in');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const qty = parseInt(quantity);
    if (!qty || qty <= 0) {
      toast.error('Jumlah harus lebih dari 0');
      return;
    }

    // Validasi untuk stok keluar
    if (adjustmentType === 'out' && qty > product.current_stock) {
      toast.error('Jumlah melebihi stok tersedia');
      return;
    }

    setLoading(true);
    try {
      // Hitung quantity berdasarkan tipe
      let finalQuantity = qty;
      if (adjustmentType === 'out') {
        finalQuantity = -qty; // Negatif untuk pengurangan
      } else if (adjustmentType === 'adjustment') {
        // Untuk adjustment, quantity adalah nilai stok baru
        finalQuantity = qty - product.current_stock;
      }

      // Insert ke stock_movements
      const { error: movementError } = await supabase
        .from('stock_movements')
        .insert({
          product_id: product.id,
          type: adjustmentType,
          quantity: finalQuantity,
          reference_type: adjustmentType === 'adjustment' ? 'adjustment' : adjustmentType === 'in' ? 'stock_in' : 'stock_out',
          notes: notes || null,
          created_by: (await supabase.auth.getUser()).data.user?.id
        });

      if (movementError) throw movementError;

      // Update stok produk
      let newStock;
      if (adjustmentType === 'adjustment') {
        newStock = qty;
      } else if (adjustmentType === 'in') {
        newStock = product.current_stock + qty;
      } else {
        newStock = product.current_stock - qty;
      }

      const { error: updateError } = await supabase
        .from('products')
        .update({ 
          current_stock: newStock,
          updated_at: new Date().toISOString()
        })
        .eq('id', product.id);

      if (updateError) throw updateError;

      toast.success('Stok berhasil diperbarui');
      onSave();
    } catch (error) {
      console.error('Error adjusting stock:', error);
      toast.error('Gagal memperbarui stok');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="relative w-full max-w-md bg-white rounded-lg shadow-xl">
          <div className="border-b px-6 py-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Atur Stok: {product.name}
            </h2>
            <p className="text-sm text-gray-500">
              Stok saat ini: {product.current_stock}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-6">
            <div className="space-y-4">
              {/* Tipe Penyesuaian */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipe Penyesuaian
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustmentType('in')}
                    className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      adjustmentType === 'in'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Stok Masuk
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustmentType('out')}
                    className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      adjustmentType === 'out'
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Stok Keluar
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustmentType('adjustment')}
                    className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      adjustmentType === 'adjustment'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Setel Ulang
                  </button>
                </div>
              </div>

              {/* Jumlah */}
              <div>
                <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">
                  {adjustmentType === 'adjustment' ? 'Stok Baru' : 'Jumlah'}
                </label>
                <input
                  type="number"
                  id="quantity"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={adjustmentType === 'adjustment' ? 'Masukkan stok baru' : 'Masukkan jumlah'}
                  min="0"
                  required
                />
                {adjustmentType === 'out' && (
                  <p className="text-xs text-gray-500 mt-1">
                    Maksimal: {product.current_stock}
                  </p>
                )}
              </div>

              {/* Catatan */}
              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                  Catatan (Opsional)
                </label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows="3"
                  placeholder="Tambahkan catatan..."
                />
              </div>

              {/* Preview */}
              {quantity && parseInt(quantity) > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-700">Preview:</p>
                  <div className="mt-2 space-y-1">
                    <p className="text-sm text-gray-600">
                      Stok saat ini: {product.current_stock}
                    </p>
                    <p className="text-sm text-gray-600">
                      {adjustmentType === 'in' && `Tambah: +${quantity}`}
                      {adjustmentType === 'out' && `Kurang: -${quantity}`}
                      {adjustmentType === 'adjustment' && `Setel ke: ${quantity}`}
                    </p>
                    <p className="text-sm font-semibold text-gray-900">
                      Stok baru: {
                        adjustmentType === 'adjustment' 
                          ? quantity
                          : adjustmentType === 'in' 
                          ? product.current_stock + parseInt(quantity)
                          : product.current_stock - parseInt(quantity)
                      }
                    </p>
                  </div>
                </div>
              )}
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
                disabled={loading || !quantity}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-blue-400"
              >
                {loading ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}