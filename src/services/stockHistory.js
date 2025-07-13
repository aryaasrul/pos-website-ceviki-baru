import { supabase } from './supabase';

export const stockHistoryService = {
  /**
   * Get stock history for a specific product
   * @param {string} productId - Product UUID
   * @param {Object} options - Query options
   * @returns {Promise<{data: Array, error: Error}>}
   */
  async getStockHistory(productId, options = {}) {
    try {
      const { 
        limit = 50, 
        offset = 0,
        startDate = null,
        endDate = null,
        movementType = null 
      } = options;

      let query = supabase
        .from('v_stock_history')
        .select('*', { count: 'exact' })
        .eq('product_id', productId)
        .order('created_at', { ascending: false });

      // Apply filters
      if (startDate) {
        query = query.gte('created_at', startDate);
      }
      if (endDate) {
        query = query.lte('created_at', endDate);
      }
      if (movementType && movementType !== 'all') {
        query = query.eq('type', movementType);
      }

      // Apply pagination
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      return { 
        data: data || [], 
        count: count || 0,
        error: null 
      };
    } catch (error) {
      console.error('Error fetching stock history:', error);
      return { 
        data: [], 
        count: 0,
        error 
      };
    }
  },

  /**
   * Get stock summary statistics
   * @param {string} productId - Product UUID
   * @returns {Promise<Object>}
   */
  async getStockSummary(productId) {
    try {
      const { data, error } = await supabase
        .rpc('get_stock_summary', { p_product_id: productId });

      if (error) throw error;

      return { data: data?.[0] || null, error: null };
    } catch (error) {
      console.error('Error fetching stock summary:', error);
      return { data: null, error };
    }
  },

  /**
   * Export stock history to CSV
   * @param {string} productId - Product UUID
   * @param {Object} filters - Export filters
   * @returns {Promise<Blob>}
   */
  async exportToCSV(productId, filters = {}) {
    try {
      const { data, error } = await this.getStockHistory(productId, {
        ...filters,
        limit: 10000 // Max export limit
      });

      if (error) throw error;

      // Create CSV content
      const headers = [
        'Tanggal',
        'Jenis',
        'Jumlah',
        'Saldo',
        'Referensi',
        'Catatan',
        'Dibuat Oleh'
      ];

      const rows = data.map(item => [
        new Date(item.created_at).toLocaleString('id-ID'),
        this.getMovementTypeLabel(item.type),
        item.quantity,
        item.running_balance,
        item.reference_type || '-',
        item.notes || '-',
        item.created_by_name || 'Sistem'
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      // Create blob
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      return blob;
    } catch (error) {
      console.error('Error exporting stock history:', error);
      throw error;
    }
  },

  /**
   * Get movement type label
   * @param {string} type - Movement type
   * @returns {string}
   */
  getMovementTypeLabel(type) {
    const labels = {
      'in': 'Masuk',
      'out': 'Keluar',
      'adjustment': 'Penyesuaian',
      'sale': 'Penjualan',
      'return': 'Retur',
      'stock_in': 'Stok Masuk'
    };
    return labels[type] || type;
  }
};

