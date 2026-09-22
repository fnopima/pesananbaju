import { Order, PaymentRecord, ShopProfile } from '../types';

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount).replace('IDR', 'Rp');
}

export function formatTanggal(dateStr: string): string {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

/**
 * Normalisasi nomor HP ke format internasional WhatsApp (628...)
 */
export function normalizeWhatsAppNumber(phone: string): string {
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.substring(1);
  } else if (!cleaned.startsWith('62')) {
    cleaned = '62' + cleaned;
  }
  return cleaned;
}

/**
 * Buat pesan pengingat jatuh tempo pembayaran cicilan / pelunasan
 */
export function generateDueDateReminderMessage(order: Order, shop: ShopProfile): string {
  const itemList = order.items
    .map((item, idx) => `  ${idx + 1}. ${item.namaBarang} (${item.qty}x) = ${formatRupiah(item.jumlah)}`)
    .join('\n');

  const historyBayar = order.pembayaran.length > 0
    ? order.pembayaran.map((p) => `  • ${p.label} (${formatTanggal(p.tanggal)}): ${formatRupiah(p.jumlah)}`).join('\n')
    : '  • Belum ada pembayaran';

  return `*PENGINGAT JATUH TEMPO PEMBAYARAN*
_${shop.namaToko} - ${shop.tagline}_
--------------------------------------------
Assalamu'alaikum Wr. Wb. Kak *${order.namaPelanggan}* 🙏

Kami ingin menginformasikan pengingat jatuh tempo cicilan/pelunasan pesanan busana Kakak:

📄 *No. Invoice:* ${order.invoiceNo}
👗 *Brand / Series:* ${order.brandSeries}
📅 *Tanggal Jatuh Tempo:* ${formatTanggal(order.jatuhTempo || '')}

📦 *Rincian Pesanan:*
${itemList}

💰 *Ringkasan Biaya:*
• Subtotal Barang: ${formatRupiah(order.subtotal)}
${order.biayaRequest > 0 ? `• Biaya Request: ${formatRupiah(order.biayaRequest)}\n` : ''}${order.ongkirPacking > 0 ? `• Ongkir + Packing: ${formatRupiah(order.ongkirPacking)}\n` : ''}• *Total Tagihan:* ${formatRupiah(order.totalTagihan)}

💳 *Riwayat Pembayaran:*
${historyBayar}
• Total Sudah Masuk: ${formatRupiah(order.totalTerbayar)}

⚠️ *SISA CICILAN YANG BELUM DIBAYAR:*
👉 *${formatRupiah(order.kekurangan)}*

Mohon melakukan konfirmasi atau pembayaran sebelum tanggal jatuh tempo ya Kak agar pesanan dapat segera diproses/dikirimkan.

🏦 *Rekening Pembayaran:*
${shop.bankInfo}

Jika sudah melakukan transfer, silakan kirimkan bukti transfer ke chat ini. Terima kasih banyak atas kepercayaan Kakak berbelanja di *${shop.namaToko}* ❤️

_Alamat Toko: ${shop.alamat} | WA: ${shop.noHp}_`;
}

/**
 * Buat pesan konfirmasi pembayaran DP atau Cicilan yang baru diterima
 */
export function generatePaymentReceivedMessage(order: Order, payment: PaymentRecord, shop: ShopProfile): string {
  const isLunas = order.kekurangan <= 0;
  return `*KONFIRMASI PEMBAYARAN DITERIMA*
_${shop.namaToko} - ${shop.tagline}_
--------------------------------------------
Alhamdulillah, terima kasih Kak *${order.namaPelanggan}* 🙏

Pembayaran Kakak telah kami terima dan catat ke dalam sistem kami:

📄 *No. Invoice:* ${order.invoiceNo}
👗 *Brand / Series:* ${order.brandSeries}
💵 *Jenis Pembayaran:* ${payment.label}
💸 *Nominal Diterima:* *${formatRupiah(payment.jumlah)}*
📅 *Tanggal Bayar:* ${formatTanggal(payment.tanggal)}
🏦 *Metode:* ${payment.metode}

📊 *Status Tagihan Saat Ini:*
• Total Tagihan: ${formatRupiah(order.totalTagihan)}
• Total Sudah Dibayar: ${formatRupiah(order.totalTerbayar)}
${isLunas ? '🎉 *STATUS: SUDAH LUNAS SEPENUHNYA!*' : `⚠️ *Sisa Cicilan Belum Bayar:* *${formatRupiah(order.kekurangan)}*`}

${isLunas ? 'Pesanan Kakak akan segera kami siapkan untuk pengiriman.' : `Jatuh tempo cicilan berikutnya: *${formatTanggal(order.jatuhTempo || '-')}*.`}

Terima kasih banyak atas kerja sama Kakak bersama *${shop.namaToko}* ❤️`;
}

/**
 * Buat tautan langsung ke WhatsApp Web / Aplikasi
 */
export function createWhatsAppUrl(phone: string, text: string): string {
  const cleanPhone = normalizeWhatsAppNumber(phone);
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
}
