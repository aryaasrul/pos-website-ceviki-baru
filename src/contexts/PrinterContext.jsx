import React, { createContext, useContext, useReducer, useMemo } from 'react';
import { bluetoothPrinterService } from '../services/bluetoothPrinterService';
import { supabase } from '../services/supabase';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

// State awal untuk printer context
const initialState = {
  device: null,
  isConnected: false,
  isConnecting: false,
  isSupported: bluetoothPrinterService.isBluetoothSupported(),
  lastError: null,
};

// Reducer untuk mengelola state printer
function printerReducer(state, action) {
  switch (action.type) {
    case 'CONNECT_START':
      return { 
        ...state, 
        isConnecting: true, 
        lastError: null 
      };
    case 'CONNECT_SUCCESS':
      return { 
        ...state, 
        isConnecting: false, 
        isConnected: true, 
        device: action.payload,
        lastError: null 
      };
    case 'CONNECT_FAIL':
      return { 
        ...state, 
        isConnecting: false, 
        isConnected: false,
        device: null,
        lastError: action.payload 
      };
    case 'DISCONNECT':
      return { 
        ...state, 
        isConnected: false, 
        device: null,
        lastError: null 
      };
    case 'SET_ERROR':
      return {
        ...state,
        lastError: action.payload
      };
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
 * Provider untuk PrinterContext dengan Bluetooth support.
 */
export function PrinterProvider({ children }) {
  const [state, dispatch] = useReducer(printerReducer, initialState);
  const { employee } = useAuth(); // Get current employee for logging

  /**
   * Ambil shop info dari database
   */
  const getShopInfo = async () => {
    const defaults = {
      shop_name: 'POS TOKO',
      shop_address: 'Alamat Toko Anda',
      shop_phone: 'No. Telepon Anda',
      default_print_copies: 1,
    };

    try {
      const { data, error } = await supabase
        .from('settings')
        .select('shop_name, shop_address, shop_phone, default_print_copies')
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      
      return { ...defaults, ...(data || {}) };
    } catch (err) {
      console.error('Error fetching shop info:', err);
      return defaults;
    }
  };

  /**
   * Fungsi untuk menghubungkan printer Bluetooth
   */
  const connectPrinter = async () => {
    if (!state.isSupported) {
      const errorMsg = 'Browser tidak mendukung Bluetooth. Gunakan Chrome/Edge terbaru.';
      dispatch({ type: 'SET_ERROR', payload: errorMsg });
      toast.error(errorMsg);
      return false;
    }

    dispatch({ type: 'CONNECT_START' });
    toast('Mencari printer Bluetooth...', { icon: '🔍' });

    try {
      const deviceInfo = await bluetoothPrinterService.connectPrinter();
      
      dispatch({ 
        type: 'CONNECT_SUCCESS', 
        payload: deviceInfo 
      });
      
      toast.success(`Printer ${deviceInfo.name} terhubung!`);
      return true;

    } catch (error) {
      console.error("Bluetooth connection failed:", error);
      const errorMsg = error.message || 'Gagal menghubungkan printer';
      
      dispatch({ 
        type: 'CONNECT_FAIL', 
        payload: errorMsg 
      });
      
      toast.error(errorMsg);
      return false;
    }
  };

  /**
   * Fungsi untuk memutus koneksi printer
   */
  const disconnectPrinter = async () => {
    try {
      const success = await bluetoothPrinterService.disconnectPrinter();
      
      if (success) {
        dispatch({ type: 'DISCONNECT' });
        toast.success('Printer terputus');
        return true;
      } else {
        throw new Error('Gagal memutus koneksi');
      }
    } catch (error) {
      console.error('Disconnect error:', error);
      toast.error('Gagal memutus koneksi printer');
      return false;
    }
  };

  /**
   * Fungsi untuk mencetak struk transaksi
   */
  const printReceipt = async (transaction) => {
    if (!state.isConnected) {
      const errorMsg = "Printer belum terhubung. Silakan hubungkan terlebih dahulu.";
      toast.error(errorMsg);
      throw new Error("Printer not connected");
    }

    try {
      const shopInfo = await getShopInfo();
      const copies = shopInfo.default_print_copies || 1;

      toast('Mencetak struk...', { icon: '🖨️' });
      
      await bluetoothPrinterService.printReceipt(transaction, shopInfo, copies);
      
      // Update print count jika bukan test print
      if (transaction.id !== 'test-print-id') {
        await incrementPrintCount(transaction.id, 'receipt', copies);
      }
      
      toast.success(`Struk berhasil dicetak (${copies} salinan)!`);
      return true;

    } catch (error) {
      console.error("Error printing receipt:", error);
      const errorMsg = `Gagal mencetak struk: ${error.message}`;
      
      // Log error print ke database
      if (transaction.id !== 'test-print-id') {
        try {
          await supabase.from('print_logs').insert({
            transaction_id: transaction.id,
            printed_by: employee?.id || null,
            print_type: 'receipt',
            copies_printed: 0,
            success: false,
            error_message: error.message,
            printer_info: state.device ? {
              name: state.device.name,
              id: state.device.id,
              connection_type: 'bluetooth'
            } : null
          });
        } catch (logError) {
          console.error('Failed to log print error:', logError);
        }
      }
      
      dispatch({ type: 'SET_ERROR', payload: errorMsg });
      toast.error(errorMsg);
      throw error;
    }
  };

  /**
   * Fungsi untuk mencetak salinan struk
   */
  const printCopy = async (transaction) => {
    if (!state.isConnected) {
      const errorMsg = "Printer belum terhubung. Silakan hubungkan terlebih dahulu.";
      toast.error(errorMsg);
      throw new Error("Printer not connected");
    }

    try {
      const shopInfo = await getShopInfo();
      
      // Tandai sebagai salinan
      const copyTransaction = {
        ...transaction,
        isCopy: true
      };
      
      toast('Mencetak salinan struk...', { icon: '🖨️' });
      
      await bluetoothPrinterService.printReceipt(copyTransaction, shopInfo, 1);
      
      // Log print copy ke database
      await incrementPrintCount(transaction.id, 'copy', 1);
      
      toast.success('Salinan struk berhasil dicetak!');
      return true;

    } catch (error) {
      console.error("Error printing copy:", error);
      const errorMsg = `Gagal mencetak salinan: ${error.message}`;
      
      // Log error print ke database  
      try {
        await supabase.from('print_logs').insert({
          transaction_id: transaction.id,
          printed_by: employee?.id || null,
          print_type: 'copy',
          copies_printed: 0,
          success: false,
          error_message: error.message,
          printer_info: state.device ? {
            name: state.device.name,
            id: state.device.id,
            connection_type: 'bluetooth'
          } : null
        });
      } catch (logError) {
        console.error('Failed to log print error:', logError);
      }
      
      dispatch({ type: 'SET_ERROR', payload: errorMsg });
      toast.error(errorMsg);
      throw error;
    }
  };

  /**
   * Test print untuk verifikasi koneksi
   */
  const testPrint = async () => {
    if (!state.isConnected) {
      const errorMsg = "Printer belum terhubung. Silakan hubungkan terlebih dahulu.";
      toast.error(errorMsg);
      return false;
    }

    try {
      toast('Mencetak struk tes...', { icon: '🖨️' });
      
      await bluetoothPrinterService.testPrint();
      
      // Log test print ke database (tanpa transaction_id)
      try {
        await supabase.from('print_logs').insert({
          transaction_id: null, // Test print tidak punya transaction
          printed_by: employee?.id || null,
          print_type: 'test',
          copies_printed: 1,
          success: true,
          printer_info: state.device ? {
            name: state.device.name,
            id: state.device.id,
            connection_type: 'bluetooth'
          } : null
        });
      } catch (logError) {
        console.error('Failed to log test print:', logError);
        // Don't fail the test print if logging fails
      }
      
      toast.success('Tes cetak berhasil!');
      return true;

    } catch (error) {
      console.error("Test print failed:", error);
      const errorMsg = `Tes cetak gagal: ${error.message}`;
      
      // Log test print error
      try {
        await supabase.from('print_logs').insert({
          transaction_id: null,
          printed_by: employee?.id || null,
          print_type: 'test',
          copies_printed: 0,
          success: false,
          error_message: error.message,
          printer_info: state.device ? {
            name: state.device.name,
            id: state.device.id,
            connection_type: 'bluetooth'
          } : null
        });
      } catch (logError) {
        console.error('Failed to log test print error:', logError);
      }
      
      dispatch({ type: 'SET_ERROR', payload: errorMsg });
      toast.error(errorMsg);
      return false;
    }
  };

  /**
   * Update print count di database menggunakan function yang sudah dibuat
   */
  const incrementPrintCount = async (transactionId, printType = 'receipt', copiesPrinted = 1) => {
    try {
      // Get current employee ID untuk logging
      const employeeId = employee?.id || null;
      
      // Get device info untuk logging
      const deviceInfo = state.device ? {
        name: state.device.name,
        id: state.device.id,
        connection_type: 'bluetooth'
      } : null;

      // Call database function
      const { data, error } = await supabase.rpc('increment_print_count', {
        p_transaction_id: transactionId,
        p_printed_by: employeeId,
        p_print_type: printType,
        p_copies_printed: copiesPrinted,
        p_printer_info: deviceInfo
      });

      if (error) throw error;
      
      if (!data) {
        console.warn('Print count increment failed but no error thrown');
      }
      
      return data;
    } catch (error) {
      console.error('Error updating print count:', error);
      
      // Fallback: try direct update if function fails
      try {
        const { error: fallbackError } = await supabase
          .from('transactions')
          .update({ 
            print_count: supabase.raw('print_count + ' + copiesPrinted),
            last_printed_at: new Date().toISOString()
          })
          .eq('id', transactionId);
          
        if (fallbackError) throw fallbackError;
        console.log('Fallback print count update successful');
      } catch (fallbackErr) {
        console.error('Fallback print count update also failed:', fallbackErr);
      }
      
      // Don't throw error to avoid breaking print flow
      return false;
    }
  };

  /**
   * Fungsi untuk mengecek status printer
   */
  const checkPrinterStatus = () => {
    return {
      isSupported: state.isSupported,
      isConnected: state.isConnected,
      isConnecting: state.isConnecting,
      device: state.device,
      lastError: state.lastError
    };
  };

  /**
   * Refresh status koneksi
   */
  const refreshStatus = () => {
    const status = bluetoothPrinterService.getStatus();
    
    if (status.isConnected !== state.isConnected) {
      if (status.isConnected) {
        dispatch({ 
          type: 'CONNECT_SUCCESS', 
          payload: status.device 
        });
      } else {
        dispatch({ type: 'DISCONNECT' });
      }
    }
  };

  // Memoized value untuk context
  const contextValue = useMemo(() => ({
    ...state,
    connectPrinter,
    disconnectPrinter,
    printReceipt,
    printCopy,
    testPrint,
    checkPrinterStatus,
    refreshStatus
  }), [state]);

  return (
    <PrinterContext.Provider value={contextValue}>
      {children}
    </PrinterContext.Provider>
  );
}