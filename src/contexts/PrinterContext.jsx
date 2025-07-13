import React, { createContext, useContext, useReducer, useMemo } from 'react';
import { printerService } from '../services/printerService';
import toast from 'react-hot-toast';

// State awal untuk printer context
const initialState = {
  printer: null,
  isConnected: false,
  isConnecting: false,
};

// Reducer untuk mengelola state printer
function printerReducer(state, action) {
  switch (action.type) {
    case 'CONNECT_START':
      return { ...state, isConnecting: true };
    case 'CONNECT_SUCCESS':
      // Menganggap "terhubung" setelah tes cetak berhasil
      return { ...state, isConnecting: false, isConnected: true, printer: action.payload };
    case 'CONNECT_FAIL':
      return { ...state, isConnecting: false, isConnected: false };
    default:
      throw new Error(`Unhandled action type: ${action.type}`);
  }
}

const PrinterContext = createContext();

/**
 * Hook kustom untuk menggunakan printer context.
 */
export const usePrinter = () => {
  return useContext(PrinterContext);
};

/**
 * Provider untuk PrinterContext.
 */
export function PrinterProvider({ children }) {
  const [state, dispatch] = useReducer(printerReducer, initialState);

  // --- LOGIKA BARU UNTUK FUNGSI connectPrinter ---
  // Fungsi ini sekarang menjalankan tes cetak untuk memverifikasi koneksi.
  const connectPrinter = async () => {
    dispatch({ type: 'CONNECT_START' });
    toast('Mencoba mencetak struk tes...', { icon: '🖨️' });

    try {
      // Membuat objek transaksi palsu untuk tes
      const testTransaction = {
        id: 'test-print-id',
        transaction_number: 'TEST-001',
        cashier_name: 'Admin Tes',
        transaction_date: new Date().toISOString(),
        transaction_items: [{ name: 'Item Tes', quantity: 1, unit_price: 1000 }],
        total_amount: 1000,
        amount_paid: 1000,
        change_amount: 0,
      };

      // Memanggil fungsi cetak dari service
      await printerService.printReceipt(testTransaction);

      // Jika berhasil (tidak ada error), kita anggap printer "terhubung"
      dispatch({ type: 'CONNECT_SUCCESS', payload: { name: 'Default Printer' } });
      toast.success('Printer siap digunakan!');

    } catch (error) {
      console.error("Test print failed:", error);
      toast.error('Gagal mencetak. Pastikan printer terhubung dan siap.');
      dispatch({ type: 'CONNECT_FAIL' });
    }
  };

  // Fungsi untuk mencetak struk transaksi asli
  const printReceipt = async (transaction) => {
    if (!state.isConnected) {
        toast.error("Printer belum terhubung. Silakan hubungkan terlebih dahulu.");
        return;
    }
    try {
      await printerService.printReceipt(transaction);
    } catch (error) {
      console.error("Error printing from context:", error);
      toast.error("Gagal mencetak struk.");
    }
  };

  // Menyediakan semua state dan fungsi yang dibutuhkan oleh Header dan komponen lain
  const value = useMemo(() => ({
    ...state,
    connectPrinter,
    printReceipt,
  }), [state]);

  return (
    <PrinterContext.Provider value={value}>
      {children}
    </PrinterContext.Provider>
  );
}
