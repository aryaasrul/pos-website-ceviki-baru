import { supabase } from './supabase';

/**
 * Service untuk mengambil data terkait riwayat pergerakan stok.
 */
export const stockHistoryService = {
  /**
   * Mengambil riwayat pergerakan stok untuk satu produk berdasarkan ID-nya.
   * @param {string} productId - UUID dari produk yang ingin dilihat riwayatnya.
   * @returns {Promise<Array>} - Sebuah array berisi objek-objek pergerakan stok.
   */
  async getStockHistory(productId) {
    try {
      // Mengambil data dari tabel 'stock_movements'
      // dan menggabungkannya dengan nama karyawan dari tabel 'employees'.
      const { data, error } = await supabase
        .from('stock_movements')
        .select(`
          *,
          employee:created_by ( name )
        `)
        .eq('product_id', productId)
        .order('created_at', { ascending: false }); // Diurutkan dari yang terbaru

      if (error) {
        // Jika terjadi error dari Supabase, lemparkan error tersebut.
        throw error;
      }

      // Mengubah format data agar lebih mudah digunakan di UI.
      // 'employee' yang tadinya objek {name: 'John'} menjadi string 'John'.
      return data.map(item => ({
        ...item,
        created_by_name: item.employee ? item.employee.name : 'Sistem'
      }));

    } catch (error) {
      console.error('Error fetching stock history:', error);
      // Lemparkan error lagi agar bisa ditangani oleh komponen yang memanggil.
      throw error;
    }
  }
};
