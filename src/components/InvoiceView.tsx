import React, { useRef, useState } from 'react';
import { Order, ShopProfile } from '../types';
import { formatRupiah, formatTanggal, createWhatsAppUrl } from '../lib/whatsapp';
import { downloadInvoiceAsPdf, printInvoiceElement } from '../lib/invoiceExport';
import {
  Printer,
  Share2,
  Copy,
  Check,
  X,
  CreditCard,
  AlertCircle,
  Download,
  Loader2,
} from 'lucide-react';

interface InvoiceViewProps {
  order: Order;
  shopProfile: ShopProfile;
  onClose?: () => void;
  onOpenPaymentModal?: () => void;
}

export const InvoiceView: React.FC<InvoiceViewProps> = ({
  order,
  shopProfile,
  onClose,
  onOpenPaymentModal,
}) => {
  const [copied, setCopied] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const invoiceRef = useRef<HTMLDivElement>(null);

  const handleDownloadPdf = async () => {
    if (!invoiceRef.current) return;
    setIsGeneratingPdf(true);
    setExportError(null);
    try {
      const safeCustomerName = (order.namaPelanggan || 'Pelanggan').replace(/[^a-zA-Z0-9]/g, '_');
      const safeInvoiceNo = (order.invoiceNo || 'INV').replace(/[^a-zA-Z0-9]/g, '-');
      const filename = `Invoice_${safeInvoiceNo}_${safeCustomerName}.pdf`;
      await downloadInvoiceAsPdf(invoiceRef.current, filename);
    } catch (err: unknown) {
      console.error('Error generating PDF:', err);
      const msg = err instanceof Error ? err.message : 'Gagal membuat file PDF';
      setExportError(msg);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrint = () => {
    if (!invoiceRef.current) return;
    printInvoiceElement(
      invoiceRef.current,
      `Invoice ${order.invoiceNo} - ${order.namaPelanggan} - ${shopProfile.namaToko}`
    );
  };

  const handleCopyText = () => {
    const lines: string[] = [
      `*INVOICE ${order.invoiceNo}*`,
      `*${shopProfile.namaToko} - ${shopProfile.tagline}*`,
      `${shopProfile.alamat} | ${shopProfile.noHp}`,
      `----------------------------------------`,
      `Kepada: ${order.namaPelanggan}`,
      `Brand / Series: ${order.brandSeries}`,
      `Tanggal: ${formatTanggal(order.tanggal)}`,
      order.jatuhTempo ? `Jatuh Tempo: ${formatTanggal(order.jatuhTempo)}` : '',
      `----------------------------------------`,
      `*Rincian Barang:*`,
      ...order.items.map(
        (it, idx) =>
          `${idx + 1}. ${it.namaBarang} | ${formatRupiah(it.harga)} x ${it.qty} (disc ${it.diskonPersen}%) = ${formatRupiah(it.jumlah)}`
      ),
      `----------------------------------------`,
      `Total Item : ${order.totalItem}`,
      `Total Barang : ${formatRupiah(order.subtotal)}`,
      order.biayaRequest > 0 ? `Biaya Request : ${formatRupiah(order.biayaRequest)}` : '',
      order.ongkirPacking > 0 ? `Ongkir + packing : ${formatRupiah(order.ongkirPacking)}` : '',
      `Total Tagihan : ${formatRupiah(order.totalTagihan)}`,
      `----------------------------------------`,
      `Dp Masuk : ${formatRupiah(order.totalDp)}`,
      order.totalCicilan > 0 ? `Cicilan Masuk : ${formatRupiah(order.totalCicilan)}` : '',
      `Total Terbayar : ${formatRupiah(order.totalTerbayar)}`,
      `*KEKURANGAN / SISA : ${formatRupiah(order.kekurangan)}*`,
      `----------------------------------------`,
      order.ekspedisi ? `Ekspedisi: ${order.ekspedisi}` : '',
      order.alamat ? `Alamat: ${order.alamat}` : '',
    ].filter(Boolean);

    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendWhatsApp = () => {
    const text = `Assalamu'alaikum Kak *${order.namaPelanggan}*,\nBerikut kami lampirkan rincian Invoice pesanan *${order.brandSeries}* dari *${shopProfile.namaToko}*:\n\n📄 No Invoice: *${order.invoiceNo}*\n📅 Tanggal: ${formatTanggal(order.tanggal)}\n💰 Total Tagihan: *${formatRupiah(order.totalTagihan)}*\n💵 DP Masuk: ${formatRupiah(order.totalDp)}${order.totalCicilan > 0 ? `\n💳 Cicilan Masuk: ${formatRupiah(order.totalCicilan)}` : ''}\n⚠️ *Sisa Cicilan/Kekurangan: ${formatRupiah(order.kekurangan)}*\n${order.jatuhTempo ? `⏰ Jatuh Tempo: ${formatTanggal(order.jatuhTempo)}\n` : ''}\nRekening Pembayaran:\n${shopProfile.bankInfo}\n\nTerima kasih banyak!`;
    const url = createWhatsAppUrl(order.noWhatsApp, text);
    window.open(url, '_blank');
  };

  const isLunas = order.kekurangan <= 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Action Toolbar (hidden during print) */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3 bg-stone-100 p-3 rounded-lg border border-stone-200">
        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
            isLunas ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
          }`}>
            {isLunas ? 'Status: LUNAS' : `Belum Lunas (Sisa ${formatRupiah(order.kekurangan)})`}
          </span>
          {order.jatuhTempo && !isLunas && (
            <span className="text-xs text-stone-600 flex items-center gap-1">
              <AlertCircle size={14} className="text-amber-600" />
              Jatuh Tempo: <strong>{formatTanggal(order.jatuhTempo)}</strong>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-copy-invoice-text"
            onClick={handleCopyText}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-700 bg-white border border-stone-300 rounded hover:bg-stone-50 transition shadow-xs"
            title="Salin Rincian Teks"
          >
            {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
            {copied ? 'Tersalin!' : 'Salin Teks'}
          </button>

          <button
            id="btn-share-invoice-wa"
            onClick={handleSendWhatsApp}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-300 rounded hover:bg-emerald-100 transition shadow-xs"
            title="Kirim ke WhatsApp"
          >
            <Share2 size={14} />
            Kirim WA
          </button>

          {onOpenPaymentModal && !isLunas && (
            <button
              id="btn-record-installment"
              onClick={onOpenPaymentModal}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#264936] rounded hover:bg-[#1d3829] transition shadow-xs"
              title="Catat Cicilan / DP"
            >
              <CreditCard size={14} />
              Catat Cicilan
            </button>
          )}

          {/* Dedicated Download PDF button */}
          <button
            id="btn-download-pdf"
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-rose-700 hover:bg-rose-800 disabled:opacity-60 rounded transition shadow-xs"
            title="Unduh Invoice sebagai file PDF"
          >
            {isGeneratingPdf ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Membuat PDF...</span>
              </>
            ) : (
              <>
                <Download size={14} />
                <span>Unduh PDF</span>
              </>
            )}
          </button>

          {/* Dedicated Print button */}
          <button
            id="btn-print-invoice"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-stone-800 hover:bg-stone-900 rounded transition shadow-xs"
            title="Cetak langsung ke printer atau dialog cetak"
          >
            <Printer size={14} />
            <span>Cetak</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-stone-500 hover:text-stone-700 hover:bg-stone-200 rounded"
              title="Tutup"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {exportError && (
        <div className="no-print p-2.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center justify-between">
          <span>{exportError}</span>
          <button onClick={() => setExportError(null)} className="text-rose-500 hover:text-rose-800">
            <X size={14} />
          </button>
        </div>
      )}

      {/* INVOICE CARD (Faithful to uploaded ByUzmaa invoice image) */}
      <div
        ref={invoiceRef}
        className="invoice-card bg-white text-stone-900 mx-auto w-full max-w-[820px] p-6 sm:p-8 rounded-none border border-stone-300 shadow-sm font-sans"
        style={{
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          backgroundColor: '#ffffff',
          color: '#1c1917',
          borderColor: '#d6d3d1',
        }}
      >
        {/* Top Brand Header */}
        <div className="text-center pb-4">
          <div className="flex items-center justify-center gap-1.5 text-3xl font-extrabold tracking-tight" style={{ color: '#000000' }}>
            <span>ByUzmaa</span>
            <span className="inline-block w-3.5 h-3.5 rounded-full ml-0.5" style={{ backgroundColor: '#000000' }}></span>
          </div>
          <div className="text-xs tracking-wide font-medium mt-0.5" style={{ color: '#57534e' }}>
            {shopProfile.tagline}
          </div>
          <div className="text-xs mt-2 font-normal" style={{ color: '#44403c' }}>
            {shopProfile.alamat} | {shopProfile.email} | {shopProfile.noHp}
          </div>
        </div>

        {/* Dark Pine Green Banner */}
        <div
          className="text-white px-5 py-4 flex flex-row justify-between items-center mt-2"
          style={{ backgroundColor: '#264936', color: '#ffffff' }}
        >
          {/* Left: Kepada & Brand/Series */}
          <div className="space-y-1">
            <div className="text-xs font-medium tracking-wide" style={{ color: '#d1fae5' }}>
              Kepada :
            </div>
            <div className="text-lg sm:text-xl font-bold tracking-tight text-white leading-tight" style={{ color: '#ffffff' }}>
              {order.namaPelanggan}
            </div>
            <div className="text-xs font-medium tracking-wide pt-1" style={{ color: '#d1fae5' }}>
              Brand / Series :
            </div>
            <div className="text-sm sm:text-base font-bold tracking-tight text-white leading-tight" style={{ color: '#ffffff' }}>
              {order.brandSeries || '-'}
            </div>
          </div>

          {/* Right: INVOICE title & Date */}
          <div className="text-right">
            <div className="text-2xl sm:text-3xl font-extrabold tracking-wider" style={{ color: '#ffffff' }}>
              INVOICE
            </div>
            <div className="text-sm sm:text-base font-semibold mt-1" style={{ color: '#d1fae5' }}>
              {formatTanggal(order.tanggal)}
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="mt-3 overflow-x-auto">
          <table className="w-full border-collapse border border-black text-xs sm:text-sm" style={{ borderColor: '#000000' }}>
            <thead>
              <tr className="text-white font-semibold text-center border-b border-black" style={{ backgroundColor: '#1f3e2e', color: '#ffffff', borderColor: '#000000' }}>
                <th className="py-1.5 px-2 border-r border-black w-10" style={{ borderColor: '#000000' }}>No</th>
                <th className="py-1.5 px-3 border-r border-black text-center" style={{ borderColor: '#000000' }}>Nama Barang</th>
                <th className="py-1.5 px-3 border-r border-black w-28 text-center" style={{ borderColor: '#000000' }}>Harga</th>
                <th className="py-1.5 px-2 border-r border-black w-14 text-center" style={{ borderColor: '#000000' }}>Qty</th>
                <th className="py-1.5 px-2 border-r border-black w-14 text-center" style={{ borderColor: '#000000' }}>Disc</th>
                <th className="py-1.5 px-3 w-28 text-center" style={{ borderColor: '#000000' }}>Jumlah</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, index) => (
                <tr key={item.id || index} className="border-b border-black" style={{ borderColor: '#000000', color: '#1c1917' }}>
                  <td className="py-1.5 px-2 border-r border-black text-center align-middle font-medium" style={{ borderColor: '#000000' }}>
                    {index + 1}
                  </td>
                  <td className="py-1.5 px-3 border-r border-black text-left align-middle font-normal" style={{ borderColor: '#000000' }}>
                    {item.namaBarang}
                  </td>
                  <td className="py-1.5 px-3 border-r border-black text-right align-middle whitespace-nowrap" style={{ borderColor: '#000000' }}>
                    {formatRupiah(item.harga)}
                  </td>
                  <td className="py-1.5 px-2 border-r border-black text-center align-middle" style={{ borderColor: '#000000' }}>
                    {item.qty}
                  </td>
                  <td className="py-1.5 px-2 border-r border-black text-center align-middle" style={{ borderColor: '#000000' }}>
                    {item.diskonPersen > 0 ? `${item.diskonPersen}` : '-'}
                  </td>
                  <td className="py-1.5 px-3 text-right align-middle whitespace-nowrap font-medium" style={{ borderColor: '#000000' }}>
                    {formatRupiah(item.jumlah)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Bottom Details Section */}
        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm" style={{ color: '#1c1917' }}>
          {/* Bottom Left: Item, Eksp, Alamat */}
          <div className="space-y-1.5 pt-1" style={{ color: '#1c1917' }}>
            <div className="flex items-baseline">
              <span className="w-16 font-semibold">Item</span>
              <span className="w-3 font-semibold">:</span>
              <span className="font-semibold">{order.totalItem}</span>
            </div>
            <div className="flex items-baseline">
              <span className="w-16 font-semibold">Eksp</span>
              <span className="w-3 font-semibold">:</span>
              <span>{order.ekspedisi || ''}</span>
            </div>
            <div className="flex items-baseline">
              <span className="w-16 font-semibold">Alamat</span>
              <span className="w-3 font-semibold">:</span>
              <span className="break-words flex-1" style={{ color: '#292524' }}>{order.alamat || ''}</span>
            </div>
            {order.catatanKhusus && (
              <div className="flex items-baseline text-xs pt-1 italic" style={{ color: '#57534e' }}>
                <span className="w-16 font-medium">Catatan</span>
                <span className="w-3 font-medium">:</span>
                <span className="flex-1">{order.catatanKhusus}</span>
              </div>
            )}
          </div>

          {/* Bottom Right: Financial Summary */}
          <div className="space-y-1 pt-1" style={{ color: '#1c1917' }}>
            {/* Total */}
            <div className="flex justify-between items-center py-0.5">
              <span className="font-medium text-right flex-1 pr-3">Total</span>
              <span className="font-medium pr-3">:</span>
              <span className="font-bold w-28 sm:w-32 text-right border-b pb-0.5 whitespace-nowrap" style={{ borderColor: '#000000' }}>
                {formatRupiah(order.subtotal)}
              </span>
            </div>

            {/* Biaya Request */}
            <div className="flex justify-between items-center py-0.5">
              <span className="font-medium text-right flex-1 pr-3">Biaya Request</span>
              <span className="font-medium pr-3">:</span>
              <span className="w-28 sm:w-32 text-right border-b pb-0.5 whitespace-nowrap" style={{ borderColor: '#000000' }}>
                {order.biayaRequest > 0 ? formatRupiah(order.biayaRequest) : ''}
              </span>
            </div>

            {/* Ongkir + packing */}
            <div className="flex justify-between items-center py-0.5">
              <span className="font-medium text-right flex-1 pr-3">Ongkir + packing</span>
              <span className="font-medium pr-3">:</span>
              <span className="w-28 sm:w-32 text-right border-b pb-0.5 whitespace-nowrap" style={{ borderColor: '#000000' }}>
                {order.ongkirPacking > 0 ? formatRupiah(order.ongkirPacking) : ''}
              </span>
            </div>

            {/* Dp */}
            <div className="flex justify-between items-center py-0.5">
              <span className="font-medium text-right flex-1 pr-3">Dp</span>
              <span className="font-medium pr-3">:</span>
              <span className="w-28 sm:w-32 text-right border-b pb-0.5 whitespace-nowrap font-medium" style={{ borderColor: '#000000' }}>
                {order.totalDp > 0 ? formatRupiah(order.totalDp) : ''}
              </span>
            </div>

            {/* Cicilan */}
            <div className="flex justify-between items-center py-0.5">
              <span className="font-medium text-right flex-1 pr-3">Cicilan</span>
              <span className="font-medium pr-3">:</span>
              <span className="w-28 sm:w-32 text-right border-b pb-0.5 whitespace-nowrap" style={{ borderColor: '#000000' }}>
                {order.totalCicilan > 0 ? formatRupiah(order.totalCicilan) : ''}
              </span>
            </div>

            {/* Kekurangan (Bold Highlight Underline) */}
            <div className="flex justify-between items-center pt-1 font-bold">
              <span className="text-right flex-1 pr-3 font-bold" style={{ color: '#000000' }}>Kekurangan</span>
              <span className="pr-3 font-bold" style={{ color: '#000000' }}>:</span>
              <span className="w-28 sm:w-32 text-right border-b-2 pb-1 font-extrabold text-sm sm:text-base whitespace-nowrap" style={{ borderColor: '#000000', color: '#000000' }}>
                {formatRupiah(order.kekurangan)}
              </span>
            </div>
          </div>
        </div>

        {/* Detailed Payment History Box (Collapsible / Informational) */}
        {order.pembayaran && order.pembayaran.length > 0 && (
          <div className="mt-6 pt-4 border-t border-dashed text-xs" style={{ borderColor: '#d6d3d1' }}>
            <div className="font-semibold mb-2 flex items-center justify-between" style={{ color: '#44403c' }}>
              <span>Riwayat Pembayaran Diterima ({order.pembayaran.length} transaksi)</span>
              <span className="font-normal" style={{ color: '#78716c' }}>
                Total Terbayar: <strong>{formatRupiah(order.totalTerbayar)}</strong> / Tagihan:{' '}
                {formatRupiah(order.totalTagihan)}
              </span>
            </div>
            <div className="rounded border divide-y" style={{ backgroundColor: '#fafaf9', borderColor: '#e7e5e4' }}>
              {order.pembayaran.map((p, idx) => (
                <div key={p.id || idx} className="p-2 flex items-center justify-between" style={{ borderColor: '#e7e5e4', color: '#44403c' }}>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center" style={{ backgroundColor: '#d1fae5', color: '#065f46' }}>
                      {idx + 1}
                    </span>
                    <div>
                      <span className="font-semibold" style={{ color: '#1c1917' }}>{p.label}</span>{' '}
                      <span style={{ color: '#78716c' }}>({formatTanggal(p.tanggal)})</span>
                      {p.catatan && <span className="ml-2 italic" style={{ color: '#78716c' }}>"{p.catatan}"</span>}
                    </div>
                  </div>
                  <div className="font-semibold" style={{ color: '#065f46' }}>
                    {formatRupiah(p.jumlah)} <span className="text-[10px] font-normal" style={{ color: '#78716c' }}>via {p.metode}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bank & Payment Info Footer */}
        <div className="mt-6 pt-3 text-center border-t text-xs" style={{ borderColor: '#e7e5e4', color: '#78716c' }}>
          <div>Silakan melakukan pembayaran ke rekening: <strong style={{ color: '#1c1917' }}>{shopProfile.bankInfo}</strong></div>
          <div className="mt-0.5 text-[11px]" style={{ color: '#a8a29e' }}>
            Terima kasih telah berbelanja pakaian di {shopProfile.namaToko}. Harap simpan bukti pembayaran dan invoice ini.
          </div>
        </div>
      </div>

      {/* Bottom Action Bar for Quick Access */}
      <div className="no-print flex flex-wrap items-center justify-between gap-2 bg-stone-100 p-3 rounded-lg border border-stone-200">
        <div className="text-xs text-stone-600">
          Invoice <strong>{order.invoiceNo}</strong> ({order.namaPelanggan}) • Total: <strong>{formatRupiah(order.totalTagihan)}</strong>
        </div>
        <div className="flex items-center gap-2">
          <button
            id="btn-download-pdf-bottom"
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-rose-700 hover:bg-rose-800 disabled:opacity-60 rounded transition shadow-xs"
          >
            {isGeneratingPdf ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            <span>Unduh PDF</span>
          </button>
          <button
            id="btn-print-invoice-bottom"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-stone-800 hover:bg-stone-900 rounded transition shadow-xs"
          >
            <Printer size={14} />
            <span>Cetak Invoice</span>
          </button>
        </div>
      </div>
    </div>
  );
};
