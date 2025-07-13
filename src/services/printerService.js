import { formatCurrency, formatDate } from '../utils/formatters';
import { supabase } from './supabase';
import toast from 'react-hot-toast';

/**
 * Helper function untuk memastikan setiap baris memiliki panjang yang sama.
 * Ini penting untuk perataan teks di printer thermal.
 * @param {string} left - Teks di kiri.
 * @param {string} right - Teks di kanan.
 * @param {number} width - Lebar total karakter (default 40 untuk kertas 80mm).
 * @returns {string}
 */
const createRow = (left, right, width = 40) => {
  const remainingSpace = width - left.length - right.length;
  if (remainingSpace < 1) {
    // Jika tidak cukup ruang, letakkan di baris baru
    return `${left}\n${' '.repeat(width - right.length)}${right}`;
  }
  const spaces = ' '.repeat(remainingSpace);
  return `${left}${spaces}${right}`;
};

export const printerService = {
  /**
   * Mengambil pengaturan toko dari database, termasuk jumlah salinan struk.
   * @returns {Promise<object>}
   */
  async getShopInfo() {
    const defaults = {
      shop_name: 'POS TOKO',
      shop_address: 'Alamat Toko Anda',
      shop_phone: 'No. Telepon Anda',
      default_print_copies: 1, // Nilai default jika tidak ada di DB
    };

    try {
      const { data, error } = await supabase
        .from('settings')
        .select('shop_name, shop_address, shop_phone, default_print_copies')
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      
      // Menggabungkan data dari DB dengan default, data DB lebih prioritas
      return { ...defaults, ...(data || {}) };
    } catch (err) {
      console.error('Error fetching shop info:', err);
      return defaults;
    }
  },

  /**
   * Fungsi utama untuk mencetak struk beberapa kali sesuai pengaturan.
   * @param {object} transaction - Objek transaksi lengkap.
   */
  async printReceipt(transaction) {
    if (!transaction || !transaction.transaction_items || !transaction.id) {
      console.error('Data transaksi tidak lengkap atau tidak valid.', transaction);
      toast.error('Gagal mencetak: Data transaksi tidak lengkap.');
      return;
    }

    try {
      const shopInfo = await this.getShopInfo();
      const copies = shopInfo.default_print_copies || 1;

      // Loop untuk mencetak sebanyak jumlah salinan yang ditentukan
      for (let i = 1; i <= copies; i++) {
        const receiptContent = this.generateReceiptHTML(transaction, shopInfo, i, copies);
        
        // Menunggu sebentar sebelum proses cetak berikutnya untuk mencegah browser crash
        if (i > 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        this.executePrint(receiptContent);
      }

      // Hanya update print_count satu kali untuk seluruh proses, kecuali untuk tes cetak
      if (transaction.id !== 'test-print-id') {
         await this.incrementPrintCount(transaction.id);
      }

    } catch (error) {
      console.error('Error saat proses cetak:', error);
      toast.error(`Gagal mencetak struk: ${error.message}`);
    }
  },

  /**
   * Fungsi terpisah untuk eksekusi DOM print.
   * @param {string} contentHTML - Konten HTML yang akan dicetak.
   */
  executePrint(contentHTML) {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(contentHTML);
    doc.close();

    iframe.contentWindow.focus();
    iframe.contentWindow.print();

    // Membersihkan iframe setelah proses cetak dimulai
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1500);
  },

  /**
   * Membuat konten HTML untuk struk yang akan dicetak.
   * @param {object} tx - Objek transaksi.
   * @param {object} shop - Objek info toko.
   * @param {number} copyNumber - Nomor salinan saat ini.
   * @param {number} totalCopies - Total salinan yang akan dicetak.
   * @returns {string} - String HTML.
   */
  generateReceiptHTML(tx, shop, copyNumber, totalCopies) {
    let copyInfo = '';
    // Menambahkan info salinan jika lebih dari 1
    if (totalCopies > 1) {
      copyInfo = `** SALINAN ${copyNumber} DARI ${totalCopies} **\n`;
    }

    let content = `
      <html>
        <head>
          <style>
            @page { margin: 2mm; }
            body { font-family: 'Courier New', Courier, monospace; font-size: 10pt; color: #000; }
            .center { text-align: center; }
            .line { border-top: 1px dashed #000; margin: 5px 0; }
          </style>
        </head>
        <body>
          <pre>
<div class="center">
<strong>${shop.shop_name}</strong>
${shop.shop_address}
${shop.shop_phone}
</div>
<div class="line"></div>
${createRow(`No: ${tx.transaction_number}`, `Kasir: ${tx.cashier_name}`)}
Tanggal: ${formatDate(tx.transaction_date, true)}
<div class="line"></div>
`;
    tx.transaction_items.forEach(item => {
      content += `${item.name}\n`;
      content += `  ${item.quantity} x ${formatCurrency(item.unit_price, false)}\n`;
    });
    content += `
<div class="line"></div>
${createRow('Subtotal', formatCurrency(tx.total_amount + (tx.discount_amount || 0), false))}
${createRow('Diskon', formatCurrency(tx.discount_amount || 0, false))}
<div class="line"></div>
<strong>${createRow('TOTAL', formatCurrency(tx.total_amount, false))}</strong>
<div class="line"></div>
${createRow('Bayar', formatCurrency(tx.amount_paid, false))}
${createRow('Kembali', formatCurrency(tx.change_amount, false))}
<div class="line"></div>
<div class="center">
Terima kasih!
${copyInfo}
</div>
          </pre>
        </body>
      </html>
    `;
    return content;
  },

  /**
   * Menambah hitungan cetak pada transaksi.
   * @param {string} transactionId - ID transaksi.
   */
  async incrementPrintCount(transactionId) {
    try {
      const { error } = await supabase.rpc('increment_print_count', {
        p_transaction_id: transactionId
      });
      if (error) throw error;
    } catch (error) {
      // Tidak menampilkan error ke user karena ini proses background
      console.error('Gagal update print_count:', error);
    }
  }
};
