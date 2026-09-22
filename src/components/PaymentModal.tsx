import React, { useState } from 'react';
import { Order, PaymentRecord, PaymentType, ShopProfile } from '../types';
import { formatRupiah, formatTanggal, generatePaymentReceivedMessage, createWhatsAppUrl } from '../lib/whatsapp';
import { X, Plus, Trash2, CheckCircle2, MessageCircle, AlertCircle } from 'lucide-react';

interface PaymentModalProps {
  order: Order;
  shopProfile: ShopProfile;
  onSavePayment: (orderId: string, payment: Omit<PaymentRecord, 'id' | 'orderId' | 'createdAt'>) => void;
  onDeletePayment: (orderId: string, paymentId: string) => void;
  onClose: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  order,
  shopProfile,
  onSavePayment,
  onDeletePayment,
  onClose,
}) => {
  const existingCicilanCount = order.pembayaran.filter((p) => p.jenis === 'Cicilan').length;
  const isDpAlreadyPaid = order.pembayaran.some((p) => p.jenis === 'DP');

  const defaultJenis: PaymentType = !isDpAlreadyPaid ? 'DP' : order.kekurangan <= 0 ? 'Pelunasan' : 'Cicilan';
  const defaultLabel = !isDpAlreadyPaid
    ? 'DP Awal'
    : `Cicilan ke-${existingCicilanCount + 1}`;

  const [jenis, setJenis] = useState<PaymentType>(defaultJenis);
  const [label, setLabel] = useState<string>(defaultLabel);
  const [jumlah, setJumlah] = useState<number>(order.kekurangan > 0 ? Math.min(order.kekurangan, 150000) : 0);
  const [tanggal, setTanggal] = useState<string>(new Date().toISOString().split('T')[0]);
  const [metode, setMetode] = useState<string>('Transfer BCA');
  const [catatan, setCatatan] = useState<string>('');
  const [sendWA, setSendWA] = useState<boolean>(true);

  const handleJenisChange = (newJenis: PaymentType) => {
    setJenis(newJenis);
    if (newJenis === 'DP') {
      setLabel('DP Awal');
    } else if (newJenis === 'Pelunasan') {
      setLabel('Pelunasan Sisa');
      setJumlah(order.kekurangan);
    } else {
      setLabel(`Cicilan ke-${existingCicilanCount + 1}`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (jumlah <= 0) {
      alert('Nominal pembayaran harus lebih besar dari Rp 0');
      return;
    }

    const newPaymentData = {
      tanggal,
      jenis,
      label,
      jumlah: Number(jumlah),
      metode,
      catatan,
    };

    onSavePayment(order.id, newPaymentData);

    if (sendWA && order.noWhatsApp) {
      // Simulate new updated state to create prompt WA message
      const updatedTotalTerbayar = order.totalTerbayar + Number(jumlah);
      const updatedKekurangan = Math.max(0, order.totalTagihan - updatedTotalTerbayar);
      const simulatedOrder: Order = {
        ...order,
        totalTerbayar: updatedTotalTerbayar,
        kekurangan: updatedKekurangan,
      };

      const simulatedPayment: PaymentRecord = {
        id: 'temp',
        orderId: order.id,
        createdAt: new Date().toISOString(),
        ...newPaymentData,
      };

      const waText = generatePaymentReceivedMessage(simulatedOrder, simulatedPayment, shopProfile);
      const url = createWhatsAppUrl(order.noWhatsApp, waText);
      window.open(url, '_blank');
    }

    onClose();
  };

  const isLunas = order.kekurangan <= 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-xl rounded-xl shadow-xl border border-stone-200 overflow-hidden my-6">
        {/* Header */}
        <div className="bg-stone-900 text-white p-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold">Catat Riwayat Pembayaran (DP & Cicilan)</h2>
            <p className="text-xs text-stone-300">
              {order.invoiceNo} • {order.namaPelanggan} ({order.brandSeries})
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white p-1 rounded hover:bg-stone-800 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Financial Status Banner */}
        <div className="bg-stone-50 border-b border-stone-200 p-4 grid grid-cols-3 gap-2 text-center text-xs">
          <div className="bg-white p-2.5 rounded border border-stone-200">
            <div className="text-stone-500 font-medium">Total Tagihan</div>
            <div className="text-sm font-bold text-stone-800 mt-0.5">{formatRupiah(order.totalTagihan)}</div>
          </div>
          <div className="bg-white p-2.5 rounded border border-stone-200">
            <div className="text-stone-500 font-medium">Sudah Dibayar</div>
            <div className="text-sm font-bold text-emerald-700 mt-0.5">{formatRupiah(order.totalTerbayar)}</div>
          </div>
          <div className={`p-2.5 rounded border ${isLunas ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
            <div className={`font-medium ${isLunas ? 'text-emerald-700' : 'text-amber-800'}`}>Sisa Belum Bayar</div>
            <div className={`text-sm font-extrabold mt-0.5 ${isLunas ? 'text-emerald-700' : 'text-amber-900'}`}>
              {formatRupiah(order.kekurangan)}
            </div>
          </div>
        </div>

        <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Payment Form */}
          <form onSubmit={handleSubmit} className="space-y-4 bg-stone-50 p-4 rounded-lg border border-stone-200">
            <div className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
              <Plus size={14} className="text-[#264936]" /> Tambah Pembayaran Baru
            </div>

            {/* Jenis & Label */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Jenis Pembayaran</label>
                <div className="grid grid-cols-3 gap-1 bg-stone-200 p-1 rounded">
                  {(['DP', 'Cicilan', 'Pelunasan'] as PaymentType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => handleJenisChange(t)}
                      className={`text-xs font-semibold py-1 rounded transition ${
                        jenis === t ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Keterangan / Tahap</label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className="w-full text-xs px-3 py-1.5 bg-white border border-stone-300 rounded focus:outline-hidden focus:border-[#264936]"
                  placeholder="Contoh: DP Awal, Cicilan 1"
                  required
                />
              </div>
            </div>

            {/* Nominal & Quick Amount Buttons */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-stone-700">Nominal Pembayaran (Rp)</label>
                {order.kekurangan > 0 && (
                  <button
                    type="button"
                    onClick={() => setJumlah(order.kekurangan)}
                    className="text-[11px] text-emerald-700 font-semibold hover:underline"
                  >
                    Lunaskan Sisa ({formatRupiah(order.kekurangan)})
                  </button>
                )}
              </div>
              <input
                type="number"
                min="1000"
                step="1000"
                value={jumlah || ''}
                onChange={(e) => setJumlah(Number(e.target.value))}
                className="w-full text-sm font-bold px-3 py-2 bg-white border border-stone-300 rounded focus:outline-hidden focus:border-[#264936]"
                placeholder="0"
                required
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {[50000, 100000, 150000, 200000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setJumlah(amt)}
                    className="text-[11px] px-2 py-0.5 bg-white border border-stone-300 rounded hover:bg-stone-100 text-stone-700 font-medium"
                  >
                    +{formatRupiah(amt)}
                  </button>
                ))}
              </div>
            </div>

            {/* Tanggal & Metode */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Tanggal Bayar</label>
                <input
                  type="date"
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  className="w-full text-xs px-3 py-1.5 bg-white border border-stone-300 rounded focus:outline-hidden focus:border-[#264936]"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Metode Pembayaran</label>
                <select
                  value={metode}
                  onChange={(e) => setMetode(e.target.value)}
                  className="w-full text-xs px-3 py-1.5 bg-white border border-stone-300 rounded focus:outline-hidden focus:border-[#264936]"
                >
                  <option value="Transfer BCA">Transfer BCA</option>
                  <option value="Transfer Mandiri">Transfer Mandiri</option>
                  <option value="Transfer BRI">Transfer BRI</option>
                  <option value="Transfer BSI">Transfer BSI</option>
                  <option value="QRIS">QRIS</option>
                  <option value="Tunai / Cash">Tunai / Cash</option>
                </select>
              </div>
            </div>

            {/* Catatan */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Catatan (Opsional)</label>
              <input
                type="text"
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                className="w-full text-xs px-3 py-1.5 bg-white border border-stone-300 rounded focus:outline-hidden focus:border-[#264936]"
                placeholder="Contoh: Transfer via rekening a.n Herlin"
              />
            </div>

            {/* Checkbox WA */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="sendWAConfirmation"
                checked={sendWA}
                onChange={(e) => setSendWA(e.target.checked)}
                className="rounded border-stone-300 text-[#264936] focus:ring-[#264936]"
              />
              <label htmlFor="sendWAConfirmation" className="text-xs text-stone-700 font-medium flex items-center gap-1.5">
                <MessageCircle size={14} className="text-emerald-600" />
                Langsung kirim notifikasi konfirmasi ke WhatsApp ({order.noWhatsApp || 'No belum diset'})
              </label>
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-[#264936] text-white text-xs font-bold rounded hover:bg-[#1f3b2c] transition flex items-center justify-center gap-1.5 shadow-xs"
            >
              <CheckCircle2 size={16} /> Simpan Pembayaran
            </button>
          </form>

          {/* Existing History Table */}
          <div>
            <div className="text-xs font-bold text-stone-700 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Riwayat Transaksi Masuk ({order.pembayaran.length})</span>
              <span className="text-stone-500 font-normal">Sisa: {formatRupiah(order.kekurangan)}</span>
            </div>

            {order.pembayaran.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-stone-300 rounded-lg text-xs text-stone-500">
                Belum ada data pembayaran untuk pesanan ini.
              </div>
            ) : (
              <div className="border border-stone-200 rounded-lg overflow-hidden divide-y divide-stone-200">
                {order.pembayaran.map((p, index) => (
                  <div key={p.id || index} className="p-3 bg-white flex items-center justify-between hover:bg-stone-50 transition">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                          p.jenis === 'DP' ? 'bg-blue-100 text-blue-800' : p.jenis === 'Pelunasan' ? 'bg-emerald-100 text-emerald-800' : 'bg-purple-100 text-purple-800'
                        }`}>
                          {p.jenis}
                        </span>
                        <span className="text-xs font-bold text-stone-900">{p.label}</span>
                        <span className="text-xs text-stone-500">• {formatTanggal(p.tanggal)}</span>
                      </div>
                      <div className="text-[11px] text-stone-500 mt-1">
                        Metode: <span className="font-medium text-stone-700">{p.metode}</span>
                        {p.catatan && <span> • Catatan: "{p.catatan}"</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-xs font-bold text-emerald-800">{formatRupiah(p.jumlah)}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Hapus catatan pembayaran ${p.label} (${formatRupiah(p.jumlah)})?`)) {
                            onDeletePayment(order.id, p.id);
                          }
                        }}
                        className="text-stone-400 hover:text-rose-600 p-1 rounded hover:bg-stone-100"
                        title="Hapus Pembayaran"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-stone-100 px-5 py-3 border-t border-stone-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-stone-300 text-stone-700 text-xs font-semibold rounded hover:bg-stone-50"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
