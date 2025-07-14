import React, { useState, useEffect } from 'react';
import Header from '../components/layout/Header';
import { useAuth } from '../contexts/AuthContext';
import { usePrinter } from '../contexts/PrinterContext';
import { supabase } from '../services/supabase';
import toast from 'react-hot-toast';


/**
 * Komponen untuk halaman Pengaturan.
 * Memungkinkan pengguna (owner) untuk mengubah informasi toko dan pengaturan printer.
 */
export default function Settings() {
  const { employee, logout, isOwner } = useAuth();
  const { 
    isConnected, 
    isConnecting, 
    isSupported, 
    device, 
    lastError,
    connectPrinter, 
    testPrint,
    refreshStatus 
  } = usePrinter();
  
  const [settings, setSettings] = useState({
    shop_name: '',
    shop_address: '',
    shop_phone: '',
    default_print_copies: 1,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingPrint, setTestingPrint] = useState(false);

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
    refreshStatus(); // Refresh printer status
  }, [refreshStatus]);

  // Menangani perubahan pada input form
  const handleInputChange = (e) => {
    const { name, value } = e.target;
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

  // Handle test print
  const handleTestPrint = async () => {
    if (!isConnected) {
      toast.error('Printer belum terhubung. Silakan hubungkan printer terlebih dahulu.');
      return;
    }

    setTestingPrint(true);
    try {
      await testPrint();
    } catch (error) {
      // Error sudah ditangani di context
    } finally {
      setTestingPrint(false);
    }
  };

  // Handle connect printer
  const handleConnectPrinter = async () => {
    if (!isSupported) {
      toast.error('Browser tidak mendukung Bluetooth. Gunakan Chrome/Edge terbaru.');
      return;
    }
    
    await connectPrinter();
  };

  // Get printer connection status display
  const getPrinterStatus = () => {
    if (!isSupported) {
      return {
        text: 'Browser tidak mendukung Bluetooth',
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        icon: '❌'
      };
    }
    
    if (isConnecting) {
      return {
        text: 'Menghubungkan...',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        icon: '🔄'
      };
    }
    
    if (isConnected) {
      return {
        text: `Terhubung ke ${device?.name || 'Printer Bluetooth'}`,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        icon: '✅'
      };
    }
    
    if (lastError) {
      return {
        text: `Error: ${lastError}`,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        icon: '⚠️'
      };
    }
    
    return {
      text: 'Printer belum terhubung',
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      icon: '🖨️'
    };
  };

  const printerStatus = getPrinterStatus();

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
                <label htmlFor="shop_name" className="block text-sm font-medium text-gray-700">
                  Nama Toko
                </label>
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
                <label htmlFor="shop_address" className="block text-sm font-medium text-gray-700">
                  Alamat Toko
                </label>
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
                <label htmlFor="shop_phone" className="block text-sm font-medium text-gray-700">
                  No. Telepon Toko
                </label>
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
            <h2 className="text-xl font-semibold border-b pb-3 mb-4">Pengaturan Printer Bluetooth</h2>
            <div className="space-y-6">
              
              {/* Status Printer */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status Koneksi Printer
                </label>
                <div className={`p-3 rounded-md ${printerStatus.bgColor} border`}>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{printerStatus.icon}</span>
                    <span className={`text-sm font-medium ${printerStatus.color}`}>
                      {printerStatus.text}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tombol Koneksi */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Koneksi Printer
                </label>
                <div className="flex gap-3">
                  {!isConnected ? (
                    <button
                      type="button"
                      onClick={handleConnectPrinter}
                      disabled={isConnecting || !isSupported}
                      className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {isConnecting ? 'Menghubungkan...' : 'Hubungkan Printer'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleTestPrint}
                      disabled={testingPrint}
                      className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:bg-gray-400"
                    >
                      {testingPrint ? 'Mencetak...' : 'Cetak Struk Tes'}
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {!isSupported 
                    ? 'Gunakan browser Chrome atau Edge terbaru untuk fitur Bluetooth.'
                    : isConnected 
                    ? 'Gunakan tombol tes untuk memastikan printer berfungsi dengan baik.'
                    : 'Pastikan printer thermal Bluetooth Anda dalam mode pairing.'
                  }
                </p>
              </div>

              {/* Input untuk jumlah salinan struk */}
              <div>
                <label htmlFor="default_print_copies" className="block text-sm font-medium text-gray-700">
                  Jumlah Salinan Struk Default
                </label>
                <input
                  type="number"
                  id="default_print_copies"
                  name="default_print_copies"
                  value={settings.default_print_copies}
                  onChange={handleInputChange}
                  min="1"
                  max="5"
                  className="mt-1 block w-full max-w-xs px-3 py-2 border rounded-md shadow-sm focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Jumlah struk yang otomatis tercetak setiap transaksi berhasil (maksimal 5 salinan).
                </p>
              </div>

              {/* Info Compatibility */}
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <h3 className="text-sm font-medium text-blue-800 mb-2">
                  ℹ️ Persyaratan Printer Bluetooth
                </h3>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• Gunakan printer thermal yang mendukung ESC/POS commands</li>
                  <li>• Pastikan printer dalam mode Bluetooth pairing</li>
                  <li>• Browser: Chrome/Edge versi terbaru (mendukung Web Bluetooth)</li>
                  <li>• Kertas: 58mm atau 80mm thermal paper</li>
                </ul>
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