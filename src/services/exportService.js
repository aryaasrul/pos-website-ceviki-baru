// src/services/exportService.js
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

class ExportService {
  constructor() {
    this.companyInfo = {
      name: 'STOK LBJ',
      address: 'Alamat Toko',
      phone: 'Nomor Telepon'
    };
  }

  // ==================== PDF EXPORT ====================
  
  /**
   * Export laporan ke PDF
   * @param {Object} reportData - Data laporan
   * @param {string} reportType - Jenis laporan (daily, weekly, monthly, custom)
   * @param {Object} dateRange - Range tanggal
   */
  exportReportToPDF(reportData, reportType, dateRange) {
    const doc = new jsPDF();
    
    // Header
    this._addPDFHeader(doc, reportType, dateRange);
    
    // Summary Cards
    this._addSummarySection(doc, reportData);
    
    // Transactions Table
    if (reportData.transactions && reportData.transactions.length > 0) {
      this._addTransactionsTable(doc, reportData.transactions);
    }
    
    // Expenses Table
    if (reportData.expenses && reportData.expenses.length > 0) {
      this._addExpensesTable(doc, reportData.expenses);
    }
    
    // Save PDF
    const fileName = `Laporan_${this._getReportTypeLabel(reportType)}_${this._formatDateForFile(dateRange.startDate)}.pdf`;
    doc.save(fileName);
  }

