// src/components/transactions/EditTransactionModal.jsx
import React, { useState, useEffect } from 'react';
import { X, Plus, Minus, AlertTriangle, Save, History } from 'lucide-react';
import transactionEditService from '../../services/transactionEditService';
import { formatCurrency } from '../../utils/formatters';
import toast from 'react-hot-toast';

const EditTransactionModal = ({ transactionId, isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [transaction, setTransaction] = useState(null);
  const [items, setItems] = useState([]);
  const [editReason, setEditReason] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [editHistory, setEditHistory] = useState([]);
  const [errors, setErrors] = useState([]);

  useEffect(() => {
    if (isOpen && transactionId) {
      loadTransactionData();
    }
  }, [isOpen, transactionId]);

  const loadTransactionData = async () => {
    try {
      setLoading(true);
      setErrors([]);

      // Check if user is owner
      const isOwner = await transactionEditService.checkOwnerRole();
      if (!isOwner) {
        setErrors(['Hanya owner yang dapat mengedit transaksi']);
        return;
      }

      // Check if transaction can be edited
      const { canEdit, reason } = await transactionEditService.canEditTransaction(transactionId);
      if (!canEdit) {
        setErrors([reason]);
        return;
      }

      // Load transaction data
      const data = await transactionEditService.getTransactionForEdit(transactionId);
      setTransaction(data.transaction);
      setItems(data.items.map(item => ({
        ...item,
        originalQuantity: item.quantity,
        unit_price: item.unit_price || item.product.selling_price
      })));

      // Load edit history
      const history = await transactionEditService.getEditHistory(transactionId);
      setEditHistory(history);

    } catch (error) {
      console.error('Error loading transaction:', error);
      setErrors([error.message]);
    } finally {
      setLoading(false);
    }
  };

  const updateItemQuantity = (index, newQuantity) => {
    if (newQuantity < 0) return;
    
    const updatedItems = [...items];
    updatedItems[index] = {
      ...updatedItems[index],
      quantity: newQuantity,
      subtotal: newQuantity * updatedItems[index].unit_price
    };
    setItems(updatedItems);
  };

  const updateItemPrice = (index, newPrice) => {
    if (newPrice < 0) return;
    
    const updatedItems = [...items];
    updatedItems[index] = {
      ...updatedItems[index],
      unit_price: newPrice,
      subtotal: updatedItems[index].quantity * newPrice
    };
    setItems(updatedItems);
  };

  const removeItem = (index) => {
    const updatedItems = items.filter((_, i) => i !== index);
    setItems(updatedItems);
  };

  const calculateTotals = () => {
    return transactionEditService.calculateTotals(
      items,
      transaction?.discount_amount || 0,
      transaction?.tax_amount || 0
    );
  };

  const handleSave = async () => {
    if (!editReason.trim()) {
      toast.error('Alasan edit harus diisi');
      return;
    }

    if (items.length === 0) {
      toast.error('Minimal harus ada satu item');
      return;
    }

    setSaving(true);
    const toastId = toast.loading('Menyimpan perubahan...');

    try {
      // Validate stock
      const originalItems = items.map(item => ({
        product_id: item.product_id,
        quantity: item.originalQuantity
      }));

      const validation = await transactionEditService.validateStock(items, originalItems);
      if (!validation.valid) {
        throw new Error(validation.errors.join(', '));
      }

      // Prepare edit data
      const editData = {
        items: items.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_amount: item.discount_amount || 0,
          discount_type: item.discount_type || 'amount'
        })),
        customer_name: transaction.customer_name,
        customer_phone: transaction.customer_phone,
        discount_amount: transaction.discount_amount || 0,
        tax_amount: transaction.tax_amount || 0
      };

      await transactionEditService.editTransaction(transactionId, editData, editReason);
      
      toast.success('Transaksi berhasil diedit', { id: toastId });
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error saving transaction:', error);
      toast.error('Gagal menyimpan: ' + error.message, { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const totals = calculateTotals();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold">Edit Transaksi</h2>
            {transaction && (
              <span className="text-sm text-gray-600">
                {transaction.transaction_number}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              title="Lihat History Edit"
            >
              <History size={20} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : errors.length > 0 ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-red-800">
                <AlertTriangle size={20} />
                <span className="font-medium">Tidak dapat mengedit transaksi</span>
              </div>
              <ul className="mt-2 text-red-700">
                {errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Transaction Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium mb-3">Informasi Transaksi</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Tanggal:</span>
                    <p className="font-medium">
                      {new Date(transaction.transaction_date).toLocaleDateString('id-ID')}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">Kasir:</span>
                    <p className="font-medium">{transaction.employee?.name}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Customer:</span>
                    <p className="font-medium">{transaction.customer_name || 'Walk-in'}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Total Asli:</span>
                    <p className="font-medium">{formatCurrency(transaction.total_amount)}</p>
                  </div>
                </div>
              </div>

              {/* Edit History */}
              {showHistory && editHistory.length > 0 && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="font-medium mb-3">History Edit</h3>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {editHistory.map((edit, index) => (
                      <div key={edit.id} className="text-sm border-l-2 border-blue-300 pl-3">
                        <div className="flex justify-between items-start">
                          <span className="font-medium">{edit.editor?.name}</span>
                          <span className="text-gray-600">
                            {new Date(edit.created_at).toLocaleString('id-ID')}
                          </span>
                        </div>
                        <p className="text-gray-700">{edit.edit_reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Items */}
              <div>
                <h3 className="font-medium mb-3">Items Transaksi</h3>
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 grid grid-cols-12 gap-2 text-sm font-medium text-gray-700">
                    <div className="col-span-4">Produk</div>
                    <div className="col-span-2 text-center">Qty</div>
                    <div className="col-span-2 text-right">Harga</div>
                    <div className="col-span-2 text-right">Subtotal</div>
                    <div className="col-span-2 text-center">Aksi</div>
                  </div>
                  
                  {items.map((item, index) => (
                    <div key={item.id || index} className="px-4 py-3 border-t grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-4">
                        <p className="font-medium">{item.product.name}</p>
                        <p className="text-sm text-gray-600">{item.product.sku}</p>
                        {item.quantity !== item.originalQuantity && (
                          <p className="text-xs text-blue-600">
                            Asli: {item.originalQuantity}
                          </p>
                        )}
                      </div>
                      
                      <div className="col-span-2 flex items-center justify-center gap-2">
                        <button
                          onClick={() => updateItemQuantity(index, item.quantity - 1)}
                          className="p-1 rounded-md hover:bg-gray-100"
                          disabled={item.quantity <= 0}
                        >
                          <Minus size={16} />
                        </button>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItemQuantity(index, parseInt(e.target.value) || 0)}
                          className="w-16 text-center border rounded px-2 py-1"
                          min="0"
                        />
                        <button
                          onClick={() => updateItemQuantity(index, item.quantity + 1)}
                          className="p-1 rounded-md hover:bg-gray-100"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                      
                      <div className="col-span-2 text-right">
                        <input
                          type="number"
                          value={item.unit_price}
                          onChange={(e) => updateItemPrice(index, parseFloat(e.target.value) || 0)}
                          className="w-full text-right border rounded px-2 py-1"
                          min="0"
                        />
                      </div>
                      
                      <div className="col-span-2 text-right font-medium">
                        {formatCurrency(item.quantity * item.unit_price)}
                      </div>
                      
                      <div className="col-span-2 text-center">
                        <button
                          onClick={() => removeItem(index)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded-md"
                          disabled={items.length === 1}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span className="font-medium">{formatCurrency(totals.subtotal)}</span>
                  </div>
                  {transaction.discount_amount > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Diskon:</span>
                      <span>-{formatCurrency(transaction.discount_amount)}</span>
                    </div>
                  )}
                  {transaction.tax_amount > 0 && (
                    <div className="flex justify-between">
                      <span>Pajak:</span>
                      <span>{formatCurrency(transaction.tax_amount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>Total Baru:</span>
                    <span>{formatCurrency(totals.totalAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Selisih:</span>
                    <span className={totals.totalAmount - transaction.total_amount >= 0 ? 'text-red-600' : 'text-green-600'}>
                      {totals.totalAmount - transaction.total_amount >= 0 ? '+' : ''}
                      {formatCurrency(totals.totalAmount - transaction.total_amount)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Edit Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Alasan Edit <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Jelaskan alasan mengapa transaksi ini diedit..."
                  required
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && errors.length === 0 && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              disabled={saving}
            >
              Batal
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !editReason.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 flex items-center gap-2"
            >
              <Save size={16} />
              {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EditTransactionModal;