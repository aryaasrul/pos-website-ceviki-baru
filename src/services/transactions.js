import { supabase } from './supabase'

const createTransaction = async (cartItems, cashierId, paymentDetails) => {
  // Membuat Nomor Transaksi Unik
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const transactionNumber = `INV-${year}${month}${day}-${hours}${minutes}${seconds}`;

  // 1. Masukkan data transaksi utama ke tabel 'transactions'
  const { data: transaction, error: transactionError } = await supabase
    .from('transactions')
    .insert({
      transaction_number: transactionNumber, 
      transaction_date: now.toISOString(),
      subtotal: paymentDetails.subtotal,
      discount_amount: paymentDetails.discount_amount,
      tax_amount: paymentDetails.tax_amount,
      total_amount: paymentDetails.total_amount,
      payment_method: paymentDetails.payment_method,
      payment_status: paymentDetails.payment_status,
      customer_name: paymentDetails.customer_name,
      customer_phone: paymentDetails.customer_phone,
      customer_email: paymentDetails.customer_email,
      customer_address: paymentDetails.customer_address, // Kolom alamat ditambahkan
      notes: paymentDetails.notes,
      cashier_id: cashierId,
      amount_paid: paymentDetails.amount_paid, 
      remaining_balance: paymentDetails.remaining_balance,
    })
    .select()
    .single();

  if (transactionError) {
    console.error('Error creating transaction:', transactionError);
    throw new Error('Gagal membuat data transaksi utama.');
  }

  // 2. Masukkan setiap item di keranjang ke tabel 'transaction_items'
  const transactionItems = cartItems.map(item => ({
    transaction_id: transaction.id,
    product_id: item.id,
    quantity: item.quantity,
    price_at_sale: item.selling_price,
    discount_amount: item.discountType === 'percentage' 
      ? (item.selling_price * item.quantity * (item.discount || 0) / 100)
      : (item.discount || 0),
    discount_type: item.discountType,
  }));

  const { error: itemsError } = await supabase
    .from('transaction_items')
    .insert(transactionItems);

  if (itemsError) {
    console.error('Error creating transaction items:', itemsError);
    throw new Error('Gagal menyimpan item transaksi.');
  }

  // 3. Panggil fungsi RPC untuk update stok produk
  const { error: stockError } = await supabase.rpc('update_stock_from_transaction', {
    transaction_id_param: transaction.id
  });

  if (stockError) {
    console.error('Error updating stock:', stockError);
    throw new Error('Gagal memperbarui stok produk.');
  }

  // 4. Kembalikan nomor transaksi untuk ditampilkan
  return { transaction_number: transaction.transaction_number };
};

export const transactionService = {
  createTransaction,
};
