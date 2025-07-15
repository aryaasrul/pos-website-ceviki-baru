// src/pages/POS.jsx (FIXED)

import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { usePrinter } from '../contexts/PrinterContext'
import { productService } from '../services/products'
import { transactionService } from '../services/transactions'
import Header from '../components/layout/Header'
import ProductCard from '../components/pos/ProductCard'
import Cart from '../components/pos/Cart'
import CheckoutModal from '../components/pos/CheckoutModal'
import ExpenseModal from '../components/pos/ExpenseModal'
import toast from 'react-hot-toast'
import { expenseService } from '../services/expenses'
import { bluetoothPrinterService } from '../services/bluetoothPrinterService';


export default function POS() {
  const { employee, logout } = useAuth()
  const { printReceipt, isConnected: isPrinterConnected } = usePrinter()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [cart, setCart] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [showCheckout, setShowCheckout] = useState(false)
  const [showExpense, setShowExpense] = useState(false)
  const [showMobileCart, setShowMobileCart] = useState(false)
  const [globalDiscount, setGlobalDiscount] = useState(0)
  const [globalDiscountType, setGlobalDiscountType] = useState('amount')
  const [groupedProducts, setGroupedProducts] = useState({})
  const [customerData, setCustomerData] = useState({
    name: '', phone: '', address: '', email: ''
  });

  useEffect(() => { loadInitialData() }, [])
  useEffect(() => {
    const filtered = products.filter(product => {
      if (!product || typeof product.name !== 'string' || typeof product.sku !== 'string') return false;
      const matchSearch = searchTerm === '' || product.name.toLowerCase().includes(searchTerm.toLowerCase()) || product.sku.toLowerCase().includes(searchTerm.toLowerCase()) || product.brand?.toLowerCase().includes(searchTerm.toLowerCase()) || product.model?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCategory = selectedCategory === 'all' || product.category_id === selectedCategory;
      return matchSearch && matchCategory;
    });
    const grouped = filtered.reduce((acc, product) => {
      const categoryName = product.category_name || 'Lainnya';
      const brandName = product.brand || 'No Brand';
      if (!acc[categoryName]) acc[categoryName] = {};
      if (!acc[categoryName][brandName]) acc[categoryName][brandName] = [];
      acc[categoryName][brandName].push(product);
      return acc;
    }, {});
    setGroupedProducts(grouped);
  }, [products, searchTerm, selectedCategory])

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [productsData, categoriesData] = await Promise.all([
        productService.getProducts(),
        productService.getCategories()
      ]);
      setProducts(productsData);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Gagal memuat data');
    } finally {
      setLoading(false);
    }
  }

  const handleAddToCart = (product) => {
    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) {
      if (existingItem.quantity >= product.current_stock) {
        toast.error('Stok tidak mencukupi');
        return;
      }
      setCart(prev => prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setCart(prev => [...prev, { ...product, quantity: 1, discount: 0, discount_type: 'amount' }]);
    }
    toast.success(`${product.name} ditambahkan`);
  }
  const handleUpdateQuantity = (productId, newQuantity) => {
    if (newQuantity === 0) {
      setCart(prev => prev.filter(item => item.id !== productId));
      return;
    }
    const product = products.find(p => p.id === productId);
    if (newQuantity > product.current_stock) {
      toast.error('Stok tidak mencukupi');
      return;
    }
    setCart(prev => prev.map(item => item.id === productId ? { ...item, quantity: newQuantity } : item));
  }
  const handleUpdateItemDiscount = (productId, discount, discountType) => {
    setCart(prev => prev.map(item => item.id === productId ? { ...item, discount: discount || 0, discount_type: discountType || 'amount' } : item));
  }
  const handleRemoveItem = (productId) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  }
  const handleAddExpense = async (expenseData) => {
    try {
      await expenseService.createExpense({ ...expenseData, created_by: employee.id });
      setShowExpense(false);
      toast.success('Pengeluaran berhasil ditambahkan');
    } catch (error) {
      toast.error('Gagal menambahkan pengeluaran');
      throw error;
    }
  }

  const handleCheckout = async (checkoutData) => {
    if (cart.length === 0) {
      toast.error('Keranjang kosong');
      return;
    }
    
    const toastId = toast.loading('Memproses transaksi...');

    try {
      const transactionPayload = {
        items: cart.map(item => ({
          product_id: item.id,
          quantity: item.quantity,
          price: item.selling_price,
          discount: item.discount || 0,
          discount_type: item.discount_type || 'amount'
        })),
        cashier_id: employee.id,
        discount_amount_global: globalDiscount,
        payment_method: checkoutData.payment_method,
        amount_paid: checkoutData.amount_paid,
        customer_name: checkoutData.customer_name,
        customer_phone: checkoutData.customer_phone,
        customer_address: checkoutData.customer_address,
        customer_email: checkoutData.customer_email,
        notes: checkoutData.notes,
        tax_percent: checkoutData.tax_percent
      };

      const result = await transactionService.createTransaction(transactionPayload);
      
      if (!result.success) {
        throw new Error(result.error || 'Transaksi dari server gagal');
      }

      toast.success(`Transaksi berhasil!`, { id: toastId });

      if (isPrinterConnected || bluetoothPrinterService.getDevice()) {
        try {
          // --- PERBAIKAN: Sinkronkan nama properti di sini ---
          const receiptData = {
            // Data yang dibutuhkan oleh PrinterContext & bluetoothPrinterService
            id: result.transaction_id,
            transaction_number: result.transaction_number,
            transaction_date: new Date().toISOString(),
            cashier_name: employee.name,
            customer_name: checkoutData.customer_name,
            notes: checkoutData.notes,
            
            // Properti item harus bernama `transaction_items`
            // dan setiap item harus memiliki `name` dan `unit_price`
            transaction_items: cart.map(item => ({
                ...item,
                name: item.name,
                unit_price: item.selling_price,
            })),
            
            // Properti finansial
            subtotal: checkoutData.subtotal,
            discount_amount: checkoutData.total_discount, // Nama diubah
            total_amount: checkoutData.final_total,      // Nama diubah
            amount_paid: checkoutData.amount_paid,       // Nama diubah
            change_amount: checkoutData.change_amount,   // Nama diubah

            // Properti lain (opsional, tapi baik untuk ada)
            tax_percent: checkoutData.tax_percent,
            tax_amount: checkoutData.tax_amount,
            remaining_balance: checkoutData.remaining_balance,
            payment_method: checkoutData.payment_method,
            payment_type: checkoutData.payment_type,
          };

          await (printReceipt ? printReceipt(receiptData) : bluetoothPrinterService.printReceipt(receiptData));
          toast.success('Struk berhasil dicetak!');
        } catch (printError) {
          toast.error(`Gagal mencetak struk: ${printError.message}`);
          console.error("Print error:", printError);
        }
      }

      setCart([]);
      setGlobalDiscount(0);
      setGlobalDiscountType('amount');
      setCustomerData({ name: '', phone: '', address: '', email: '' });
      setShowCheckout(false);
      setShowMobileCart(false);
      loadInitialData();
      
    } catch (error) {
      toast.error(`Transaksi gagal: ${error.message}`, { id: toastId });
      console.error("Checkout failed:", error);
      throw error;
    }
  }

  const handleProceedToCheckout = () => {
    if (cart.length === 0) {
      toast.error('Keranjang belanja masih kosong.');
      return;
    }
    setShowCheckout(true);
  };


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat produk...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Header employee={employee} onLogout={logout} />
      <div className="flex h-[calc(100vh-4rem)]">
        <div className="flex-1 p-2 md:p-4 overflow-y-auto">
          <div className="mb-3 md:mb-4">
            <button onClick={() => setShowExpense(true)} className="mb-3 px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium">+ Pengeluaran</button>
            <div className="flex flex-col md:flex-row gap-2 md:gap-3">
              <input type="text" placeholder="Cari produk..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="flex-1 px-3 py-2 text-sm md:text-base border rounded-lg"/>
              <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="px-3 py-2 text-sm md:text-base border rounded-lg">
                <option value="all">Semua Kategori</option>
                {categories.map(cat => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}
              </select>
            </div>
          </div>
          <div className="space-y-6">
            {Object.keys(groupedProducts).length > 0 ? (
              Object.entries(groupedProducts).map(([categoryName, brands]) => (
                <div key={categoryName}>
                  <h2 className="text-lg font-bold text-gray-800 mb-3 pb-2 border-b">{categoryName}</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 md:gap-3">
                    {Object.entries(brands).map(([brandName, brandProducts]) => (
                      <ProductCard key={`${categoryName}-${brandName}`} brand={brandName} products={brandProducts} onAddToCart={handleAddToCart}/>
                    ))}
                  </div>
                </div>
              ))
            ) : (<div className="text-center py-12"><p className="text-gray-500">Tidak ada produk ditemukan</p></div>)}
          </div>
        </div>
        
        <div className="hidden lg:block w-96 p-4 bg-gray-50 border-l">
          <Cart
            items={cart}
            onUpdateQuantity={handleUpdateQuantity}
            onUpdateItemDiscount={handleUpdateItemDiscount}
            onRemoveItem={handleRemoveItem}
            onCheckout={handleProceedToCheckout}
            globalDiscount={globalDiscount}
            globalDiscountType={globalDiscountType}
            onGlobalDiscountChange={setGlobalDiscount}
            onGlobalDiscountTypeChange={setGlobalDiscountType}
          />
        </div>

        <button onClick={() => setShowMobileCart(true)} className="lg:hidden fixed bottom-4 right-4 bg-blue-600 text-white p-3 rounded-full shadow-lg z-10">
          🛒
          {cart.length > 0 && (<span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">{cart.reduce((sum, item) => sum + item.quantity, 0)}</span>)}
        </button>
      </div>

      {showMobileCart && (
        <div className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex">
          <div className="bg-white w-full max-w-md ml-auto h-full overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-semibold">Keranjang</h2>
              <button onClick={() => setShowMobileCart(false)}>✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <Cart
                items={cart}
                onUpdateQuantity={handleUpdateQuantity}
                onUpdateItemDiscount={handleUpdateItemDiscount}
                onRemoveItem={handleRemoveItem}
                onCheckout={() => {
                  setShowMobileCart(false);
                  handleProceedToCheckout();
                }}
                globalDiscount={globalDiscount}
                globalDiscountType={globalDiscountType}
                onGlobalDiscountChange={setGlobalDiscount}
                onGlobalDiscountTypeChange={setGlobalDiscountType}
              />
            </div>
          </div>
        </div>
      )}

      {showCheckout && (
        <CheckoutModal
          cart={cart}
          onClose={() => setShowCheckout(false)}
          onConfirm={handleCheckout}
          globalDiscount={globalDiscount}
          globalDiscountType={globalDiscountType}
          employeeId={employee.id}
          initialCustomerData={customerData}
        />
      )}

      {showExpense && (
        <ExpenseModal onClose={() => setShowExpense(false)} onSubmit={handleAddExpense}/>
      )}
    </div>
  )
}
