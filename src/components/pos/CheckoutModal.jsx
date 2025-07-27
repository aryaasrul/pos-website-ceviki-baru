// src/components/pos/CheckoutModal.jsx (FIXED)

import React, { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { formatCurrency } from '../../utils/formatters';

// --- PERBAIKAN: Hapus import yang tidak perlu ---
// import { transactionService } from '../../services/transactions';
// import { bluetoothPrinterService } from '../../services/bluetoothPrinterService';

export default function CheckoutModal({ 
  cart, 
  globalDiscount, 
  globalDiscountType, 
  onClose, 
  onConfirm, 
  employeeId,
  initialCustomerData
}) {
  const [customerName, setCustomerName] = useState(initialCustomerData?.name || '');
  const [customerPhone, setCustomerPhone] = useState(initialCustomerData?.phone || '');
  const [customerEmail, setCustomerEmail] = useState(initialCustomerData?.email || '');
  const [customerAddress, setCustomerAddress] = useState(initialCustomerData?.address || '');
  const [notes, setNotes] = useState('');

  const [amountPaid, setAmountPaid] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [taxPercent, setTaxPercent] = useState(0);
  const [loading, setLoading] = useState(false);

  const { subtotal, totalDiscount, taxAmount, finalTotal } = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + item.selling_price * item.quantity, 0);
    const totalItemDiscount = cart.reduce((sum, item) => {
      const itemSubtotal = item.selling_price * item.quantity;
      const discount = item.discountType === 'percentage' 
        ? (itemSubtotal * (item.discount || 0) / 100) 
        : (item.discount || 0);
      return sum + discount;
    }, 0);
    const subtotalAfterItemDiscount = subtotal - totalItemDiscount;
    const globalDiscountAmount = globalDiscountType === 'percentage' 
      ? (subtotalAfterItemDiscount * globalDiscount / 100) 
      : globalDiscount;
    const totalDiscount = totalItemDiscount + globalDiscountAmount;
    const baseForTax = subtotalAfterItemDiscount - globalDiscountAmount;
    const taxAmount = baseForTax * (taxPercent / 100);
    const finalTotal = baseForTax + taxAmount;
    return { subtotal, totalDiscount, taxAmount, finalTotal };
  }, [cart, globalDiscount, globalDiscountType, taxPercent]);

  const paid = Number(amountPaid) || 0;
  const change = paid > finalTotal ? paid - finalTotal : 0;
  const remainingBalance = finalTotal > paid ? finalTotal - paid : 0;

  const getPaymentType = () => {
    if (paid === 0 && finalTotal > 0) return 'none';
    if (remainingBalance > 0) return 'dp';
    if (change >= 0) return 'paid';
    return 'none';
  };
  const paymentType = getPaymentType();

  const validateForm = () => {
    if (!customerName.trim() || !customerPhone.trim() || !customerAddress.trim()) {
      toast.error('Informasi Pelanggan (Nama, Telepon, Alamat) wajib diisi.');
      return false;
    }
    if (paymentType === 'none') {
      toast.error('Jumlah pembayaran harus diisi.');
      return false;
    }
    return true;
  };

  // --- PERBAIKAN: Sederhanakan handleSubmit ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);

    // Kumpulkan semua data untuk dikirim kembali ke POS.jsx
    const checkoutData = {
        // Data Pembayaran
        payment_method: paymentMethod,
        amount_paid: parseFloat(paid),
        notes: notes.trim() || null,
        tax_percent: taxPercent,
        // Data Kalkulasi
        subtotal,
        total_discount: totalDiscount,
        tax_amount: taxAmount,
        final_total: finalTotal,
        change_amount: change,
        remaining_balance: remainingBalance,
        payment_type: paymentType,
        // Data Pelanggan
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        customer_address: customerAddress.trim(),
        customer_email: customerEmail.trim() || null,
    };

    // Panggil onConfirm dengan data lengkap
    try {
      await onConfirm(checkoutData);
      // Penutupan modal dan toast akan di-handle oleh POS.jsx
    } catch (error) {
      // Error akan ditangkap dan ditampilkan oleh handleCheckout di POS.jsx
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg max-h-[95vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-3">
          Detail Pembayaran
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Customer Information Section... (Tidak ada perubahan) */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-3">
            <h3 className="font-semibold text-gray-700">📋 Informasi Pelanggan</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700">Nama Pelanggan <span className="text-red-500">*</span></label>
              <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="mt-1 w-full px-3 py-2 border rounded-md" placeholder="Masukkan nama pelanggan" required disabled={loading}/>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Alamat <span className="text-red-500">*</span></label>
              <textarea value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} rows="2" className="mt-1 w-full px-3 py-2 border rounded-md" placeholder="Alamat lengkap pelanggan" required disabled={loading}/>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">No. Telepon <span className="text-red-500">*</span></label>
                <input type="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="mt-1 w-full px-3 py-2 border rounded-md" placeholder="08xxxxxxxxxx" required disabled={loading}/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email (Opsional)</label>
                <input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} className="mt-1 w-full px-3 py-2 border rounded-md" placeholder="email@example.com" disabled={loading}/>
              </div>
            </div>
          </div>
          {/* Payment Section... (Tidak ada perubahan) */}
          <div className="bg-blue-50 p-4 rounded-lg space-y-3">
            <h3 className="font-semibold text-blue-700">💳 Detail Pembayaran</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Metode Pembayaran</label>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="mt-1 w-full px-3 py-2 border rounded-md" disabled={loading}>
                  <option value="cash">💵 Tunai</option>
                  <option value="transfer">🏦 Transfer Bank</option>
                  <option value="qris">📱 QRIS</option>
                  <option value="debit">💳 Kartu Debit</option>
                  <option value="credit">💳 Kartu Kredit</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Jumlah Bayar <span className="text-red-500">*</span></label>
                <input type="number" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} className="mt-1 w-full px-3 py-2 border rounded-md" placeholder="Masukkan jumlah pembayaran" min="0" step="1" disabled={loading}/>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Pajak (%)</label>
              <input type="number" value={taxPercent} onChange={(e) => setTaxPercent(Number(e.target.value) || 0)} className="mt-1 w-full px-3 py-2 border rounded-md" placeholder="0" min="0" max="100" step="0.1" disabled={loading}/>
            </div>
          </div>
          {/* Payment Summary... (Tidak ada perubahan) */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-700 mb-3">📊 Ringkasan Transaksi</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span>Subtotal:</span><span className="font-medium">{formatCurrency(subtotal)}</span></div>
              {totalDiscount > 0 && (<div className="flex justify-between text-green-600"><span>Total Diskon:</span><span className="font-medium">-{formatCurrency(totalDiscount)}</span></div>)}
              {taxAmount > 0 && (<div className="flex justify-between text-orange-600"><span>Pajak ({taxPercent}%):</span><span className="font-medium">{formatCurrency(taxAmount)}</span></div>)}
              <div className="flex justify-between font-bold text-lg border-t pt-2"><span>Total Pembayaran:</span><span className="text-blue-600">{formatCurrency(finalTotal)}</span></div>
            </div>
          </div>
          {/* Payment Status Display... (Sedikit perubahan logika) */}
          {paid > 0 && (
            <div className={`p-4 rounded-lg border-2 ${paymentType === 'dp' ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'}`}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-3 h-3 rounded-full ${paymentType === 'dp' ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
                <span className={`font-semibold ${paymentType === 'dp' ? 'text-yellow-700' : 'text-green-700'}`}>
                  {paymentType === 'dp' ? '🟡 Pembayaran DP (Cicilan)' : '🟢 Lunas'}
                </span>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-gray-600">Dibayar:</span><span className="font-medium text-blue-600">{formatCurrency(paid)}</span></div>
                {remainingBalance > 0 && (<div className="flex justify-between"><span className="text-gray-600">Sisa Tagihan:</span><span className="font-bold text-yellow-600">{formatCurrency(remainingBalance)}</span></div>)}
                {change > 0 && (<div className="flex justify-between"><span className="text-gray-600">Kembalian:</span><span className="font-bold text-green-600">{formatCurrency(change)}</span></div>)}
              </div>
            </div>
          )}
          {/* Notes Section... (Tidak ada perubahan) */}
          <div>
            <label className="block text-sm font-medium text-gray-700">📝 Catatan (Opsional)</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows="2" className="mt-1 w-full px-3 py-2 border rounded-md" placeholder="Catatan tambahan..." disabled={loading}/>
          </div>
          {/* Action Buttons... (Tidak ada perubahan) */}
          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-6 py-2 border rounded-md text-gray-700 hover:bg-gray-50" disabled={loading}>❌ Batal</button>
            <button type="submit" className={`px-6 py-2 font-semibold rounded-md text-white transition-colors ${paymentType === 'dp' ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-blue-600 hover:bg-blue-700'} disabled:bg-gray-400`} disabled={loading || paymentType === 'none'}>
              {loading ? '⏳ Memproses...' : paymentType === 'dp' ? '🟡 Proses DP' : '✅ Konfirmasi Bayar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}