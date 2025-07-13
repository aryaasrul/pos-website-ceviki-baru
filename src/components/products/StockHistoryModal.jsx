import React, { useState, useEffect, useCallback } from 'react';
import { stockHistoryService } from '../../services/stockHistory';
import toast from 'react-hot-toast';

const StockHistoryModal = ({ product, isOpen, onClose }) => {
  // State management
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0
  });
  
  // Filter state
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    movementType: 'all'
  });

  // Fetch stock history
  const fetchHistory = useCallback(async () => {
    if (!product?.id) return;

    setLoading(true);
    try {
      const offset = (pagination.page - 1) * pagination.limit;
      const { data, count, error } = await stockHistoryService.getStockHistory(
        product.id,
        {
          limit: pagination.limit,
          offset,
          startDate: filters.startDate || null,
          endDate: filters.endDate || null,
          movementType: filters.movementType
        }
      );

      if (error) throw error;

      setHistory(data);
      setPagination(prev => ({ ...prev, total: count }));
    } catch (error) {
      console.error('Error loading stock history:', error);
      toast.error('Gagal memuat riwayat stok');
    } finally {
      setLoading(false);
    }
  }, [product?.id, pagination.page, pagination.limit, filters]);

  // Fetch stock summary
  const fetchSummary = useCallback(async () => {
    if (!product?.id) return;

    try {
      const { data, error } = await stockHistoryService.getStockSummary(product.id);
      if (error) throw error;
      setSummary(data);
    } catch (error) {
      console.error('Error loading stock summary:', error);
    }
  }, [product?.id]);

  // Load data when modal opens
  useEffect(() => {
    if (isOpen && product?.id) {
      fetchHistory();
      fetchSummary();
    }
  }, [isOpen, product?.id, fetchHistory, fetchSummary]);

  // Handle filter changes
  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  };

  // Handle export
  const handleExport = async () => {
    try {
      const blob = await stockHistoryService.exportToCSV(product.id, filters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `riwayat-stok-${product.sku}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Data berhasil diekspor');
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Gagal mengekspor data');
    }
  };

  // Get badge color for movement type
  const getMovementBadgeColor = (type, quantity) => {
    if (type === 'sale' || type === 'out' || quantity < 0) {
      return 'bg-red-100 text-red-800';
    }
    if (type === 'in' || type === 'stock_in' || quantity > 0) {
      return 'bg-green-100 text-green-800';
    }
    if (type === 'return') {
      return 'bg-yellow-100 text-yellow-800';
    }
    return 'bg-gray-100 text-gray-800';
  };

  // Format date time
  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Calculate total pages
  const totalPages = Math.ceil(pagination.total / pagination.limit);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="relative w-full max-w-6xl bg-white rounded-lg shadow-xl">
          {/* Header */}
          <div className="border-b px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Riwayat Stok: {product?.name}
                </h2>
                <p className="text-sm text-gray-500">
                  SKU: {product?.sku} | Stok Saat Ini: {product?.current_stock}
                </p>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-2 hover:bg-gray-100 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Summary Cards */}
          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-gray-50">
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <p className="text-sm text-gray-600">Total Masuk</p>
                <p className="text-2xl font-semibold text-green-600">
                  +{summary.total_in || 0}
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <p className="text-sm text-gray-600">Total Keluar</p>
                <p className="text-2xl font-semibold text-red-600">
                  -{summary.total_out || 0}
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <p className="text-sm text-gray-600">Penyesuaian</p>
                <p className="text-2xl font-semibold text-blue-600">
                  {summary.total_adjustments || 0}
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <p className="text-sm text-gray-600">Stok Akhir</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {summary.current_stock || 0}
                </p>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="border-b px-6 py-4">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dari Tanggal
                </label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sampai Tanggal
                </label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Jenis Pergerakan
                </label>
                <select
                  value={filters.movementType}
                  onChange={(e) => handleFilterChange('movementType', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">Semua</option>
                  <option value="in">Masuk</option>
                  <option value="out">Keluar</option>
                  <option value="adjustment">Penyesuaian</option>
                  <option value="sale">Penjualan</option>
                  <option value="return">Retur</option>
                </select>
              </div>
              <button
                onClick={handleExport}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export CSV
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                Tidak ada riwayat stok ditemukan
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tanggal
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Jenis
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Jumlah
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Saldo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Referensi
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Catatan
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Dibuat Oleh
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {history.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDateTime(item.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          getMovementBadgeColor(item.type, item.quantity)
                        }`}>
                          {stockHistoryService.getMovementTypeLabel(item.type)}
                        </span>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${
                        item.quantity > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {item.quantity > 0 ? '+' : ''}{item.quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                        {item.running_balance}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.reference_type || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                        {item.notes || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.created_by_name || 'Sistem'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="border-t px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Menampilkan {((pagination.page - 1) * pagination.limit) + 1} - {
                    Math.min(pagination.page * pagination.limit, pagination.total)
                  } dari {pagination.total} data
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    disabled={pagination.page === 1}
                    className="px-3 py-1 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  {[...Array(totalPages)].map((_, i) => {
                    const pageNum = i + 1;
                    if (
                      pageNum === 1 ||
                      pageNum === totalPages ||
                      (pageNum >= pagination.page - 1 && pageNum <= pagination.page + 1)
                    ) {
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPagination(prev => ({ ...prev, page: pageNum }))}
                          className={`px-3 py-1 border rounded-lg ${
                            pagination.page === pageNum
                              ? 'bg-blue-600 text-white'
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    } else if (
                      pageNum === pagination.page - 2 ||
                      pageNum === pagination.page + 2
                    ) {
                      return <span key={pageNum} className="px-2">...</span>;
                    }
                    return null;
                  })}
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    disabled={pagination.page === totalPages}
                    className="px-3 py-1 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StockHistoryModal;