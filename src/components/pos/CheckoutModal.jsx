// ================================================
// CHECKOUT MODAL - FULLY WORKING VERSION
// File: src/components/pos/CheckoutModal.jsx
// ================================================

import React, { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { formatCurrency } from '../../utils/formatters';
import { transactionService } from '../../services/transactions';
import { bluetoothPrinterService } from '../../services/bluetoothPrinterService';

export default function CheckoutModal({ 
  cart, 
  globalDiscount, 
  globalDiscountType, 
  onClose, 
  onConfirm, 
  employeeId 
}) {
  // ===================================================================
  // STATE MANAGEMENT
  // ===================================================================
  
  // State untuk data pelanggan
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [notes, setNotes] = useState('');

  // State untuk pembayaran
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [taxPercent, setTaxPercent] = useState(0);
  const [loading, setLoading] = useState(false);

  // ===================================================================
  // CALCULATIONS
  // ===================================================================

  // Kalkulasi total belanja
  const { subtotal, totalDiscount, taxAmount, finalTotal } = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + item.selling_price * item.quantity, 0);
    
    // Item discount
    const totalItemDiscount = cart.reduce((sum, item) => {
      const itemSubtotal = item.selling_price * item.quantity;
      const discount = item.discountType === 'percentage' 
        ? (itemSubtotal * (item.discount || 0) / 100) 
        : (item.discount || 0);
      return sum + discount;
    }, 0);
    
    // Global discount
    const subtotalAfterItemDiscount = subtotal - totalItemDiscount;
    const globalDiscountAmount = globalDiscountType === 'percentage' 
      ? (subtotalAfterItemDiscount * globalDiscount / 100) 
      : globalDiscount;
    
    const totalDiscount = totalItemDiscount + globalDiscountAmount;
    
    // Tax calculation
    const baseForTax = subtotalAfterItemDiscount - globalDiscountAmount;
    const taxAmount = baseForTax * (taxPercent / 100);
    
    const finalTotal = baseForTax + taxAmount;

    return { subtotal, totalDiscount, taxAmount, finalTotal };
  }, [cart, globalDiscount, globalDiscountType, taxPercent]);

  // Kalkulasi pembayaran
  const paid = Number(amountPaid) || 0;
  const change = paid > finalTotal ? paid - finalTotal : 0;
  const remainingBalance = finalTotal > paid ? finalTotal - paid : 0;

  const getPaymentType = () => {
    if (paid === 0) return 'none';
    if (remainingBalance > 0) return 'dp';
    if (change > 0) return 'overpaid';
    return 'exact';
  };

  const paymentType = getPaymentType();

  // ===================================================================
  // FORM VALIDATION
  // ===================================================================

  const validateForm = () => {
    if (!customerName.trim()) {
      toast.error('Nama pelanggan wajib diisi');
      return false;
    }
    
    if (!customerPhone.trim()) {
      toast.error('Nomor telepon wajib diisi');
      return false;
    }
    
    if (!customerAddress.trim()) {
      toast.error('Alamat pelanggan wajib diisi');
      return false;
    }
    
    if (paid <= 0 && finalTotal > 0) {
      toast.error('Jumlah pembayaran harus lebih dari nol');
      return false;
    }

    return true;
  };

  // ===================================================================
  // FORM SUBMIT HANDLER
  // ===================================================================

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    const toastId = toast.loading('Memproses transaksi...');

    try {
      // Format data transaksi
      const transactionData = {
        items: cart.map(item => ({
          product_id: item.id,
          quantity: parseInt(item.quantity),
          price: parseFloat(item.selling_price),
          discount: parseFloat(item.discount || 0),
          discount_type: item.discountType || 'amount'
        })),
        cashier_id: employeeId,
        discount_amount_global: parseFloat(globalDiscount || 0),
        payment_method: paymentMethod,
        amount_paid: parseFloat(paid),
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        customer_address: customerAddress.trim(),
        customer_email: customerEmail.trim() || null,
        notes: notes.trim() || null
      };

      console.log('🔄 Processing transaction:', transactionData);

      // Create transaction
      const result = await transactionService.createTransaction(transactionData);

      if (!result.success) {
        throw new Error(result.error || 'Transaksi gagal');
      }

      toast.success(`Transaksi berhasil! ${paymentType === 'dp' ? 'Pembayaran DP tercatat' : 'Pembayaran lunas'}`, { id: toastId });

      // Print receipt if printer available
      try {
        if (bluetoothPrinterService.isConnected()) {
          console.log('🖨️ Printing receipt...');
          await bluetoothPrinterService.printReceipt({
            transactionId: result.transaction_id,
            transactionNumber: result.transaction_number,
            items: cart,
            subtotal,
            totalDiscount,
            finalTotal,
            paid,
            change,
            remainingBalance,
            paymentMethod,
            paymentType,
            customerName,
            customerPhone,
            customerAddress
          });
          toast.success('Struk berhasil dicetak');
        } else {
          toast('Transaksi berhasil, printer tidak terhubung', { icon: '⚠️' });
        }
      } catch (printError) {
        console.error('❌ Print error:', printError);
        toast.error('Transaksi berhasil, tapi gagal mencetak struk');
      }

      // Close modal dan refresh data
      onConfirm();

    } catch (error) {
      console.error('💥 Transaction error:', error);
      toast.error(`Transaksi gagal: ${error.message}`, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  // ===================================================================
  // RENDER JSX
  // ===================================================================

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg max-h-[95vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-3">
          Detail Pembayaran
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* ============================================ */}
          {/* CUSTOMER INFORMATION SECTION */}
          {/* ============================================ */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-3">
            <h3 className="font-semibold text-gray-700">📋 Informasi Pelanggan</h3>
            
            {/* Nama Pelanggan */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Nama Pelanggan <span className="text-red-500">*</span>
              </label>
              <input 
                type="text" 
                value={customerName} 
                onChange={(e) => setCustomerName(e.target.value)} 
                className="mt-1 w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                placeholder="Masukkan nama pelanggan" 
                required 
                disabled={loading}
              />
            </div>
            
            {/* Alamat */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Alamat <span className="text-red-500">*</span>
              </label>
              <textarea 
                value={customerAddress} 
                onChange={(e) => setCustomerAddress(e.target.value)} 
                rows="2" 
                className="mt-1 w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                placeholder="Alamat lengkap pelanggan" 
                required
                disabled={loading}
              />
            </div>
            
            {/* Telepon & Email */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  No. Telepon <span className="text-red-500">*</span>
                </label>
                <input 
                  type="tel" 
                  value={customerPhone} 
                  onChange={(e) => setCustomerPhone(e.target.value)} 
                  className="mt-1 w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                  placeholder="08xxxxxxxxxx" 
                  required
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Email (Opsional)
                </label>
                <input 
                  type="email" 
                  value={customerEmail} 
                  onChange={(e) => setCustomerEmail(e.target.value)} 
                  className="mt-1 w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                  placeholder="email@example.com" 
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {/* ============================================ */}
          {/* PAYMENT SECTION */}
          {/* ============================================ */}
          <div className="bg-blue-50 p-4 rounded-lg space-y-3">
            <h3 className="font-semibold text-blue-700">💳 Detail Pembayaran</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Metode Pembayaran
                </label>
                <select 
                  value={paymentMethod} 
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={loading}
                >
                  <option value="cash">💵 Tunai</option>
                  <option value="transfer">🏦 Transfer Bank</option>
                  <option value="qris">📱 QRIS</option>
                  <option value="debit">💳 Kartu Debit</option>
                  <option value="credit">💳 Kartu Kredit</option>
                </select>
              </div>
              
              {/* Amount Paid */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Jumlah Bayar <span className="text-red-500">*</span>
                </label>
                <input 
                  type="number" 
                  value={amountPaid} 
                  onChange={(e) => setAmountPaid(e.target.value)} 
                  className="mt-1 w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                  placeholder="Masukkan jumlah pembayaran" 
                  min="0" 
                  step="1000"
                  disabled={loading}
                />
              </div>
            </div>
            
            {/* Tax Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Pajak (%)
              </label>
              <input 
                type="number" 
                value={taxPercent} 
                onChange={(e) => setTaxPercent(Number(e.target.value) || 0)} 
                className="mt-1 w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                placeholder="0" 
                min="0" 
                max="100" 
                step="0.1"
                disabled={loading}
              />
            </div>
          </div>

          {/* ============================================ */}
          {/* PAYMENT SUMMARY */}
          {/* ============================================ */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-700 mb-3">📊 Ringkasan Transaksi</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              {totalDiscount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Total Diskon:</span>
                  <span className="font-medium">-{formatCurrency(totalDiscount)}</span>
                </div>
              )}
              {taxAmount > 0 && (
                <div className="flex justify-between text-orange-600">
                  <span>Pajak ({taxPercent}%):</span>
                  <span className="font-medium">{formatCurrency(taxAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Total Pembayaran:</span>
                <span className="text-blue-600">{formatCurrency(finalTotal)}</span>
              </div>
            </div>
          </div>

          {/* ============================================ */}
          {/* PAYMENT STATUS DISPLAY */}
          {/* ============================================ */}
          {paid > 0 && (
            <div className={`p-4 rounded-lg border-2 ${
              paymentType === 'dp' ? 'bg-yellow-50 border-yellow-200' :
              paymentType === 'overpaid' ? 'bg-green-50 border-green-200' :
              paymentType === 'exact' ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
            }`}>
              
              {/* Payment Type Indicator */}
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-3 h-3 rounded-full ${
                  paymentType === 'dp' ? 'bg-yellow-500' :
                  paymentType === 'overpaid' ? 'bg-green-500' :
                  paymentType === 'exact' ? 'bg-blue-500' : 'bg-gray-500'
                }`}></div>
                <span className={`font-semibold ${
                  paymentType === 'dp' ? 'text-yellow-700' :
                  paymentType === 'overpaid' ? 'text-green-700' :
                  paymentType === 'exact' ? 'text-blue-700' : 'text-gray-700'
                }`}>
                  {paymentType === 'dp' ? '🟡 Pembayaran DP (Cicilan)' :
                   paymentType === 'overpaid' ? '🟢 Lunas dengan Kembalian' :
                   paymentType === 'exact' ? '🔵 Pembayaran Lunas Pas' : 'Pembayaran'}
                </span>
              </div>
              
              {/* Payment Details */}
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Dibayar:</span>
                  <span className="font-medium text-blue-600">{formatCurrency(paid)}</span>
                </div>
                {remainingBalance > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Sisa Tagihan:</span>
                    <span className="font-bold text-yellow-600">{formatCurrency(remainingBalance)}</span>
                  </div>
                )}
                {change > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Kembalian:</span>
                    <span className="font-bold text-green-600">{formatCurrency(change)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ============================================ */}
          {/* NOTES SECTION */}
          {/* ============================================ */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              📝 Catatan (Opsional)
            </label>
            <textarea 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)} 
              rows="2" 
              className="mt-1 w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
              placeholder="Catatan tambahan untuk transaksi ini..." 
              disabled={loading}
            />
          </div>
          
          {/* ============================================ */}
          {/* ACTION BUTTONS */}
          {/* ============================================ */}
          <div className="pt-4 flex justify-end gap-3">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium transition-colors"
              disabled={loading}
            >
              ❌ Batal
            </button>
            <button 
              type="submit" 
              className={`px-6 py-2 font-semibold rounded-md text-white transition-colors ${
                paymentType === 'dp' ? 'bg-yellow-600 hover:bg-yellow-700' :
                paymentType === 'overpaid' ? 'bg-green-600 hover:bg-green-700' :
                'bg-blue-600 hover:bg-blue-700'
              } disabled:bg-gray-400`}
              disabled={loading}
            >
              {loading ? '⏳ Memproses...' : 
               paymentType === 'dp' ? '🟡 Proses DP' : 
               paymentType === 'overpaid' ? '🟢 Proses & Kembalian' : 
               '✅ Konfirmasi Bayar'}
            </button>
          </div>
          
        </form>
      </div>
    </div>
  );
}