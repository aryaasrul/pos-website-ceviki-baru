// ================================================
// UPDATED TRANSACTION SERVICE - SUPPORT BUSINESS FLOW
// File: src/services/transactions.js
// ================================================

import { supabase } from './supabase';

/**
 * Create transaction dengan support DP/cicilan dan customer data wajib
 * @param {object} transactionData - Data transaksi lengkap
 * @returns {Promise<object>} Result transaksi
 */
const createTransaction = async (transactionData) => {
  try {
    console.log('🔄 Creating transaction:', transactionData);

    // Validation
    if (!transactionData.items || transactionData.items.length === 0) {
      throw new Error('Cart kosong');
    }

    if (!transactionData.customer_name?.trim()) {
      throw new Error('Nama pelanggan wajib diisi');
    }

    if (!transactionData.customer_phone?.trim()) {
      throw new Error('Nomor telepon wajib diisi');
    }

    if (!transactionData.customer_address?.trim()) {
      throw new Error('Alamat pelanggan wajib diisi');
    }

    if (!transactionData.cashier_id) {
      throw new Error('Cashier ID tidak ditemukan');
    }

    // Format items for RPC
    const formattedItems = transactionData.items.map(item => ({
      product_id: item.product_id || item.id,
      quantity: parseInt(item.quantity || 1),
      price: parseFloat(item.price || item.selling_price || 0),
      discount: parseFloat(item.discount || 0),
      discount_type: item.discount_type || 'amount'
    }));

    // Prepare RPC arguments
    const rpcArgs = {
      p_items: formattedItems,
      p_cashier_id: transactionData.cashier_id,
      p_discount_amount_global: parseFloat(transactionData.discount_amount_global || 0),
      p_payment_method: transactionData.payment_method || 'cash',
      p_amount_paid: parseFloat(transactionData.amount_paid || 0),
      p_customer_name: transactionData.customer_name.trim(),
      p_customer_phone: transactionData.customer_phone.trim(),
      p_customer_address: transactionData.customer_address.trim(),
      p_customer_email: transactionData.customer_email?.trim() || null,
      p_notes: transactionData.notes?.trim() || null
    };

    console.log('📡 Calling RPC with:', rpcArgs);

    // Call stored procedure
    const { data, error } = await supabase.rpc('process_transaction', rpcArgs);

    if (error) {
      console.error('❌ RPC Error:', error);
      throw new Error(`Database error: ${error.message}`);
    }

    if (!data) {
      throw new Error('Tidak ada response dari database');
    }

    if (!data.success) {
      console.error('❌ Transaction failed:', data.error);
      throw new Error(data.error || 'Transaksi gagal');
    }

    console.log('✅ Transaction successful:', data);

    return {
      success: true,
      ...data
    };

  } catch (error) {
    console.error('💥 Transaction service error:', error);
    throw error;
  }
};

/**
 * Get transactions with customer data
 * @param {object} filters - Filter options
 * @returns {Promise<Array>} Transactions
 */
const getTransactions = async (filters = {}) => {
  try {
    let query = supabase
      .from('v_transactions_with_customer')
      .select('*')
      .order('transaction_date', { ascending: false });

    // Apply filters
    if (filters.startDate) {
      query = query.gte('transaction_date', filters.startDate);
    }

    if (filters.endDate) {
      query = query.lte('transaction_date', filters.endDate);
    }

    if (filters.payment_status) {
      query = query.eq('payment_status', filters.payment_status);
    }

    if (filters.cashier_id) {
      query = query.eq('cashier_id', filters.cashier_id);
    }

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching transactions:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in getTransactions:', error);
    throw error;
  }
};

/**
 * Get today's transactions
 * @returns {Promise<Array>} Today's transactions
 */
const getTodayTransactions = async () => {
  const today = new Date().toISOString().split('T')[0];
  return getTransactions({
    startDate: `${today}T00:00:00`,
    endDate: `${today}T23:59:59`
  });
};

/**
 * Get unpaid/partial transactions (piutang)
 * @returns {Promise<Array>} Unpaid transactions
 */
