// ================================================
// FIX PRINTER CONTEXT - PRODUCTION READY
// File: src/contexts/PrinterContext.jsx
// ================================================

import React, { createContext, useContext, useReducer } from 'react';
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
  const { employee } = useAuth();

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
      
      // Log error print ke database jika diperlukan
      if (transaction.id !== 'test-print-id') {
        try {
          await supabase.from('print_logs').insert({
            transaction_id: transaction.id,
            printed_by: employee?.id || null,
            print_type: 'receipt',
            copies_printed: 0,
            success: false,
            error_message: error.message,
            printer_info: state.device ? JSON.stringify(state.device) : null
          });
        } catch (logError) {
          console.error('Failed to log print error:', logError);
        }
      }
      
      toast.error(errorMsg);
      throw new Error(errorMsg);
    }
  };

  /**
   * Test print untuk memverifikasi koneksi
   */
  const testPrint = async () => {
    if (!state.isConnected) {
      toast.error('Printer belum terhubung');
      return false;
    }

    try {
      toast('Testing printer...', { icon: '🧪' });
      await bluetoothPrinterService.testPrint();
      toast.success('Test print berhasil!');
      return true;
    } catch (error) {
      console.error('Test print error:', error);
      toast.error(`Test print gagal: ${error.message}`);
      return false;
    }
  };

  /**
   * Refresh printer status
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

  /**
   * Helper function untuk increment print count
   */
  const incrementPrintCount = async (transactionId, printType, copies) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .update({ 
          print_count: supabase.raw('COALESCE(print_count, 0) + ?', [copies]),
          last_printed_at: new Date().toISOString()
        })
        .eq('id', transactionId);

      if (error) {
        console.error('Failed to update print count:', error);
      }
    } catch (error) {
      console.error('Error incrementing print count:', error);
    }
  };

  // Context value
  const contextValue = {
    // State
    isConnected: state.isConnected,
    isConnecting: state.isConnecting,
    isSupported: state.isSupported,
    device: state.device,
    lastError: state.lastError,
    
    // Actions
    connectPrinter,
    disconnectPrinter,
    printReceipt,
    testPrint,
    refreshStatus,
    getShopInfo
  };

  return (
    <PrinterContext.Provider value={contextValue}>
      {children}
    </PrinterContext.Provider>
  );
}