import { formatCurrency, formatDate } from '../utils/formatters';
import { supabase } from './supabase';
import toast from 'react-hot-toast';

/**
 * Service untuk menangani printer thermal Bluetooth menggunakan Web Bluetooth API
 * Mendukung ESC/POS commands untuk printer thermal 58mm dan 80mm
 */
class BluetoothPrinterService {
  constructor() {
    this.device = null;
    this.server = null;
    this.service = null;
    this.characteristic = null;
    this.isConnected = false;
    
    // ESC/POS Commands
    this.ESC = '\x1b';
    this.GS = '\x1d';
    this.commands = {
      init: '\x1b@',           // Initialize printer
      lf: '\n',               // Line feed
      cut: '\x1dV\x41\x03',   // Full cut
      center: '\x1ba\x01',    // Center alignment
      left: '\x1ba\x00',      // Left alignment
      right: '\x1ba\x02',     // Right alignment
      bold: '\x1bE\x01',      // Bold on
      boldOff: '\x1bE\x00',   // Bold off
      underline: '\x1b-\x01', // Underline on
      underlineOff: '\x1b-\x00', // Underline off
      doubleHeight: '\x1b!\x10', // Double height
      normal: '\x1b!\x00',    // Normal text
      smallText: '\x1b!\x01', // Small text
    };
  }

  /**
   * Cek apakah browser mendukung Web Bluetooth
   */
  isBluetoothSupported() {
    return 'bluetooth' in navigator;
  }

  /**
   * Scan dan connect ke printer Bluetooth
   */
  async connectPrinter() {
    if (!this.isBluetoothSupported()) {
      throw new Error('Browser tidak mendukung Bluetooth. Gunakan Chrome/Edge terbaru.');
    }

    try {
      console.log('Scanning for Bluetooth printers...');
      
      // Request device dengan filter untuk printer thermal
      this.device = await navigator.bluetooth.requestDevice({
        filters: [
          { services: ['000018f0-0000-1000-8000-00805f9b34fb'] }, // Generic printer service
          { namePrefix: 'POS' },
          { namePrefix: 'Printer' },
          { namePrefix: 'TM' },        // Epson TM series
          { namePrefix: 'EPSON' },
          { namePrefix: 'Star' },      // Star Micronics
          { namePrefix: 'TSP' },       // Star TSP series
          { namePrefix: 'BTP' },       // Generic thermal printer
          { namePrefix: 'RP' },        // Receipt printer
        ],
        optionalServices: [
          '000018f0-0000-1000-8000-00805f9b34fb',
          '0000ff00-0000-1000-8000-00805f9b34fb',
          '49535343-fe7d-4ae5-8fa9-9fafd205e455', // SPP-like service
        ]
      });

      console.log('Device found:', this.device.name, 'ID:', this.device.id);

      // Connect ke GATT server
      this.server = await this.device.gatt.connect();
      console.log('Connected to GATT server');

      // Get service (coba beberapa UUID yang umum)
      let serviceFound = false;
      const serviceUUIDs = [
        '000018f0-0000-1000-8000-00805f9b34fb',
        '0000ff00-0000-1000-8000-00805f9b34fb',
        '49535343-fe7d-4ae5-8fa9-9fafd205e455'
      ];

      for (const uuid of serviceUUIDs) {
        try {
          this.service = await this.server.getPrimaryService(uuid);
          console.log(`Service found with UUID: ${uuid}`);
          serviceFound = true;
          break;
        } catch (e) {
          console.log(`Service UUID ${uuid} not found, trying next...`);
        }
      }

      if (!serviceFound) {
        throw new Error('Tidak ditemukan service printer yang kompatibel');
      }

      // Get characteristic untuk write
      const characteristics = await this.service.getCharacteristics();
      this.characteristic = characteristics.find(char => 
        char.properties.write || char.properties.writeWithoutResponse
      );

      if (!this.characteristic) {
        throw new Error('Tidak ditemukan characteristic untuk menulis data');
      }

      console.log('Characteristic found:', this.characteristic.uuid);
      this.isConnected = true;
      
      // Test print untuk memastikan koneksi berfungsi
      await this.testPrint();
      
      return {
        name: this.device.name,
        id: this.device.id,
        connected: true,
        service_uuid: this.service.uuid,
        characteristic_uuid: this.characteristic.uuid
      };

    } catch (error) {
      console.error('Bluetooth connection error:', error);
      this.cleanup();
      
      // Provide more specific error messages
      if (error.name === 'NotFoundError') {
        throw new Error('Tidak ada printer yang dipilih atau ditemukan');
      } else if (error.name === 'SecurityError') {
        throw new Error('Koneksi ditolak. Pastikan website menggunakan HTTPS');
      } else if (error.name === 'NetworkError') {
        throw new Error('Gagal terhubung ke printer. Pastikan printer dalam mode pairing');
      } else {
        throw new Error(`Gagal menghubungkan printer: ${error.message}`);
      }
    }
  }

