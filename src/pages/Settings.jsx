import React, { useState, useEffect } from 'react';
import Header from '../components/layout/Header';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import toast from 'react-hot-toast';
import { printerService } from '../services/printerService';

/**
 * Komponen untuk halaman Pengaturan.
 * Memungkinkan pengguna (owner) untuk mengubah informasi toko dan pengaturan printer.
 */
export default function Settings() {
  const { employee, logout, isOwner } = useAuth();
  const [settings, setSettings] = useState({
    shop_name: '',
    shop_address: '',
    shop_phone: '',
    default_print_copies: 1, // Menambahkan state untuk jumlah salinan
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Mengambil data pengaturan saat komponen pertama kali dimuat
  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('settings')
          .select('*')
          .limit(1)
          .single();
        
        if (error && error.code !== 'PGRST116') {
          throw error;
        }
        if (data) {
          // Memastikan semua state terisi dengan data dari DB atau nilai default
          setSettings({
            shop_name: data.shop_name || '',
            shop_address: data.shop_address || '',
            shop_phone: data.shop_phone || '',
            default_print_copies: data.default_print_copies || 1,
          });
        }
      } catch (error) {
        toast.error('Gagal memuat pengaturan: ' + error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  // Menangani perubahan pada input form
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    // Untuk input angka, pastikan nilainya valid
    const val = name === 'default_print_copies' ? Math.max(1, parseInt(value, 10) || 1) : value;
    setSettings(prev => ({ ...prev, [name]: val }));
  };

  // Menyimpan perubahan pengaturan ke database
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    if (!isOwner) {
      toast.error("Hanya owner yang dapat mengubah pengaturan.");
      return;
    }

    setSaving(true);
    const toastId = toast.loading('Menyimpan pengaturan...');
    try {
      const { error } = await supabase
        .from('settings')
        .upsert({ ...settings, id: 1 }, { onConflict: 'id' });

      if (error) throw error;
      toast.success('Pengaturan berhasil disimpan!', { id: toastId });
    } catch (error) {
      toast.error('Gagal menyimpan pengaturan: ' + error.message, { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  // Menjalankan tes cetak struk
  const handleTestPrint = () => {
    toast.success('Mencoba mencetak struk tes...');
    const testTransaction = {
      id: 'test-print-id',
      transaction_number: 'TEST-001',
      cashier_name: employee?.name || 'Admin',
      transaction_date: new Date().toISOString(),
      transaction_items: [
        { name: 'Item Tes 1', quantity: 1, unit_price: 10000 },
        { name: 'Item Tes 2', quantity: 2, unit_price: 5000 },
      ],
      total_amount: 20000,
      discount_amount: 0,
      amount_paid: 20000,
      change_amount: 0,
    };
    // Memanggil service printer (sekarang akan mencetak sesuai jumlah salinan)
    printerService.printReceipt(testTransaction);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Header employee={employee} onLogout={logout} />

      <main className="p-4 md:p-6 max-w-4xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">Pengaturan</h1>

        <form onSubmit={handleSaveSettings}>
          {/* Bagian Informasi Toko */}
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h2 className="text-xl font-semibold border-b pb-3 mb-4">Informasi Toko</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="shop_name" className="block text-sm font-medium text-gray-700">Nama Toko</label>
                <input
                  type="text"
                  id="shop_name"
                  name="shop_name"
                  value={settings.shop_name}
                  onChange={handleInputChange}
                  className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="shop_address" className="block text-sm font-medium text-gray-700">Alamat Toko</label>
                <textarea
                  id="shop_address"
                  name="shop_address"
                  rows="3"
                  value={settings.shop_address}
                  onChange={handleInputChange}
                  className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:ring-2 focus:ring-blue-500"
                ></textarea>
              </div>
              <div>
                <label htmlFor="shop_phone" className="block text-sm font-medium text-gray-700">No. Telepon Toko</label>
                <input
                  type="text"
                  id="shop_phone"
                  name="shop_phone"
                  value={settings.shop_phone}
                  onChange={handleInputChange}
                  className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Bagian Pengaturan Printer */}
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h2 className="text-xl font-semibold border-b pb-3 mb-4">Pengaturan Printer</h2>
            <div className="space-y-4">
              {/* Input untuk jumlah salinan struk */}
              <div>
                <label htmlFor="default_print_copies" className="block text-sm font-medium text-gray-700">Jumlah Salinan Struk Default</label>
                <input
                  type="number"
                  id="default_print_copies"
                  name="default_print_copies"
                  value={settings.default_print_copies}
                  onChange={handleInputChange}
                  min="1"
                  className="mt-1 block w-full max-w-xs px-3 py-2 border rounded-md shadow-sm focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Jumlah struk yang otomatis tercetak setiap transaksi berhasil.</p>
              </div>
              <div className="border-t pt-4">
                <p className="text-sm text-gray-600 mb-2">
                  Gunakan tombol di bawah ini untuk memastikan printer struk Anda terhubung dan berfungsi dengan baik.
                </p>
                <button
                  type="button"
                  onClick={handleTestPrint}
                  className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  Cetak Struk Tes
                </button>
              </div>
            </div>
          </div>

          {/* Tombol Simpan */}
          {isOwner && (
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
              >
                {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
              </button>
            </div>
          )}
        </form>
      </main>
    </div>
  );
}
