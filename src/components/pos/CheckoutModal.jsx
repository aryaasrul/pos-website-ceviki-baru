import React, { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { formatCurrency } from '../../utils/formatters';

export default function CheckoutModal({ cart, globalDiscount, globalDiscountType, onClose, onConfirm }) {
  // State untuk data pelanggan
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerAddress, setCustomerAddress] = useState(''); // State untuk alamat ditambahkan
  const [notes, setNotes] = useState('');

  // State untuk pembayaran
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [taxPercent, setTaxPercent] = useState(0);

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

  // Kalkulasi sisa bayar, kembalian, dan status pembayaran
  const paid = Number(amountPaid) || 0;
  const change = paid > finalTotal ? paid - finalTotal : 0;
  const remainingBalance = finalTotal > paid ? finalTotal - paid : 0;
  const paymentStatus = remainingBalance > 0 ? 'partial' : 'paid';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!customerName.trim()) {
      toast.error('Nama pelanggan wajib diisi.');
      return;
    }
    if (paid <= 0 && finalTotal > 0) {
      toast.error('Jumlah bayar harus lebih dari nol.');
      return;
    }

    onConfirm({
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_email: customerEmail,
      customer_address: customerAddress, // Mengirim data alamat
      notes: notes,
      subtotal: subtotal,
      discount_amount: totalDiscount,
      tax_amount: taxAmount,
      total_amount: finalTotal,
      amount_paid: paid,
      remaining_balance: remainingBalance,
      payment_method: paymentMethod,
      payment_status: paymentStatus,
      change: change,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg max-h-[95vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-3">Detail Pembayaran</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nama Pelanggan *</label>
            <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="mt-1 w-full px-3 py-2 border rounded-md" placeholder="Nama pelanggan" required />
          </div>
          
          {/* Kolom Alamat Ditambahkan di Sini */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Alamat</label>
            <textarea value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} rows="2" className="mt-1 w-full px-3 py-2 border rounded-md" placeholder="Alamat pengantaran (jika ada)" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Telepon</label>
              <input type="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="mt-1 w-full px-3 py-2 border rounded-md" placeholder="No. Telepon" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} className="mt-1 w-full px-3 py-2 border rounded-md" placeholder="Alamat email" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Catatan</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows="2" className="mt-1 w-full px-3 py-2 border rounded-md" placeholder="Catatan tambahan..." />
          </div>

          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between"><span className="text-gray-600">Subtotal:</span><span>{formatCurrency(subtotal)}</span></div>
            {totalDiscount > 0 && <div className="flex justify-between"><span className="text-gray-600">Diskon:</span><span>-{formatCurrency(totalDiscount)}</span></div>}
            {taxAmount > 0 && <div className="flex justify-between"><span className="text-gray-600">Pajak ({taxPercent}%):</span><span>{formatCurrency(taxAmount)}</span></div>}
            <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2"><span className="text-gray-800">Total:</span><span>{formatCurrency(finalTotal)}</span></div>
            {remainingBalance > 0 && <div className="flex justify-between text-red-600 font-bold"><span >Sisa Bayar:</span><span>{formatCurrency(remainingBalance)}</span></div>}
            {change > 0 && <div className="flex justify-between text-green-600 font-bold"><span>Kembalian:</span><span>{formatCurrency(change)}</span></div>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-700">Pajak (%)</label>
              <input type="number" value={taxPercent} onChange={(e) => setTaxPercent(Number(e.target.value))} className="mt-1 w-full px-3 py-2 border rounded-md" placeholder="0" min="0" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Jumlah Bayar (DP)</label>
              <input type="number" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} className="mt-1 w-full px-3 py-2 border rounded-md" placeholder="0" min="0" />
            </div>
          </div>
          
          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-100">Batal</button>
            <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700">Konfirmasi Bayar</button>
          </div>
        </form>
      </div>
    </div>
  );
}
