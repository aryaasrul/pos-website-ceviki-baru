import React, { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { formatCurrency } from '../../utils/formatters';
// --- PENAMBAHAN IMPORT ---
import { transactionService } from '../../services/transactions';
import { bluetoothPrinterService } from '../../services/bluetoothPrinterService';

// --- PENAMBAHAN PROPS 'employeeId' & 'cart' ---
// Kita membutuhkan ini untuk menyimpan siapa yang melakukan transaksi dan apa saja itemnya
export default function CheckoutModal({ cart, globalDiscount, globalDiscountType, onClose, onConfirm, employeeId }) {
  // State untuk data pelanggan (Kode Asli Anda)
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [notes, setNotes] = useState('');

  // State untuk pembayaran (Kode Asli Anda)
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [taxPercent, setTaxPercent] = useState(0);

  // --- PENAMBAHAN STATE 'loading' ---
  // Untuk menonaktifkan tombol saat proses berjalan
  const [loading, setLoading] = useState(false);

  // Kalkulasi total belanja (Logika Asli Anda, tidak diubah)
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

  // Kalkulasi sisa bayar, kembalian, dan status pembayaran (Logika Asli Anda, tidak diubah)
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

  // --- FUNGSI HANDLE SUBMIT DIPERBARUI ---
  // Diubah menjadi async untuk menangani penyimpanan dan pencetakan
  const handleSubmit = async (e) => {
    e.preventDefault();
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
      // 1. Membuat objek data transaksi dari state yang sudah ada
      const transactionPayload = {
        cart: cart, // Menggunakan cart dari props
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_email: customerEmail,
        customer_address: customerAddress,
        notes: notes,
        subtotal: subtotal,
        discount_amount: totalDiscount,
        tax_amount: taxAmount,
        total_amount: finalTotal,
        amount_paid: paid,
        remaining_balance: remainingBalance,
        payment_method: paymentMethod,
        payment_status: paymentStatus,
        change_amount: change,
        employee_id: employeeId, // Menggunakan employeeId dari props
      };

      // 2. Memanggil service untuk membuat transaksi di database
      const newTransaction = await transactionService.createTransaction(transactionPayload);

      toast.success('Transaksi berhasil!', { id: toastId });
      
      // 3. Memanggil service printer dengan data transaksi yang baru dibuat
      await printerService.printReceipt(newTransaction);
      
      // 4. Memanggil prop onConfirm (sebagai onTransactionSuccess)
      onConfirm();

    } catch (error) {
      console.error("Transaction Error:", error);
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
          {/* Customer Information Section (Kode Asli Anda, tidak diubah) */}
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
                  placeholder="No. Telepon" 
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
                  placeholder="Alamat email" 
                  disabled={loading}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Catatan</label>
              <textarea 
                value={notes} 
                onChange={(e) => setNotes(e.target.value)} 
                rows="2" 
                className="mt-1 w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500" 
                placeholder="Catatan tambahan..." 
                disabled={loading}
              />
            </div>
          </div>

          {/* Order Summary Section (Kode Asli Anda, tidak diubah) */}
          <div className="bg-blue-50 p-4 rounded-lg space-y-2">
            <h3 className="font-semibold text-gray-700">Ringkasan Pesanan</h3>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-medium">{formatCurrency(subtotal)}</span>
            </div>
            {totalDiscount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Diskon:</span>
                <span className="font-medium text-green-600">-{formatCurrency(totalDiscount)}</span>
              </div>
            )}
            {taxAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Pajak ({taxPercent}%):</span>
                <span className="font-medium">{formatCurrency(taxAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2">
              <span className="text-gray-800">Total:</span>
              <span className="text-blue-600">{formatCurrency(finalTotal)}</span>
            </div>
          </div>

          {/* Payment Input Section (Kode Asli Anda, tidak diubah) */}
          <div className="bg-green-50 p-4 rounded-lg space-y-3">
            <h3 className="font-semibold text-gray-700">Detail Pembayaran</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-gray-700">Pajak (%)</label>
                <input 
                  type="number" 
                  value={taxPercent} 
                  onChange={(e) => setTaxPercent(Number(e.target.value))} 
                  className="mt-1 w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500" 
                  placeholder="0" 
                  min="0" 
                  disabled={loading}
                />
              </div>
              <div className="md:col-span-2">
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
            <div>
              <label className="block text-sm font-medium text-gray-700">Metode Pembayaran</label>
              <select 
                value={paymentMethod} 
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="mt-1 w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              >
                <option value="cash">Tunai</option>
                <option value="debit">Kartu Debit</option>
                <option value="credit">Kartu Kredit</option>
                <option value="qris">QRIS</option>
                <option value="transfer">Transfer Bank</option>
              </select>
            </div>
          </div>

          {/* Payment Status Display (Kode Asli Anda, tidak diubah) */}
          {paid > 0 && (
            <div className={`p-4 rounded-lg border-2 ${
              paymentType === 'dp' ? 'bg-yellow-50 border-yellow-200' :
              paymentType === 'overpaid' ? 'bg-green-50 border-green-200' :
              paymentType === 'exact' ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {paymentType === 'dp' && (<><div className="w-3 h-3 bg-yellow-500 rounded-full"></div><span className="font-semibold text-yellow-700">Pembayaran DP (Cicilan)</span></>)}
                {paymentType === 'overpaid' && (<><div className="w-3 h-3 bg-green-500 rounded-full"></div><span className="font-semibold text-green-700">Lunas dengan Kembalian</span></>)}
                {paymentType === 'exact' && (<><div className="w-3 h-3 bg-blue-500 rounded-full"></div><span className="font-semibold text-blue-700">Pembayaran Lunas Pas</span></>)}
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-gray-600">Dibayar:</span><span className="font-medium text-blue-600">{formatCurrency(paid)}</span></div>
                {remainingBalance > 0 && (<div className="flex justify-between"><span className="text-gray-600">Sisa Tagihan:</span><span className="font-bold text-yellow-600">{formatCurrency(remainingBalance)}</span></div>)}
                {change > 0 && (<div className="flex justify-between"><span className="text-gray-600">Kembalian:</span><span className="font-bold text-green-600">{formatCurrency(change)}</span></div>)}
              </div>
            </div>
          )}
          
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
