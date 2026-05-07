import { supabase } from './supabase';

const createTransaction = async (transactionData) => {
  if (!transactionData.items || transactionData.items.length === 0) throw new Error('Cart kosong')
  if (!transactionData.customer_name?.trim()) throw new Error('Nama pelanggan wajib diisi')
  if (!transactionData.customer_phone?.trim()) throw new Error('Nomor telepon wajib diisi')
  if (!transactionData.customer_address?.trim()) throw new Error('Alamat pelanggan wajib diisi')
  if (!transactionData.cashier_id) throw new Error('Cashier ID tidak ditemukan')

  const formattedItems = transactionData.items.map(item => ({
    product_id: item.product_id || item.id,
    quantity: parseInt(item.quantity || 1),
    price: parseFloat(item.price || item.selling_price || 0),
    discount: parseFloat(item.discount || 0),
    discount_type: item.discount_type || 'amount'
  }))

  const rpcArgs = {
    p_items: formattedItems,
    p_cashier_id: transactionData.cashier_id,
    p_discount_amount_global: parseFloat(transactionData.discount_amount_global || 0),
    p_global_discount_type: transactionData.global_discount_type || 'amount',
    p_payment_method: transactionData.payment_method || 'cash',
    p_amount_paid: parseFloat(transactionData.amount_paid || 0),
    p_tax_percent: parseFloat(transactionData.tax_percent || 0),
    p_customer_name: transactionData.customer_name.trim(),
    p_customer_phone: transactionData.customer_phone.trim(),
    p_customer_address: transactionData.customer_address.trim(),
    p_customer_email: transactionData.customer_email?.trim() || null,
    p_notes: transactionData.notes?.trim() || null
  }

  const { data, error } = await supabase.rpc('process_transaction', rpcArgs)
  if (error) throw new Error(`Database error: ${error.message}`)
  if (!data) throw new Error('Tidak ada response dari database')
  if (!data.success) throw new Error(data.error || 'Transaksi gagal')
  return { success: true, ...data }
}

const getTransactions = async (filters = {}) => {
  let query = supabase
    .from('v_transactions_with_customer')
    .select('*')
    .order('transaction_date', { ascending: false })

  if (filters.startDate) query = query.gte('transaction_date', filters.startDate)
  if (filters.endDate) query = query.lte('transaction_date', filters.endDate)
  if (filters.payment_status) query = query.eq('payment_status', filters.payment_status)
  if (filters.cashier_id) query = query.eq('cashier_id', filters.cashier_id)
  if (filters.limit) query = query.limit(filters.limit)

  const { data, error } = await query
  if (error) throw error
  return data || []
}

const getTodayTransactions = async () => {
  const today = new Date().toISOString().split('T')[0]
  return getTransactions({
    startDate: `${today}T00:00:00`,
    endDate: `${today}T23:59:59`
  })
}

const getUnpaidTransactions = async () => {
  const { data, error } = await supabase
    .from('v_transactions_with_customer')
    .select('*')
    .in('payment_status', ['unpaid', 'partial'])
    .gt('remaining_balance', 0)
    .order('transaction_date', { ascending: true })
  if (error) throw error
  return data || []
}

const getTransactionDetail = async (transactionId) => {
  const { data: transaction, error: txError } = await supabase
    .from('v_transactions_with_customer')
    .select('*')
    .eq('id', transactionId)
    .single()
  if (txError) throw txError

  const { data: items, error: itemsError } = await supabase
    .from('transaction_items')
    .select('*, product:products(name, sku, brand)')
    .eq('transaction_id', transactionId)
  if (itemsError) throw itemsError

  return { ...transaction, items: items || [] }
}

const addPayment = async (transactionId, amount) => {
  const { data: transaction, error: fetchError } = await supabase
    .from('transactions')
    .select('total_amount, amount_paid')
    .eq('id', transactionId)
    .single()
  if (fetchError) throw fetchError

  const newAmountPaid = (transaction.amount_paid || 0) + parseFloat(amount)
  const newRemainingBalance = transaction.total_amount - newAmountPaid
  const newPaymentStatus = newRemainingBalance <= 0 ? 'paid' : 'partial'

  const { data, error } = await supabase
    .from('transactions')
    .update({
      amount_paid: newAmountPaid,
      remaining_balance: Math.max(newRemainingBalance, 0),
      payment_status: newPaymentStatus
    })
    .eq('id', transactionId)
    .select()
    .single()
  if (error) throw error

  return {
    success: true,
    transaction: data,
    new_remaining_balance: Math.max(newRemainingBalance, 0)
  }
}

const getDailySales = async (date = null) => {
  const targetDate = date || new Date().toISOString().split('T')[0]
  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('total_amount, amount_paid, payment_status')
    .gte('transaction_date', `${targetDate}T00:00:00`)
    .lte('transaction_date', `${targetDate}T23:59:59`)

  if (error && error.code !== 'PGRST116') throw error

  const summary = {
    date: targetDate,
    total_transactions: transactions?.length || 0,
    total_revenue: 0,
    total_paid: 0,
    total_unpaid: 0,
    paid_transactions: 0,
    partial_transactions: 0,
    unpaid_transactions: 0
  }

  transactions?.forEach(tx => {
    summary.total_revenue += tx.total_amount || 0
    summary.total_paid += tx.amount_paid || 0
    summary.total_unpaid += (tx.total_amount - tx.amount_paid) || 0
    if (tx.payment_status === 'paid' || tx.payment_status === 'overpaid') summary.paid_transactions++
    else if (tx.payment_status === 'partial') summary.partial_transactions++
    else summary.unpaid_transactions++
  })

  return summary
}

const searchTransactionsByCustomer = async (searchTerm) => {
  if (!searchTerm?.trim()) return []
  const { data, error } = await supabase
    .from('v_transactions_with_customer')
    .select('*')
    .or(`customer_name.ilike.%${searchTerm}%,customer_phone.ilike.%${searchTerm}%`)
    .order('transaction_date', { ascending: false })
    .limit(50)
  if (error) throw error
  return data || []
}

export const transactionService = {
  createTransaction,
  getTransactions,
  getTodayTransactions,
  getUnpaidTransactions,
  getTransactionDetail,
  addPayment,
  getDailySales,
  searchTransactionsByCustomer
}

export default transactionService