  /**
   * Disconnect printer
   */
  async disconnectPrinter() {
    try {
      if (this.device && this.device.gatt.connected) {
        await this.device.gatt.disconnect();
      }
      this.cleanup();
      return true;
    } catch (error) {
      console.error('Disconnect error:', error);
      this.cleanup();
      return false;
    }
  }

  /**
   * Cleanup connection
   */
  cleanup() {
    this.device = null;
    this.server = null;
    this.service = null;
    this.characteristic = null;
    this.isConnected = false;
  }

  /**
   * Kirim data ke printer
   */
  async sendData(data) {
    if (!this.isConnected || !this.characteristic) {
      throw new Error('Printer tidak terhubung');
    }

    try {
      const encoder = new TextEncoder();
      const uint8Array = encoder.encode(data);
      
      // Split data jika terlalu besar (max 20 bytes per chunk untuk kompatibilitas)
      const chunkSize = 20;
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.slice(i, i + chunkSize);
        await this.characteristic.writeValue(chunk);
        // Delay kecil untuk mencegah overflow buffer
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    } catch (error) {
      console.error('Send data error:', error);
      throw new Error(`Gagal mengirim data: ${error.message}`);
    }
  }

  /**
   * Test print untuk verifikasi koneksi
   */
  async testPrint() {
    const testData = 
      this.commands.init +
      this.commands.center +
      this.commands.bold +
      this.commands.doubleHeight +
      'TES KONEKSI PRINTER\n' +
      this.commands.normal +
      this.commands.boldOff +
      this.commands.left +
      '================================\n' +
      'Printer berhasil terhubung!\n' +
      'Tanggal: ' + new Date().toLocaleString('id-ID') + '\n' +
      'Waktu: ' + new Date().toLocaleTimeString('id-ID') + '\n' +
      '================================\n' +
      'Fitur yang tersedia:\n' +
      '- Cetak struk transaksi\n' +
      '- Multiple copies\n' +
      '- Print history tracking\n' +
      '================================\n' +
      this.commands.center +
      'Printer siap digunakan!\n' +
      this.commands.left +
      this.commands.lf +
      this.commands.lf +
      this.commands.cut;

    await this.sendData(testData);
  }

  /**
   * Format text dengan padding untuk alignment
   */
  formatLine(left, right, width = 32) {
    if (left.length + right.length >= width) {
      return left + '\n' + ' '.repeat(width - right.length) + right + '\n';
    }
    const spaces = width - left.length - right.length;
    return left + ' '.repeat(spaces) + right + '\n';
  }

  /**
   * Potong text jika terlalu panjang
   */
  truncateText(text, maxLength) {
    return text.length > maxLength ? text.substring(0, maxLength - 3) + '...' : text;
  }