const getUnpaidTransactions = async () => {
  try {
    const { data, error } = await supabase
      .from('v_transactions_with_customer')
      .select('*')
      .in('payment_status', ['unpaid', 'partial'])
      .gt('remaining_balance', 0)
      .order('transaction_date', { ascending: true });

    if (error) {
      console.error('Error fetching unpaid transactions:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in getUnpaidTransactions:', error);
    throw error;
  }
};

/**
 * Get transaction detail by ID
 * @param {string} transactionId - Transaction ID
 * @returns {Promise<object>} Transaction detail
 */
const getTransactionDetail = async (transactionId) => {
  try {
    // Get transaction
    const { data: transaction, error: txError } = await supabase
      .from('v_transactions_with_customer')
      .select('*')
      .eq('id', transactionId)
      .single();

    if (txError) throw txError;

    // Get transaction items
    const { data: items, error: itemsError } = await supabase
      .from('transaction_items')
      .select(`
        *,
        product:products(name, sku, brand)
      `)
      .eq('transaction_id', transactionId);

    if (itemsError) throw itemsError;

    return {
      ...transaction,
      items: items || []
    };
  } catch (error) {
    console.error('Error fetching transaction detail:', error);
    throw error;
  }
};

/**
 * Add payment to existing transaction (untuk cicilan)
 * @param {string} transactionId - Transaction ID
 * @param {number} amount - Payment amount
 * @param {string} method - Payment method
 * @param {string} notes - Payment notes
 * @returns {Promise<object>} Payment result
 */
const addPayment = async (transactionId, amount, method = 'cash', notes = null) => {
  try {
    console.log('💰 Adding payment:', { transactionId, amount, method });

    // Get current transaction
    const { data: transaction, error: fetchError } = await supabase
      .from('transactions')
      .select('total_amount, amount_paid, remaining_balance')
      .eq('id', transactionId)
      .single();

    if (fetchError) throw fetchError;

    const newAmountPaid = (transaction.amount_paid || 0) + parseFloat(amount);
    const newRemainingBalance = transaction.total_amount - newAmountPaid;
    const newPaymentStatus = newRemainingBalance <= 0 ? 'paid' : 'partial';

    // Update transaction
    const { data, error } = await supabase
      .from('transactions')
      .update({
        amount_paid: newAmountPaid,
        remaining_balance: Math.max(newRemainingBalance, 0),
        payment_status: newPaymentStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', transactionId)
      .select()
      .single();

    if (error) throw error;

    // Log payment (optional - bisa buat table payment_logs)
    console.log('✅ Payment added successfully:', data);

    return {
      success: true,
      transaction: data,
      payment_amount: amount,
      new_remaining_balance: Math.max(newRemainingBalance, 0)
    };

  } catch (error) {
    console.error('Error adding payment:', error);
    throw error;
  }
};

/**
 * Get daily sales summary
 * @param {string} date - Date (YYYY-MM-DD)
 * @returns {Promise<object>} Sales summary
 */
const getDailySales = async (date = null) => {
  try {
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('total_amount, amount_paid, payment_status')
      .gte('transaction_date', `${targetDate}T00:00:00`)
      .lt('transaction_date', `${targetDate}T23:59:59`);

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    const summary = {
      date: targetDate,
      total_transactions: transactions?.length || 0,
      total_revenue: 0,
      total_paid: 0,
      total_unpaid: 0,
      paid_transactions: 0,
      partial_transactions: 0,
      unpaid_transactions: 0
    };

    if (transactions) {
      transactions.forEach(tx => {
        summary.total_revenue += tx.total_amount || 0;
        summary.total_paid += tx.amount_paid || 0;
        summary.total_unpaid += (tx.total_amount - tx.amount_paid) || 0;

        if (tx.payment_status === 'paid' || tx.payment_status === 'overpaid') {
          summary.paid_transactions++;
        } else if (tx.payment_status === 'partial') {
          summary.partial_transactions++;
        } else {
          summary.unpaid_transactions++;
        }
      });
    }

    return summary;
  } catch (error) {
    console.error('Error in getDailySales:', error);
    throw error;
  }
};

/**
 * Search transactions by customer
 * @param {string} searchTerm - Search term (name/phone)
 * @returns {Promise<Array>} Matching transactions
 */
const searchTransactionsByCustomer = async (searchTerm) => {
  try {
    if (!searchTerm?.trim()) {
      return [];
    }

    const { data, error } = await supabase
      .from('v_transactions_with_customer')
      .select('*')
      .or(`customer_name.ilike.%${searchTerm}%,customer_phone.ilike.%${searchTerm}%`)
      .order('transaction_date', { ascending: false })
      .limit(50);

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error searching transactions:', error);
    throw error;
  }
};

// Export service
export const transactionService = {
  createTransaction,
  getTransactions,
  getTodayTransactions,
  getUnpaidTransactions,
  getTransactionDetail,
  addPayment,
  getDailySales,
  searchTransactionsByCustomer
};

// Default export for compatibility
export default transactionService;