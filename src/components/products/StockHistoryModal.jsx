import React, { useState, useEffect } from 'react';
import { stockHistoryService } from '../../services/stockHistory';
import { formatDate } from '../../utils/formatters';
import toast from 'react-hot-toast';

/**
 * Komponen Modal untuk menampilkan riwayat pergerakan stok suatu produk.
 * @param {{product: object, onClose: function}} props
 */
export default function StockHistoryModal({ product, onClose }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fungsi untuk memuat data riwayat stok saat komponen pertama kali ditampilkan.
    const fetchHistory = async () => {
      if (!product) return;

      try {
        setLoading(true);
        const data = await stockHistoryService.getStockHistory(product.id);
        setHistory(data);
      } catch (error) {
        toast.error('Gagal memuat riwayat stok.');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [product]); // Efek ini akan berjalan setiap kali 'product' berubah.

  // Fungsi untuk memberi warna pada jenis pergerakan stok
  const getTypeClass = (type) => {
    switch (type) {
      case 'sale':
        return 'bg-red-100 text-red-800';
      case 'adjustment':
      case 'stock_in':
        return 'bg-green-100 text-green-800';
      case 'return':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header Modal */}
        <div className="p-5 border-b">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-gray-800">Riwayat Stok</h2>
              <p className="text-sm text-gray-600">
                {product.name} ({product.sku})
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Konten Modal (Tabel) */}
        <div className="p-5 overflow-y-auto">
          {loading ? (
            <div className="text-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Memuat riwayat...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-500">Tidak ada riwayat pergerakan stok untuk produk ini.</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tanggal</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jenis</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Jumlah</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Catatan</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Oleh</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {history.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatDate(item.created_at, true)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getTypeClass(item.type)}`}>
                        {item.type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-right text-sm font-bold ${item.quantity < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {item.quantity}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.notes || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{item.created_by_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer Modal */}
        <div className="p-4 bg-gray-50 border-t text-right">
            <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700"
            >
                Tutup
            </button>
        </div>
      </div>
    </div>
  );
}
