// src/services/transactionEditService.js
import { supabase } from './supabase';

class TransactionEditService {
  /**
   * Check if user has owner role
   * @returns {Promise<boolean>}
   */
  async checkOwnerRole() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data: employee } = await supabase
        .from('employees')
        .select('role')
        .eq('id', user.id)
        .single();

      return employee?.role === 'owner';
    } catch (error) {
      console.error('Error checking owner role:', error);
      return false;
    }
  }

  /**
   * Check if transaction can be edited
   * @param {string} transactionId - Transaction UUID
   * @returns {Promise<{canEdit: boolean, reason: string}>}
   */
  async canEditTransaction(transactionId) {
    try {
      const { data: transaction } = await supabase
        .from('transactions')
        .select('transaction_date, payment_status, print_count')
        .eq('id', transactionId)
        .single();

      if (!transaction) {
        return { canEdit: false, reason: 'Transaksi tidak ditemukan' };
      }

      // Check if transaction is within 24 hours
      const transactionDate = new Date(transaction.transaction_date);
      const now = new Date();
      const hoursDiff = (now - transactionDate) / (1000 * 60 * 60);

      if (hoursDiff > 24) {
        return { canEdit: false, reason: 'Transaksi sudah lebih dari 24 jam, tidak bisa diedit' };
      }

      // Check if transaction has been printed multiple times
      if (transaction.print_count && transaction.print_count > 3) {
        return { canEdit: false, reason: 'Transaksi sudah dicetak berkali-kali, tidak bisa diedit' };
      }

      // Check if there are partial payments
      if (transaction.payment_status === 'partial') {
        return { canEdit: false, reason: 'Transaksi dengan cicilan tidak bisa diedit' };
      }

      return { canEdit: true, reason: '' };
    } catch (error) {
      console.error('Error checking edit permission:', error);
      return { canEdit: false, reason: 'Error checking transaction' };
    }
  }

  /**
   * Get transaction details for editing
   * @param {string} transactionId - Transaction UUID
   * @returns {Promise<Object>}
   */
  async getTransactionForEdit(transactionId) {
    try {
      // Get transaction details
      const { data: transaction } = await supabase
        .from('transactions')
        .select(`
          *,
          employee:employees!transactions_cashier_id_fkey(name)
        `)
        .eq('id', transactionId)
        .single();

      if (!transaction) {
        throw new Error('Transaksi tidak ditemukan');
      }

      // Get transaction items with complete product information
      const { data: items } = await supabase
        .from('transaction_items')
        .select(`
          *,
          product:products(id, name, sku, selling_price, current_stock)
        `)
        .eq('transaction_id', transactionId);

      // Ensure items have all required fields including product_name
      const processedItems = (items || []).map(item => ({
        ...item,
        product_name: item.product_name || item.product?.name || 'Unknown Product',
        product: item.product
      }));

      return {
        transaction,
        items: processedItems
      };
    } catch (error) {
      console.error('Error getting transaction for edit:', error);
      throw error;
    }
  }

  /**
   * Edit transaction
   * @param {string} transactionId - Transaction UUID
   * @param {Object} editData - Edit data
   * @param {string} editReason - Reason for editing
   * @returns {Promise<Object>}
   */
  async editTransaction(transactionId, editData, editReason) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get product information for items that might be missing product_name
      const itemsWithProductInfo = await Promise.all(
        editData.items.map(async (item) => {
          let productName = item.product_name;
          
          // If product_name is missing, fetch it from products table
          if (!productName) {
            const { data: product } = await supabase
              .from('products')
              .select('name')
              .eq('id', item.product_id)
              .single();
            
            productName = product?.name || 'Unknown Product';
          }

          return {
            ...item,
            product_name: productName
          };
        })
      );

      // Prepare items data for the stored procedure with all required fields
      const itemsJson = itemsWithProductInfo.map(item => ({
        product_id: item.product_id,
        product_name: item.product_name, // FIX: Added product_name
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.quantity * item.unit_price,
        discount_amount: item.discount_amount || 0,
        discount_type: item.discount_type || 'amount'
      }));

      console.log('📝 Items being sent to stored procedure:', itemsJson);

      // Call the stored procedure
      const { data, error } = await supabase.rpc('edit_transaction', {
        p_transaction_id: transactionId,
        p_edited_by: user.id,
        p_items: itemsJson,
        p_edit_reason: editReason
      });

      if (error) {
        console.error('❌ Stored procedure error:', error);
        throw new Error(error.message);
      }

      if (!data || !data.success) {
        console.error('❌ Transaction edit failed:', data);
        throw new Error(data?.error || 'Failed to edit transaction');
      }

      console.log('✅ Transaction edited successfully:', data);
      return data;
    } catch (error) {
      console.error('Error editing transaction:', error);
      throw error;
    }
  }

  /**
   * Get transaction edit history
   * @param {string} transactionId - Transaction UUID
   * @returns {Promise<Array>}
   */
  async getEditHistory(transactionId) {
    try {
      const { data } = await supabase
        .from('transaction_edits')
        .select(`
          *,
          editor:employees!transaction_edits_edited_by_fkey(name)
        `)
        .eq('transaction_id', transactionId)
        .order('created_at', { ascending: false });

      return data || [];
    } catch (error) {
      console.error('Error getting edit history:', error);
      return [];
    }
  }

  /**
   * Validate stock availability for edited items
   * @param {Array} items - Items to validate
   * @param {Array} originalItems - Original transaction items
   * @returns {Promise<{valid: boolean, errors: Array}>}
   */
  async validateStock(items, originalItems) {
    try {
      const errors = [];

      for (const item of items) {
        // Find original item
        const originalItem = originalItems.find(orig => orig.product_id === item.product_id);
        const originalQuantity = originalItem ? originalItem.quantity : 0;
        const quantityDiff = item.quantity - originalQuantity;

        if (quantityDiff > 0) {
          // Check if we have enough stock for the increase
          const { data: product } = await supabase
            .from('products')
            .select('name, current_stock')
            .eq('id', item.product_id)
            .single();

          if (!product) {
            errors.push(`Produk dengan ID ${item.product_id} tidak ditemukan`);
            continue;
          }

          if (product.current_stock < quantityDiff) {
            errors.push(`Stok ${product.name} tidak mencukupi. Tersedia: ${product.current_stock}, dibutuhkan: ${quantityDiff}`);
          }
        }
      }

      return {
        valid: errors.length === 0,
        errors
      };
    } catch (error) {
      console.error('Error validating stock:', error);
      return {
        valid: false,
        errors: ['Error validating stock']
      };
    }
  }

  /**
   * Calculate transaction totals
   * @param {Array} items - Transaction items
   * @param {number} discountAmount - Discount amount
   * @param {number} taxAmount - Tax amount
   * @returns {Object}
   */
  calculateTotals(items, discountAmount = 0, taxAmount = 0) {
    const subtotal = items.reduce((sum, item) => {
      return sum + (item.quantity * item.unit_price) - (item.discount_amount || 0);
    }, 0);

    const totalAmount = subtotal - discountAmount + taxAmount;

    return {
      subtotal,
      totalAmount,
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0)
    };
  }

  /**
   * Get recent transactions that can be edited
   * @param {number} limit - Number of transactions to fetch
   * @returns {Promise<Array>}
   */
  async getEditableTransactions(limit = 50) {
    try {
      // Get transactions from last 24 hours
      const yesterday = new Date();
      yesterday.setHours(yesterday.getHours() - 24);

      const { data } = await supabase
        .from('transactions')
        .select(`
          id,
          transaction_number,
          transaction_date,
          total_amount,
          payment_status,
          print_count,
          customer_name,
          employee:employees!transactions_cashier_id_fkey(name)
        `)
        .gte('transaction_date', yesterday.toISOString())
        .neq('payment_status', 'partial')
        .order('transaction_date', { ascending: false })
        .limit(limit);

      return data || [];
    } catch (error) {
      console.error('Error getting editable transactions:', error);
      return [];
    }
  }
}

export default new TransactionEditService();