  /**
   * Export data piutang ke PDF
   * @param {Array} unpaidData - Data transaksi belum lunas
   */
  exportUnpaidToPDF(unpaidData) {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text(this.companyInfo.name, 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    doc.text(this.companyInfo.address, 105, 28, { align: 'center' });
    doc.text(this.companyInfo.phone, 105, 35, { align: 'center' });
    
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('LAPORAN PIUTANG', 105, 50, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}`, 14, 60);
    
    // Summary
    const totalPiutang = unpaidData.reduce((sum, item) => sum + item.remaining_balance, 0);
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(`Total Piutang: ${this._formatCurrency(totalPiutang)}`, 14, 75);
    doc.text(`Jumlah Transaksi: ${unpaidData.length}`, 14, 85);
    
    // Table
    const tableColumns = [
      'No. Transaksi',
      'Tanggal',
      'Customer',
      'Total',
      'Terbayar',
      'Sisa'
    ];
    
    const tableRows = unpaidData.map(item => [
      item.transaction_number,
      new Date(item.transaction_date).toLocaleDateString('id-ID'),
      item.customer_name || 'Walk-in Customer',
      this._formatCurrency(item.total_amount),
      this._formatCurrency(item.amount_paid),
      this._formatCurrency(item.remaining_balance)
    ]);
    
    doc.autoTable({
      head: [tableColumns],
      body: tableRows,
      startY: 95,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [41, 128, 185] }
    });
    
    doc.save(`Laporan_Piutang_${this._formatDateForFile(new Date())}.pdf`);
  }

  // ==================== EXCEL EXPORT ====================
  
  /**
   * Export laporan ke Excel
   * @param {Object} reportData - Data laporan
   * @param {string} reportType - Jenis laporan
   * @param {Object} dateRange - Range tanggal
   */
  exportReportToExcel(reportData, reportType, dateRange) {
    const workbook = XLSX.utils.book_new();
    
    // Sheet 1: Summary
    const summaryData = [
      ['LAPORAN PENJUALAN'],
      [`Periode: ${this._getDateRangeText(reportType, dateRange)}`],
      [''],
      ['RINGKASAN'],
      ['Total Penjualan', this._formatCurrency(reportData.totalRevenue || 0)],
      ['Total HPP', this._formatCurrency(reportData.totalCost || 0)],
      ['Total Pengeluaran', this._formatCurrency(reportData.totalExpenses || 0)],
      ['Laba Bersih', this._formatCurrency((reportData.totalRevenue || 0) - (reportData.totalCost || 0) - (reportData.totalExpenses || 0))],
      [''],
      ['Jumlah Transaksi', reportData.totalTransactions || 0],
      ['Margin (%)', reportData.totalRevenue ? (((reportData.totalRevenue - reportData.totalCost) / reportData.totalRevenue) * 100).toFixed(2) : 0]
    ];
    
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Ringkasan');
    
    // Sheet 2: Transactions
    if (reportData.transactions && reportData.transactions.length > 0) {
      const transactionHeaders = [
        'No. Transaksi',
        'Tanggal',
        'Customer',
        'Subtotal',
        'Pajak',
        'Diskon',
        'Total',
        'Status Pembayaran',
        'Kasir'
      ];
      
      const transactionRows = reportData.transactions.map(tx => [
        tx.transaction_number,
        new Date(tx.transaction_date).toLocaleDateString('id-ID'),
        tx.customer_name || 'Walk-in Customer',
        tx.subtotal || 0,
        tx.tax_amount || 0,
        tx.discount_amount || 0,
        tx.total_amount || 0,
        tx.payment_status === 'paid' ? 'Lunas' : 'Belum Lunas',
        tx.employee_name || ''
      ]);
      
      const transactionData = [transactionHeaders, ...transactionRows];
      const transactionSheet = XLSX.utils.aoa_to_sheet(transactionData);
      XLSX.utils.book_append_sheet(workbook, transactionSheet, 'Transaksi');
    }
    
    // Sheet 3: Expenses
    if (reportData.expenses && reportData.expenses.length > 0) {
      const expenseHeaders = [
        'Tanggal',
        'Deskripsi',
        'Kategori',
        'Jumlah',
        'Catatan'
      ];
      
      const expenseRows = reportData.expenses.map(exp => [
        new Date(exp.expense_date).toLocaleDateString('id-ID'),
        exp.description || '',
        exp.category || '',
        exp.amount || 0,
        exp.notes || ''
      ]);
      
      const expenseData = [expenseHeaders, ...expenseRows];
      const expenseSheet = XLSX.utils.aoa_to_sheet(expenseData);
      XLSX.utils.book_append_sheet(workbook, expenseSheet, 'Pengeluaran');
    }
    
    // Save Excel
    const fileName = `Laporan_${this._getReportTypeLabel(reportType)}_${this._formatDateForFile(dateRange.startDate)}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  }

  /**
   * Export data piutang ke Excel
   * @param {Array} unpaidData - Data transaksi belum lunas
   */
  exportUnpaidToExcel(unpaidData) {
    const workbook = XLSX.utils.book_new();
    
    // Summary data
    const totalPiutang = unpaidData.reduce((sum, item) => sum + item.remaining_balance, 0);
    const summaryData = [
      ['LAPORAN PIUTANG'],
      [`Tanggal: ${new Date().toLocaleDateString('id-ID')}`],
      [''],
      ['RINGKASAN'],
      ['Total Piutang', this._formatCurrency(totalPiutang)],
      ['Jumlah Transaksi', unpaidData.length],
      ['']
    ];
    
    // Detail data
    const headers = [
      'No. Transaksi',
      'Tanggal',
      'Customer',
      'Total Amount',
      'Amount Paid',
      'Remaining Balance',
      'Status'
    ];
    
    const rows = unpaidData.map(item => [
      item.transaction_number,
      new Date(item.transaction_date).toLocaleDateString('id-ID'),
      item.customer_name || 'Walk-in Customer',
      item.total_amount,
      item.amount_paid,
      item.remaining_balance,
      item.payment_status === 'paid' ? 'Lunas' : 'Belum Lunas'
    ]);
    
    const allData = [...summaryData, headers, ...rows];
    const worksheet = XLSX.utils.aoa_to_sheet(allData);
    
    // Style the headers
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    for (let col = range.s.c; col <= range.e.c; col++) {
      const headerCell = XLSX.utils.encode_cell({ r: summaryData.length, c: col });
      if (worksheet[headerCell]) {
        worksheet[headerCell].s = {
          font: { bold: true },
          fill: { fgColor: { rgb: "CCCCCC" } }
        };
      }
    }
    
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Piutang');
    XLSX.writeFile(workbook, `Laporan_Piutang_${this._formatDateForFile(new Date())}.xlsx`);
  }

  // ==================== HELPER METHODS ====================

  _addPDFHeader(doc, reportType, dateRange) {
    // Company Info
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text(this.companyInfo.name, 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    doc.text(this.companyInfo.address, 105, 28, { align: 'center' });
    doc.text(this.companyInfo.phone, 105, 35, { align: 'center' });
    
    // Report Title
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text(`LAPORAN ${this._getReportTypeLabel(reportType).toUpperCase()}`, 105, 50, { align: 'center' });
    
    // Date Info
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Periode: ${this._getDateRangeText(reportType, dateRange)}`, 14, 60);
    doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}`, 14, 67);
  }

  _addSummarySection(doc, reportData) {
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('RINGKASAN', 14, 85);
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    
    const profit = (reportData.totalRevenue || 0) - (reportData.totalCost || 0) - (reportData.totalExpenses || 0);
    const margin = reportData.totalRevenue ? (((reportData.totalRevenue - reportData.totalCost) / reportData.totalRevenue) * 100).toFixed(2) : 0;
    
    doc.text(`Total Penjualan: ${this._formatCurrency(reportData.totalRevenue || 0)}`, 14, 95);
    doc.text(`Total HPP: ${this._formatCurrency(reportData.totalCost || 0)}`, 14, 102);
    doc.text(`Total Pengeluaran: ${this._formatCurrency(reportData.totalExpenses || 0)}`, 14, 109);
    doc.text(`Laba Bersih: ${this._formatCurrency(profit)}`, 14, 116);
    doc.text(`Margin: ${margin}%`, 14, 123);
    doc.text(`Jumlah Transaksi: ${reportData.totalTransactions || 0}`, 120, 95);
  }

  _addTransactionsTable(doc, transactions) {
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('DETAIL TRANSAKSI', 14, 140);
    
    const tableColumns = [
      'No. Transaksi',
      'Tanggal',
      'Customer',
      'Total',
      'Status'
    ];
    
    const tableRows = transactions.map(tx => [
      tx.transaction_number,
      new Date(tx.transaction_date).toLocaleDateString('id-ID'),
      tx.customer_name || 'Walk-in',
      this._formatCurrency(tx.total_amount),
      tx.payment_status === 'paid' ? 'Lunas' : 'Belum Lunas'
    ]);
    
    doc.autoTable({
      head: [tableColumns],
      body: tableRows,
      startY: 150,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] }
    });
  }

  _addExpensesTable(doc, expenses) {
    const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 20 : 200;
    
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('DETAIL PENGELUARAN', 14, finalY);
    
    const tableColumns = [
      'Tanggal',
      'Deskripsi',
      'Kategori',
      'Jumlah'
    ];
    
    const tableRows = expenses.map(exp => [
      new Date(exp.expense_date).toLocaleDateString('id-ID'),
      exp.description || '',
      exp.category || '',
      this._formatCurrency(exp.amount)
    ]);
    
    doc.autoTable({
      head: [tableColumns],
      body: tableRows,
      startY: finalY + 10,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [231, 76, 60] }
    });
  }

  _formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount || 0);
  }

  _formatDateForFile(date) {
    return new Date(date).toISOString().split('T')[0];
  }

  _getReportTypeLabel(type) {
    const labels = {
      'daily': 'Harian',
      'weekly': 'Mingguan', 
      'monthly': 'Bulanan',
      'custom': 'Custom'
    };
    return labels[type] || 'Laporan';
  }

  _getDateRangeText(reportType, dateRange) {
    if (reportType === 'custom') {
      return `${new Date(dateRange.startDate).toLocaleDateString('id-ID')} s/d ${new Date(dateRange.endDate).toLocaleDateString('id-ID')}`;
    }
    return new Date(dateRange.startDate).toLocaleDateString('id-ID');
  }
}

export default new ExportService();