import { supabase } from './supabase';

/**
 * Memproses transaksi baru secara keseluruhan di database.
 * @param {object} transactionData - Objek berisi detail transaksi (cashier_id, customer_name, amount_paid, dll).
 * @param {Array} items - Array berisi item-item di keranjang.
 * @returns {Promise<object>} Objek yang berisi nomor transaksi jika sukses.
 */
const createTransaction = async (transactionData, items) => {
  try {
    const formattedItems = items.map(item => ({
      product_id: item.id,
      quantity: item.quantity,
      price: item.selling_price,
      discount: item.discountType === 'percentage' 
        ? (item.selling_price * item.quantity * (item.discount || 0) / 100)
        : (item.discount || 0),
    }));

    const rpc_args = {
      p_cashier_id: transactionData.cashier_id,
      p_items: formattedItems,
      p_discount_amount_global: transactionData.discount_amount || 0,
      p_payment_method: transactionData.payment_method,
      p_amount_paid: transactionData.amount_paid,
      p_customer_name: transactionData.customer_name,
      p_customer_phone: transactionData.customer_phone,
      p_customer_address: transactionData.customer_address,
      p_notes: transactionData.notes
    };

    const { data, error } = await supabase.rpc('process_transaction', rpc_args);

    if (error || (data && !data.success)) {
      const errorMessage = error ? error.message : data.error;
      console.error('Error calling process_transaction RPC:', errorMessage);
      throw new Error(errorMessage);
    }

    return { transaction_number: data.transaction_number };
    
  } catch (error) {
    console.error('Error in createTransaction service:', error);
    throw error;
  }
};

/**
 * Mengambil data transaksi yang terjadi hari ini untuk Dashboard.
 * @returns {Promise<Array>} Array berisi transaksi hari ini.
 */
const getTodayTransactions = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const { data, error } = await supabase
    .from('v_transaction_summary')
    .select('*')
    .gte('transaction_date', today.toISOString())
    .lt('transaction_date', tomorrow.toISOString())
    .order('transaction_date', { ascending: false });

  if (error) {
    console.error('Error fetching today transactions:', error);
    throw error;
  }
  return data || [];
};

/**
 * Mengambil data rekap penjualan harian untuk Dashboard.
 * @returns {Promise<object>} Objek berisi rekap penjualan hari ini.
 */
const getDailySales = async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
        .from('v_daily_sales')
        .select('*')
        .eq('sales_date', today)
        .single();

    // Kode 'PGRST116' berarti tidak ada baris yang ditemukan, ini bukan error.
    if (error && error.code !== 'PGRST116') {
        console.error('Error fetching daily sales:', error);
        throw error;
    }
    return data;
};

/**
 * Mengambil semua transaksi yang belum lunas (piutang).
 * @returns {Promise<Array>} Array berisi data piutang.
 */
const getUnpaidTransactions = async () => {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('payment_status', 'unpaid')
    .gt('remaining_balance', 0)
    .order('transaction_date', { ascending: true });
  
  if (error) {
    console.error('Error fetching unpaid transactions:', error);
    throw error;
  }
  return data || [];
};

/**
 * Menambahkan pembayaran ke transaksi yang sudah ada.
 * @param {string} transactionId - ID dari transaksi yang akan dibayar.
 * @param {number} paymentAmount - Jumlah uang yang dibayarkan.
 * @returns {Promise<object>} Objek berisi pesan sukses.
 */
const addPayment = async (transactionId, paymentAmount) => {
  const { data, error } = await supabase.rpc('add_payment_to_transaction', {
    p_transaction_id: transactionId,
    p_payment_amount: paymentAmount,
  });

  if (error || (data && !data.success)) {
    const errorMessage = error ? error.message : data.error;
    console.error('Error in addPayment service:', errorMessage);
    throw new Error(errorMessage);
  }
  return data;
};


// Di sini kita bungkus semua fungsi ke dalam satu objek 'transactionService'
// dan mengekspornya, agar bisa digunakan di seluruh aplikasi.
export const transactionService = {
  createTransaction,
  getTodayTransactions,
  getDailySales,
  getUnpaidTransactions,
  addPayment,
};