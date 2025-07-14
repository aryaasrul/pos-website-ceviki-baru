// ================================================
// FILE INI SUDAH TIDAK DIGUNAKAN (DEPRECATED)
// ================================================
// File ini telah digantikan oleh bluetoothPrinterService.js
// untuk mendukung printer thermal Bluetooth.
// 
// Jangan hapus file ini dulu, simpan sebagai backup
// sampai sistem Bluetooth printer sudah berjalan stabil.
//
// File yang menggantikan:
// - bluetoothPrinterService.js (main service)
// - PrinterContext.jsx (updated context)
//
// Tanggal disabled: [TANGGAL HARI INI]
// ================================================

// Uncomment kode di bawah jika perlu rollback darurat:

/*
import { formatCurrency, formatDate } from '../utils/formatters';
import { supabase } from './supabase';
import toast from 'react-hot-toast';

export const printerService = {
  // Kode service lama disini...
};
*/

// Export dummy untuk mencegah error jika masih ada import
export const printerService = {
  printReceipt: () => {
    throw new Error('printerService.js sudah deprecated. Gunakan bluetoothPrinterService.js');
  },
  getShopInfo: () => {
    throw new Error('printerService.js sudah deprecated. Gunakan bluetoothPrinterService.js');
  }
};