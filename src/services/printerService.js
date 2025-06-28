/**
 * printerService.js
 * Modul untuk menangani koneksi dan pencetakan ke printer thermal via Web Bluetooth.
 */

let printerDevice = null;
let printerCharacteristic = null;

const ESC_POS_COMMANDS = {
    LF: '\n',
    ESC: '\x1B',
    GS: '\x1D',
    INITIALIZE: '\x1B@',
    ALIGN_LEFT: '\x1Ba\x00',
    ALIGN_CENTER: '\x1Ba\x01',
    ALIGN_RIGHT: '\x1Ba\x02',
    BOLD_ON: '\x1BE\x01',
    BOLD_OFF: '\x1BE\x00',
    DOUBLE_HEIGHT_WIDTH_ON: '\x1D!\x11',
    DOUBLE_HEIGHT_WIDTH_OFF: '\x1D!\x00',
    FEED_LINES: (n) => `\x1Bd${String.fromCharCode(n)}`,
    CUT_PAPER: '\x1DV\x41\x03',
};

async function connect() {
    try {
        printerDevice = await navigator.bluetooth.requestDevice({
            filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }],
            optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb']
        });

        const server = await printerDevice.gatt.connect();
        const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
        const characteristics = await service.getCharacteristics();
        printerCharacteristic = characteristics.find(c => c.properties.write || c.properties.writeWithoutResponse);

        if (!printerCharacteristic) {
            throw new Error('Printer tidak kompatibel.');
        }

        return { success: true, device: printerDevice };
    } catch (error) {
        printerDevice = null;
        printerCharacteristic = null;
        throw error;
    }
}

function isConnected() {
    return !!(printerDevice && printerDevice.gatt.connected && printerCharacteristic);
}

async function write(data) {
    if (!isConnected()) throw new Error('Printer tidak terhubung.');
    const encoder = new TextEncoder();
    const buffer = encoder.encode(data);
    await printerCharacteristic.writeValueWithoutResponse(buffer);
}

function generateReceiptText(cartItems, paymentDetails, employeeName) {
    const {
        LF, INITIALIZE, ALIGN_CENTER, ALIGN_LEFT, BOLD_ON, BOLD_OFF,
        DOUBLE_HEIGHT_WIDTH_ON, DOUBLE_HEIGHT_WIDTH_OFF, FEED_LINES, CUT_PAPER
    } = ESC_POS_COMMANDS;
    
    const storeName = localStorage.getItem('storeName') || 'Nama Toko Anda';
    const storeAddress = localStorage.getItem('storeAddress') || 'Alamat Toko Anda';

    let receipt = '';
    receipt += INITIALIZE;
    receipt += ALIGN_CENTER;
    receipt += BOLD_ON;
    receipt += storeName + LF;
    receipt += BOLD_OFF;
    receipt += storeAddress + LF;
    receipt += `No: ${paymentDetails.transactionNumber}` + LF;
    receipt += '--------------------------------' + LF;
    
    receipt += ALIGN_LEFT;
    receipt += 'Item'.padEnd(16) + 'Qty'.padEnd(4) + 'Total'.padStart(12) + LF;
    receipt += '--------------------------------' + LF;

    cartItems.forEach(item => {
        const itemName = item.name.length > 15 ? item.name.substring(0, 15) + '.' : item.name;
        const qty = item.quantity.toString();
        const itemSubtotal = item.selling_price * item.quantity;
        const itemDiscount = item.discountType === 'percentage' ? (itemSubtotal * item.discount / 100) : (item.discount || 0);
        const itemTotal = itemSubtotal - itemDiscount;
        const totalString = `${itemTotal.toLocaleString('id-ID')}`;
        receipt += itemName.padEnd(16) + qty.padEnd(4) + totalString.padStart(12) + LF;
    });

    receipt += '--------------------------------' + LF;

    receipt += 'Subtotal'.padEnd(20) + `${paymentDetails.subtotal.toLocaleString('id-ID')}`.padStart(12) + LF;
    if (paymentDetails.totalDiscount > 0) {
        receipt += 'Diskon'.padEnd(20) + `-${paymentDetails.totalDiscount.toLocaleString('id-ID')}`.padStart(12) + LF;
    }
    receipt += BOLD_ON;
    receipt += 'Total'.padEnd(20) + `${paymentDetails.finalTotal.toLocaleString('id-ID')}`.padStart(12) + LF;
    receipt += BOLD_OFF;
    receipt += 'Bayar'.padEnd(20) + `${paymentDetails.amount_paid.toLocaleString('id-ID')}`.padStart(12) + LF;
    receipt += 'Kembali'.padEnd(20) + `${paymentDetails.change.toLocaleString('id-ID')}`.padStart(12) + LF;

    receipt += LF;
    receipt += ALIGN_CENTER;
    receipt += `Kasir: ${employeeName || 'N/A'}` + LF;
    receipt += new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'medium' }) + LF + LF;
    receipt += 'Terima Kasih!' + LF;
    receipt += FEED_LINES(3);
    receipt += CUT_PAPER;

    return receipt;
}

async function print(cartItems, paymentDetails, employeeName) {
    if (!isConnected()) {
        const doConnect = window.confirm("Printer tidak terhubung. Hubungkan sekarang?");
        if (doConnect) {
            await connect();
        } else {
            return;
        }
    }
    const receiptText = generateReceiptText(cartItems, paymentDetails, employeeName);
    await write(receiptText);
}

export const printerService = {
    connect,
    print,
    isConnected,
};