  /**
   * Generate receipt data ESC/POS
   */
  async generateReceipt(transaction, shopInfo, copyNumber = 1, totalCopies = 1) {
    let receiptData = '';

    // Header
    receiptData += this.commands.init;
    receiptData += this.commands.center;
    receiptData += this.commands.bold;
    receiptData += this.commands.doubleHeight;
    receiptData += (shopInfo.shop_name || 'TOKO POS') + '\n';
    receiptData += this.commands.normal;
    receiptData += this.commands.boldOff;
    
    if (shopInfo.shop_address) {
      receiptData += shopInfo.shop_address + '\n';
    }
    if (shopInfo.shop_phone) {
      receiptData += 'Telp: ' + shopInfo.shop_phone + '\n';
    }

    receiptData += '================================\n';
    receiptData += this.commands.left;

    // Transaction info
    receiptData += this.formatLine('No. Struk:', transaction.transaction_number);
    receiptData += this.formatLine('Kasir:', transaction.cashier_name);
    receiptData += this.formatLine('Tanggal:', formatDate(transaction.transaction_date));
    
    if (transaction.customer_name) {
      receiptData += this.formatLine('Pelanggan:', transaction.customer_name);
    }

    // Copy indicator
    if (copyNumber > 1 || transaction.isCopy) {
      receiptData += this.commands.center;
      receiptData += this.commands.bold;
      receiptData += '--- SALINAN ---\n';
      receiptData += this.commands.boldOff;
      receiptData += this.commands.left;
    }

    receiptData += '================================\n';

    // Items
    transaction.transaction_items.forEach(item => {
      const itemName = this.truncateText(item.name, 30);
      receiptData += this.commands.bold + itemName + this.commands.boldOff + '\n';
      
      const qty = `${item.quantity} x ${formatCurrency(item.unit_price)}`;
      const itemTotal = item.quantity * item.unit_price;
      let finalItemTotal = itemTotal;
      
      receiptData += this.formatLine(qty, formatCurrency(itemTotal));
      
      // Handle item-level discounts
      if (item.discount > 0) {
        let discountAmount = 0;
        if (item.discount_type === 'percentage') {
          discountAmount = (itemTotal * item.discount) / 100;
          receiptData += this.formatLine(`Diskon ${item.discount}%`, `-${formatCurrency(discountAmount)}`);
        } else {
          discountAmount = item.discount;
          receiptData += this.formatLine('Diskon', `-${formatCurrency(discountAmount)}`);
        }
        finalItemTotal = itemTotal - discountAmount;
      }
    });

    receiptData += '================================\n';

    // Totals
    receiptData += this.formatLine('Subtotal:', formatCurrency(transaction.subtotal));
    
    if (transaction.discount_amount > 0) {
      receiptData += this.formatLine('Diskon Total:', `-${formatCurrency(transaction.discount_amount)}`);
    }
    
    receiptData += this.commands.bold;
    receiptData += this.formatLine('TOTAL:', formatCurrency(transaction.total_amount));
    receiptData += this.commands.boldOff;
    
    receiptData += this.formatLine('Bayar:', formatCurrency(transaction.amount_paid));
    receiptData += this.formatLine('Kembali:', formatCurrency(transaction.change_amount));

    if (transaction.notes) {
      receiptData += '================================\n';
      receiptData += 'Catatan: ' + transaction.notes + '\n';
    }

    // Footer
    receiptData += '================================\n';
    receiptData += this.commands.center;
    receiptData += 'Terima kasih atas kunjungan Anda\n';
    receiptData += 'Barang yang sudah dibeli\n';
    receiptData += 'tidak dapat dikembalikan\n';
    
    // Copy info dan timestamp
    if (totalCopies > 1) {
      receiptData += `Salinan ${copyNumber} dari ${totalCopies}\n`;
    }
    
    // Print timestamp untuk tracking
    receiptData += 'Dicetak: ' + new Date().toLocaleString('id-ID') + '\n';

    receiptData += this.commands.lf;
    receiptData += this.commands.lf;
    receiptData += this.commands.cut;

    return receiptData;
  }

  /**
   * Print receipt dengan multiple copies dan error handling
   */
  async printReceipt(transaction, shopInfo, copies = 1) {
    if (!this.isConnected) {
      throw new Error('Printer tidak terhubung');
    }

    if (!transaction || !transaction.transaction_items) {
      throw new Error('Data transaksi tidak lengkap');
    }

    const startTime = Date.now();
    console.log(`Starting print job: ${copies} copies for transaction ${transaction.transaction_number}`);

    try {
      for (let i = 1; i <= copies; i++) {
        console.log(`Printing copy ${i} of ${copies}`);
        
        const receiptData = await this.generateReceipt(transaction, shopInfo, i, copies);
        await this.sendData(receiptData);
        
        // Delay antar salinan untuk mencegah buffer overflow
        if (i < copies) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      const duration = Date.now() - startTime;
      console.log(`Print job completed in ${duration}ms`);
      
      return {
        success: true,
        copies_printed: copies,
        duration_ms: duration,
        device_name: this.device?.name
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`Print job failed after ${duration}ms:`, error);
      
      throw new Error(`Gagal mencetak: ${error.message}`);
    }
  }

  /**
   * Get connection status
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      device: this.device ? {
        name: this.device.name,
        id: this.device.id
      } : null
    };
  }
}

// Create singleton instance
export const bluetoothPrinterService = new BluetoothPrinterService();