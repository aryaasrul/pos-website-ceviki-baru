import React, { createContext, useContext, useState } from 'react';
import { printerService } from '../services/printerService';
import toast from 'react-hot-toast';

const PrinterContext = createContext({});

export function PrinterProvider({ children }) {
  const [isConnected, setIsConnected] = useState(false);
  const [device, setDevice] = useState(null);
  const [loading, setLoading] = useState(false);

  const connectPrinter = async () => {
    if (printerService.isConnected()) {
      toast.success('Printer sudah terhubung.');
      return;
    }
    try {
      setLoading(true);
      const { success, device } = await printerService.connect();
      if (success) {
        setIsConnected(true);
        setDevice(device);
        toast.success(`Printer ${device.name} berhasil terhubung.`);
      }
    } catch (error) {
      toast.error(`Gagal menghubungkan printer: ${error.message}`);
      setIsConnected(false);
      setDevice(null);
    } finally {
      setLoading(false);
    }
  };

  const printReceipt = async (cartItems, paymentDetails, employeeName) => {
    try {
      await printerService.print(cartItems, paymentDetails, employeeName);
      toast.success('Struk berhasil dicetak.');
    } catch (error) {
      toast.error(`Gagal mencetak: ${error.message}`);
    }
  };

  const value = {
    isConnected,
    device,
    loading,
    connectPrinter,
    printReceipt,
  };

  return (
    <PrinterContext.Provider value={value}>
      {children}
    </PrinterContext.Provider>
  );
}

export const usePrinter = () => {
  const context = useContext(PrinterContext);
  if (!context) {
    throw new Error('usePrinter must be used within PrinterProvider');
  }
  return context;
};