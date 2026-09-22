export interface OrderItem {
  id: string;
  namaBarang: string;
  harga: number;
  qty: number;
  diskonPersen: number; // Diskon dalam % (misal 10 untuk 10%)
  jumlah: number; // Subtotal setelah diskon: (harga * qty) * (1 - diskon/100)
}

export type PaymentType = 'DP' | 'Cicilan' | 'Pelunasan';

export interface PaymentRecord {
  id: string;
  orderId: string;
  tanggal: string; // YYYY-MM-DD
  jenis: PaymentType;
  label: string; // contoh: "DP Awal", "Cicilan 1", "Cicilan 2", "Pelunasan"
  jumlah: number;
  metode: string; // contoh: "Transfer BCA", "Transfer Mandiri", "Tunai"
  catatan?: string;
  buktiUrl?: string;
  createdAt: string;
}

export type OrderStatus = 'Diproses' | 'Siap Kirim' | 'Dikirim' | 'Selesai' | 'Dibatalkan';
export type PaymentStatus = 'Belum Bayar' | 'DP Saja' | 'Cicilan Sebagian' | 'Lunas';

export interface Order {
  id: string;
  invoiceNo: string; // contoh: "INV/2026/09/001"
  tanggal: string; // YYYY-MM-DD
  jatuhTempo?: string; // YYYY-MM-DD
  
  // Pelanggan
  namaPelanggan: string;
  noWhatsApp: string;
  alamat?: string;
  ekspedisi?: string; // contoh: "JNE REG", "J&T", "SiCepat"
  
  // Spesifikasi Busana / Seri
  brandSeries: string; // contoh: "Juju / Farasyah"
  
  // Barang & Rincian
  items: OrderItem[];
  
  // Rincian Biaya
  totalItem: number;
  subtotal: number;
  biayaRequest: number; // biaya custom/potong/request khusus
  ongkirPacking: number;
  totalTagihan: number; // subtotal + biayaRequest + ongkirPacking
  
  // Riwayat Pembayaran
  pembayaran: PaymentRecord[];
  totalDp: number;
  totalCicilan: number;
  totalTerbayar: number; // totalDp + totalCicilan
  kekurangan: number; // totalTagihan - totalTerbayar (Sisa yang belum dibayar)
  
  // Status
  statusPembayaran: PaymentStatus;
  statusPesanan: OrderStatus;
  
  // Pengingat WA
  terakhirIngatkanWA?: string;
  catatanKhusus?: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface ShopProfile {
  namaToko: string;
  tagline: string;
  alamat: string;
  email: string;
  noHp: string;
  bankInfo: string;
}

export interface GoogleSyncState {
  isConnected: boolean;
  userEmail: string | null;
  spreadsheetId: string | null;
  spreadsheetUrl: string | null;
  lastSyncedAt: string | null;
  isSyncing: boolean;
  errorMessage: string | null;
}
