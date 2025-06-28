import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import Header from '../components/layout/Header';
import { useAuth } from '../contexts/AuthContext';

export default function Settings() {
  const { employee, logout } = useAuth();
  const [storeName, setStoreName] = useState('');
  const [storeAddress, setStoreAddress] = useState('');
  const [loading, setLoading] = useState(false);

  // Muat pengaturan yang tersimpan dari localStorage saat komponen dimuat
  useEffect(() => {
    const savedStoreName = localStorage.getItem('storeName') || '';
    const savedStoreAddress = localStorage.getItem('storeAddress') || '';
    setStoreName(savedStoreName);
    setStoreAddress(savedStoreAddress);
  }, []);

  const handleSaveSettings = (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Simpan pengaturan ke localStorage
      localStorage.setItem('storeName', storeName);
      localStorage.setItem('storeAddress', storeAddress);
      toast.success('Pengaturan berhasil disimpan!');
    } catch (error) {
      toast.error('Gagal menyimpan pengaturan.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Header employee={employee} onLogout={logout} />
      <main className="max-w-2xl mx-auto p-4 md:p-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">
          Pengaturan Struk
        </h1>
        <div className="bg-white p-6 rounded-lg shadow">
          <form onSubmit={handleSaveSettings} className="space-y-6">
            <div>
              <label htmlFor="storeName" className="block text-sm font-medium text-gray-700 mb-1">
                Nama Toko
              </label>
              <input
                type="text"
                id="storeName"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Contoh: Toko Maju Jaya"
              />
            </div>
            <div>
              <label htmlFor="storeAddress" className="block text-sm font-medium text-gray-700 mb-1">
                Alamat Toko
              </label>
              <textarea
                id="storeAddress"
                value={storeAddress}
                onChange={(e) => setStoreAddress(e.target.value)}
                rows="3"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Contoh: Jl. Pahlawan No. 123, Kota Anda"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium disabled:opacity-50"
              >
                {loading ? 'Menyimpan...' : 'Simpan Pengaturan'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
