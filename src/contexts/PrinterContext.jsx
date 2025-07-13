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
      return { ...state, isConnecting: false, isConnected: true, printer: action.payload };
    case 'CONNECT_FAIL':
      return { ...state, isConnecting: false, isConnected: false };
    case 'DISCONNECT':
      return { ...state, isConnected: false, printer: null };
    default:
      throw new Error(`Unhandled action type: ${action.type}`);
  }
}

const PrinterContext = createContext();

/**
 * Hook kustom untuk menggunakan printer context.
 */
export const usePrinter = () => {
  const context = useContext(PrinterContext);
  if (!context) {
    throw new Error('usePrinter must be used within a PrinterProvider');
  }
  return context;
};

/**
 * Provider untuk PrinterContext.
 */
export function PrinterProvider({ children }) {
  const [state, dispatch] = useReducer(printerReducer, initialState);

  // Fungsi untuk menghubungkan printer dengan tes cetak
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
        transaction_items: [{ 
          name: 'Item Tes', 
          quantity: 1, 
          unit_price: 1000,
          discount: 0,
          discount_type: 'amount'
        }],
        subtotal: 1000,
        discount_amount: 0,
        total_amount: 1000,
        amount_paid: 1000,
        change_amount: 0,
        customer_name: null,
        customer_phone: null,
        customer_address: null,
        notes: 'Tes koneksi printer'
      };

      // Memanggil fungsi cetak dari service
      await printerService.printReceipt(testTransaction);

      // Jika berhasil, printer dianggap terhubung
      dispatch({ type: 'CONNECT_SUCCESS', payload: { name: 'Default Printer' } });
      toast.success('Printer siap digunakan!');

    } catch (error) {
      console.error("Test print failed:", error);
      toast.error('Gagal mencetak. Pastikan printer terhubung dan siap.');
      dispatch({ type: 'CONNECT_FAIL' });
    }
  };

  // Fungsi untuk memutus koneksi printer
  const disconnectPrinter = () => {
    dispatch({ type: 'DISCONNECT' });
    toast.success('Printer terputus');
  };

  // Fungsi untuk mencetak struk transaksi asli
  const printReceipt = async (transaction) => {
    if (!state.isConnected) {
      toast.error("Printer belum terhubung. Silakan hubungkan terlebih dahulu.");
      throw new Error("Printer not connected");
    }

    try {
      await printerService.printReceipt(transaction);
      toast.success('Struk berhasil dicetak!');
    } catch (error) {
      console.error("Error printing from context:", error);
      toast.error(`Gagal mencetak struk: ${error.message}`);
      throw error;
    }
  };

  // Fungsi untuk mencetak salinan struk
  const printCopy = async (transaction) => {
    if (!state.isConnected) {
      toast.error("Printer belum terhubung. Silakan hubungkan terlebih dahulu.");
      throw new Error("Printer not connected");
    }

    try {
      // Tambahkan label "SALINAN" pada struk
      const copyTransaction = {
        ...transaction,
        isCopy: true
      };
      
      await printerService.printReceipt(copyTransaction);
      toast.success('Salinan struk berhasil dicetak!');
    } catch (error) {
      console.error("Error printing copy:", error);
      toast.error(`Gagal mencetak salinan: ${error.message}`);
      throw error;
    }
  };

  // Fungsi untuk mengecek status printer
  const checkPrinterStatus = () => {
    return {
      isConnected: state.isConnected,
      isConnecting: state.isConnecting,
      printer: state.printer
    };
  };

  // Memoized value untuk context
  const contextValue = useMemo(() => ({
    ...state,
    connectPrinter,
    disconnectPrinter,
    printReceipt,
    printCopy,
    checkPrinterStatus
  }), [state]);

  return (
    <PrinterContext.Provider value={contextValue}>
      {children}
    </PrinterContext.Provider>
  );
}