// ================================================
// FIX CHECKOUT MODAL IMPORTS - PRODUCTION READY
// File: src/components/pos/CheckoutModal.jsx
// ================================================

import React, { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { formatCurrency } from '../../utils/formatters';
import { transactionService } from '../../services/transactions';
// FIX: Ganti import ini dari printerService ke bluetoothPrinterService
import { bluetoothPrinterService } from '../../services/bluetoothPrinterService';

export default function CheckoutModal({ 
  cart, 
  globalDiscount, 
  globalDiscountType, 
  onClose, 
  onConfirm, 
  employeeId 
}) {
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

  // Kalkulasi total belanja
  const { subtotal, totalDiscount, taxAmount, finalTotal } = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + item.selling_price * item.quantity, 0);
    const totalItemDiscount = cart.reduce((sum, item) => {
      const itemSubtotal = item.selling_price * item.quantity;
      const discount = item.discountType === 'percentage' ? (itemSubtotal * (item.discount || 0) / 100) : (item.discount || 0);
      return sum + discount;
    }, 0);
    const subtotalAfterItemDiscount = subtotal - totalItemDiscount;
    const globalDiscountAmount = globalDiscountType === 'percentage' ? (subtotalAfterItemDiscount * globalDiscount / 100) : globalDiscount;
    const totalDiscount = totalItemDiscount + globalDiscountAmount;
    
    const baseForTax = subtotalAfterItemDiscount;
    const taxAmount = baseForTax * (taxPercent / 100);
    
    const finalTotal = baseForTax + taxAmount;

    return { subtotal, totalDiscount, taxAmount, finalTotal };
  }, [cart, globalDiscount, globalDiscountType, taxPercent]);

  // Kalkulasi pembayaran
  const paid = Number(amountPaid) || 0;
  const change = paid > finalTotal ? paid - finalTotal : 0;
  const remainingBalance = finalTotal > paid ? finalTotal - paid : 0;
  const paymentStatus = remainingBalance > 0 ? 'partial' : 'paid';

  const getPaymentType = () => {
    if (paid === 0) return 'none';
    if (remainingBalance > 0) return 'dp';
    if (change > 0) return 'overpaid';
    return 'exact';
  };

  const paymentType = getPaymentType();

  // Fungsi untuk mendapatkan shop info
  const getShopInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('shop_name, shop_address, shop_phone')
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      
      return {
        shop_name: data?.shop_name || 'POS TOKO',
        shop_address: data?.shop_address || 'Alamat Toko',
        shop_phone: data?.shop_phone || 'No. Telepon'
      };
    } catch (err) {
      console.error('Error fetching shop info:', err);
      return {
        shop_name: 'POS TOKO',
        shop_address: 'Alamat Toko',
        shop_phone: 'No. Telepon'
      };
    }
  };

  // Handle submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validasi
    if (!customerName.trim()) {
      toast.error('Nama pelanggan wajib diisi.');
      return;
    }
    if (paid <= 0 && finalTotal > 0) {
      toast.error('Jumlah bayar harus lebih dari nol.');
      return;
    }

    setLoading(true);
    const toastId = toast.loading('Memproses transaksi...');

    try {
      // 1. Format data transaksi untuk RPC function
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

      // 2. Create transaction
      const result = await transactionService.createTransaction(transactionData);

      if (!result.success) {
        throw new Error(result.error || 'Transaksi gagal');
      }

      toast.success('Transaksi berhasil!', { id: toastId });

      // 3. Print receipt jika printer terhubung
      try {
        if (bluetoothPrinterService.isConnected) {
          console.log('🖨️ Printing receipt...');
          
          const shopInfo = await getShopInfo();
          
          // Format data untuk printer
          const receiptData = {
            transaction_number: result.transaction_number,
            transaction_date: new Date().toISOString(),
            cashier_name: 'Kasir', // Bisa diganti dengan data employee
            customer_name: customerName,
            customer_phone: customerPhone,
            customer_address: customerAddress,
            transaction_items: cart.map(item => ({
              name: item.name,
              quantity: item.quantity,
              unit_price: item.selling_price,
              discount: item.discount || 0,
              discount_type: item.discountType || 'amount'
            })),
            subtotal: subtotal,
            discount_amount: totalDiscount,
            total_amount: finalTotal,
            amount_paid: paid,
            change_amount: change,
            notes: notes
          };

          await bluetoothPrinterService.printReceipt(receiptData, shopInfo);
          toast.success('Struk berhasil dicetak!');
        } else {
          console.log('⚠️ Printer not connected, skipping print');
          toast('Transaksi berhasil, printer tidak terhubung', { icon: '⚠️' });
        }
      } catch (printError) {
        console.error('❌ Print error:', printError);
        toast.error('Transaksi berhasil, tapi gagal mencetak struk');
      }

      // 4. Close modal dan refresh data
      onConfirm();

    } catch (error) {
      console.error('💥 Transaction error:', error);
      toast.error(`Transaksi gagal: ${error.message}`, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg max-h-[95vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-3">Detail Pembayaran</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Customer Information Section */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-3">
            <h3 className="font-semibold text-gray-700">Informasi Pelanggan</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700">Nama Pelanggan *</label>
              <input 
                type="text" 
                value={customerName} 
                onChange={(e) => setCustomerName(e.target.value)} 
                className="mt-1 w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500" 
                placeholder="Nama pelanggan" 
                required 
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Alamat</label>
              <textarea 
                value={customerAddress} 
                onChange={(e) => setCustomerAddress(e.target.value)} 
                rows="2" 
                className="mt-1 w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500" 
                placeholder="Alamat pengantaran (jika ada)" 
                disabled={loading}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Telepon</label>
                <input 
                  type="tel" 
                  value={customerPhone} 
                  onChange={(e) => setCustomerPhone(e.target.value)} 
                  className="mt-1 w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500" 
                  placeholder="No. telepon" 
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input 
                  type="email" 
                  value={customerEmail} 
                  onChange={(e) => setCustomerEmail(e.target.value)} 
                  className="mt-1 w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500" 
                  placeholder="Email (opsional)" 
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {/* Payment Section */}
          <div className="bg-blue-50 p-4 rounded-lg space-y-3">
            <h3 className="font-semibold text-blue-700">Detail Pembayaran</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Metode Pembayaran</label>
                <select 
                  value={paymentMethod} 
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                >
                  <option value="cash">Tunai</option>
                  <option value="transfer">Transfer Bank</option>
                  <option value="qris">QRIS</option>
                  <option value="debit">Kartu Debit</option>
                  <option value="credit">Kartu Kredit</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Jumlah Bayar</label>
                <input 
                  type="number" 
                  value={amountPaid} 
                  onChange={(e) => setAmountPaid(e.target.value)} 
                  className="mt-1 w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500" 
                  placeholder="Masukkan jumlah pembayaran" 
                  min="0" 
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {/* Payment Summary */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-700 mb-3">Ringkasan Transaksi</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {totalDiscount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Diskon:</span>
                  <span>-{formatCurrency(totalDiscount)}</span>
                </div>
              )}
              {taxAmount > 0 && (
                <div className="flex justify-between">
                  <span>Pajak ({taxPercent}%):</span>
                  <span>{formatCurrency(taxAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Total:</span>
                <span>{formatCurrency(finalTotal)}</span>
              </div>
            </div>
          </div>

          {/* Payment Status Display */}
          {paid > 0 && (
            <div className={`p-4 rounded-lg border-2 ${
              paymentType === 'dp' ? 'bg-yellow-50 border-yellow-200' :
              paymentType === 'overpaid' ? 'bg-green-50 border-green-200' :
              paymentType === 'exact' ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
            }`}>
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
                  {paymentType === 'dp' ? 'Pembayaran DP (Cicilan)' :
                   paymentType === 'overpaid' ? 'Lunas dengan Kembalian' :
                   paymentType === 'exact' ? 'Pembayaran Lunas Pas' : 'Pembayaran'}
                </span>
              </div>
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

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Catatan (Opsional)</label>
            <textarea 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)} 
              rows="2" 
              className="mt-1 w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500" 
              placeholder="Catatan tambahan..." 
              disabled={loading}
            />
          </div>
          
          {/* Action Buttons */}
          <div className="pt-4 flex justify-end gap-3">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium"
              disabled={loading}
            >
              Batal
            </button>
            <button 
              type="submit" 
              className={`px-6 py-2 font-semibold rounded-md text-white ${
                paymentType === 'dp' ? 'bg-yellow-600 hover:bg-yellow-700' :
                paymentType === 'overpaid' ? 'bg-green-600 hover:bg-green-700' :
                'bg-blue-600 hover:bg-blue-700'
              } disabled:bg-gray-400`}
              disabled={loading}
            >
              {loading ? 'Memproses...' : 
               paymentType === 'dp' ? 'Proses DP' : 
               paymentType === 'overpaid' ? 'Proses & Kembalian' : 
               'Konfirmasi Bayar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}