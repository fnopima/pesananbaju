import React, { useState } from 'react';
import { Order, OrderItem } from '../types';
import { formatRupiah } from '../lib/whatsapp';
import { X, Plus, Trash2, CheckCircle2, ShoppingBag } from 'lucide-react';

interface OrderFormModalProps {
  orderToEdit?: Order | null;
  onSave: (order: Order) => void;
  onClose: () => void;
}

export const OrderFormModal: React.FC<OrderFormModalProps> = ({
  orderToEdit,
  onSave,
  onClose,
}) => {
  const isEditing = !!orderToEdit;

  const [invoiceNo, setInvoiceNo] = useState<string>(
    orderToEdit?.invoiceNo || `INV/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${String(Math.floor(100 + Math.random() * 900))}`
  );
  const [tanggal, setTanggal] = useState<string>(
    orderToEdit?.tanggal || new Date().toISOString().split('T')[0]
  );
  const [jatuhTempo, setJatuhTempo] = useState<string>(() => {
    if (orderToEdit?.jatuhTempo) return orderToEdit.jatuhTempo;
    const d = new Date();
    d.setDate(d.getDate() + 10);
    return d.toISOString().split('T')[0];
  });
  const [namaPelanggan, setNamaPelanggan] = useState<string>(orderToEdit?.namaPelanggan || '');
  const [noWhatsApp, setNoWhatsApp] = useState<string>(orderToEdit?.noWhatsApp || '');
  const [brandSeries, setBrandSeries] = useState<string>(orderToEdit?.brandSeries || 'Juju / Farasyah');
  const [ekspedisi, setEkspedisi] = useState<string>(orderToEdit?.ekspedisi || 'JNE REG');
  const [alamat, setAlamat] = useState<string>(orderToEdit?.alamat || '');
  const [biayaRequest, setBiayaRequest] = useState<number>(orderToEdit?.biayaRequest || 0);
  const [ongkirPacking, setOngkirPacking] = useState<number>(orderToEdit?.ongkirPacking || 0);
  const [dpAwal, setDpAwal] = useState<number>(orderToEdit ? orderToEdit.totalDp : 0);
  const [catatanKhusus, setCatatanKhusus] = useState<string>(orderToEdit?.catatanKhusus || '');

  // Dynamic Item List
  const [items, setItems] = useState<OrderItem[]>(() => {
    if (orderToEdit && orderToEdit.items.length > 0) {
      return orderToEdit.items;
    }
    return [
      {
        id: 'item-1',
        namaBarang: '',
        harga: 0,
        qty: 1,
        diskonPersen: 0,
        jumlah: 0,
      },
    ];
  });

  const handleItemChange = (index: number, field: keyof OrderItem, val: string | number) => {
    setItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index], [field]: val };

      // Kalkulasi otomatis subtotal per baris barang: (harga * qty) * (1 - disc/100)
      const harga = field === 'harga' ? Number(val) : item.harga;
      const qty = field === 'qty' ? Number(val) : item.qty;
      const disc = field === 'diskonPersen' ? Number(val) : item.diskonPersen;

      const subtotalItem = Math.round(harga * qty * (1 - (disc || 0) / 100));
      item.jumlah = subtotalItem;

      updated[index] = item;
      return updated;
    });
  };

  const addItemRow = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}`,
        namaBarang: '',
        harga: 0,
        qty: 1,
        diskonPersen: 0,
        jumlah: 0,
      },
    ]);
  };

  const removeItemRow = (index: number) => {
    if (items.length <= 1) {
      alert('Pesanan harus memiliki minimal 1 item pakaian');
      return;
    }
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Calculations
  const totalItemCount = items.reduce((sum, it) => sum + (Number(it.qty) || 0), 0);
  const subtotalBarang = items.reduce((sum, it) => sum + (Number(it.jumlah) || 0), 0);
  const totalTagihan = subtotalBarang + Number(biayaRequest || 0) + Number(ongkirPacking || 0);

  const existingPembayaran = orderToEdit ? orderToEdit.pembayaran : [];
  let finalPembayaran = [...existingPembayaran];

  // If new order and DP was entered
  if (!isEditing && dpAwal > 0) {
    finalPembayaran = [
      {
        id: `pay-${Date.now()}`,
        orderId: '',
        tanggal: tanggal,
        jenis: 'DP',
        label: 'DP Awal Pesanan',
        jumlah: Number(dpAwal),
        metode: 'Transfer BCA',
        catatan: 'DP saat pendaftaran pesanan',
        createdAt: new Date().toISOString(),
      },
    ];
  }

  const totalDp = finalPembayaran
    .filter((p) => p.jenis === 'DP')
    .reduce((sum, p) => sum + p.jumlah, 0);

  const totalCicilan = finalPembayaran
    .filter((p) => p.jenis === 'Cicilan' || p.jenis === 'Pelunasan')
    .reduce((sum, p) => sum + p.jumlah, 0);

  const totalTerbayar = totalDp + totalCicilan;
  const kekurangan = Math.max(0, totalTagihan - totalTerbayar);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaPelanggan.trim()) {
      alert('Nama pelanggan wajib diisi');
      return;
    }

    if (items.some((it) => !it.namaBarang.trim() || it.harga <= 0)) {
      alert('Lengkapi nama barang dan harga untuk setiap item pakaian');
      return;
    }

    const orderId = orderToEdit?.id || `ord-${Date.now()}`;

    // Update orderId on payment items if new
    const finalizedPayments = finalPembayaran.map((p) => ({
      ...p,
      orderId,
    }));

    let statusPembayaran: Order['statusPembayaran'] = 'Belum Bayar';
    if (kekurangan <= 0 && totalTerbayar > 0) {
      statusPembayaran = 'Lunas';
    } else if (totalCicilan > 0) {
      statusPembayaran = 'Cicilan Sebagian';
    } else if (totalDp > 0) {
      statusPembayaran = 'DP Saja';
    }

    const newOrder: Order = {
      id: orderId,
      invoiceNo,
      tanggal,
      jatuhTempo,
      namaPelanggan,
      noWhatsApp,
      alamat,
      ekspedisi,
      brandSeries,
      items,
      totalItem: totalItemCount,
      subtotal: subtotalBarang,
      biayaRequest: Number(biayaRequest || 0),
      ongkirPacking: Number(ongkirPacking || 0),
      totalTagihan,
      pembayaran: finalizedPayments,
      totalDp,
      totalCicilan,
      totalTerbayar,
      kekurangan,
      statusPembayaran,
      statusPesanan: orderToEdit?.statusPesanan || 'Diproses',
      catatanKhusus,
      createdAt: orderToEdit?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(newOrder);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-3xl rounded-xl shadow-xl border border-stone-200 overflow-hidden my-6">
        {/* Header */}
        <div className="bg-[#264936] text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag size={20} className="text-emerald-200" />
            <div>
              <h2 className="text-base font-bold">
                {isEditing ? `Edit Pesanan: ${orderToEdit.invoiceNo}` : 'Catat Pesanan Pembelian Pakaian Baru'}
              </h2>
              <p className="text-xs text-emerald-100">
                Lengkapi rincian pesanan, busana, harga diskon, DP dan jadwal jatuh tempo cicilan
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-emerald-200 hover:text-white p-1 rounded hover:bg-[#1f3a2c] transition"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Section 1: Data Pelanggan & No Invoice */}
          <div className="bg-stone-50 p-4 rounded-lg border border-stone-200 space-y-3">
            <div className="text-xs font-bold text-stone-700 uppercase tracking-wider">
              1. Identitas Pelanggan & Invoice
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">No Invoice</label>
                <input
                  type="text"
                  value={invoiceNo}
                  onChange={(e) => setInvoiceNo(e.target.value)}
                  className="w-full text-xs px-3 py-1.5 bg-white border border-stone-300 rounded focus:border-[#264936] focus:outline-hidden font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Tanggal Pesanan</label>
                <input
                  type="date"
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  className="w-full text-xs px-3 py-1.5 bg-white border border-stone-300 rounded focus:border-[#264936] focus:outline-hidden"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Jatuh Tempo Cicilan</label>
                <input
                  type="date"
                  value={jatuhTempo}
                  onChange={(e) => setJatuhTempo(e.target.value)}
                  className="w-full text-xs px-3 py-1.5 bg-white border border-amber-300 rounded focus:border-[#264936] focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Kepada / Nama Pelanggan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={namaPelanggan}
                  onChange={(e) => setNamaPelanggan(e.target.value)}
                  placeholder="Contoh: Herlin"
                  className="w-full text-xs px-3 py-1.5 bg-white border border-stone-300 rounded focus:border-[#264936] focus:outline-hidden"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  No WhatsApp (Pengingat) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={noWhatsApp}
                  onChange={(e) => setNoWhatsApp(e.target.value)}
                  placeholder="Contoh: 083812876096"
                  className="w-full text-xs px-3 py-1.5 bg-white border border-stone-300 rounded focus:border-[#264936] focus:outline-hidden font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Brand / Series Busana</label>
                <input
                  type="text"
                  value={brandSeries}
                  onChange={(e) => setBrandSeries(e.target.value)}
                  placeholder="Contoh: Juju / Farasyah"
                  className="w-full text-xs px-3 py-1.5 bg-white border border-stone-300 rounded focus:border-[#264936] focus:outline-hidden"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Ekspedisi (Eksp)</label>
                <input
                  type="text"
                  value={ekspedisi}
                  onChange={(e) => setEkspedisi(e.target.value)}
                  placeholder="JNE REG / J&T / SiCepat"
                  className="w-full text-xs px-3 py-1.5 bg-white border border-stone-300 rounded focus:border-[#264936] focus:outline-hidden"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-stone-700 mb-1">Alamat Pengiriman</label>
                <input
                  type="text"
                  value={alamat}
                  onChange={(e) => setAlamat(e.target.value)}
                  placeholder="Alamat lengkap penerima busana"
                  className="w-full text-xs px-3 py-1.5 bg-white border border-stone-300 rounded focus:border-[#264936] focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Rincian Pakaian & Barang */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                2. Rincian Pakaian yang Dipesan
              </div>
              <button
                type="button"
                onClick={addItemRow}
                className="text-xs text-[#264936] font-semibold hover:underline flex items-center gap-1"
              >
                <Plus size={14} /> Tambah Baris Barang
              </button>
            </div>

            <div className="border border-stone-300 rounded-lg overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-[#1f3e2e] text-white">
                    <th className="py-2 px-2 w-10 text-center">No</th>
                    <th className="py-2 px-3 text-left">Nama Barang & Spesifikasi</th>
                    <th className="py-2 px-2 w-28 text-center">Harga (Rp)</th>
                    <th className="py-2 px-2 w-16 text-center">Qty</th>
                    <th className="py-2 px-2 w-16 text-center">Disc (%)</th>
                    <th className="py-2 px-3 w-28 text-right">Jumlah</th>
                    <th className="py-2 px-2 w-10 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {items.map((item, index) => (
                    <tr key={item.id || index} className="bg-white">
                      <td className="py-2 px-2 text-center font-semibold text-stone-600">
                        {index + 1}
                      </td>
                      <td className="py-1.5 px-2">
                        <input
                          type="text"
                          value={item.namaBarang}
                          onChange={(e) => handleItemChange(index, 'namaBarang', e.target.value)}
                          placeholder="Misal: Set ped antem dark violet XXL req pb 130"
                          className="w-full text-xs px-2 py-1 bg-stone-50 border border-stone-300 rounded focus:border-[#264936] focus:outline-hidden"
                          required
                        />
                      </td>
                      <td className="py-1.5 px-2">
                        <input
                          type="number"
                          min="0"
                          step="1000"
                          value={item.harga || ''}
                          onChange={(e) => handleItemChange(index, 'harga', Number(e.target.value))}
                          placeholder="345000"
                          className="w-full text-xs px-2 py-1 text-right bg-stone-50 border border-stone-300 rounded focus:border-[#264936] focus:outline-hidden"
                          required
                        />
                      </td>
                      <td className="py-1.5 px-2">
                        <input
                          type="number"
                          min="1"
                          value={item.qty}
                          onChange={(e) => handleItemChange(index, 'qty', Number(e.target.value))}
                          className="w-full text-xs px-2 py-1 text-center bg-stone-50 border border-stone-300 rounded focus:border-[#264936] focus:outline-hidden font-bold"
                          required
                        />
                      </td>
                      <td className="py-1.5 px-2">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={item.diskonPersen || ''}
                          onChange={(e) => handleItemChange(index, 'diskonPersen', Number(e.target.value))}
                          placeholder="10"
                          className="w-full text-xs px-2 py-1 text-center bg-stone-50 border border-stone-300 rounded focus:border-[#264936] focus:outline-hidden"
                        />
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-stone-800 whitespace-nowrap">
                        {formatRupiah(item.jumlah)}
                      </td>
                      <td className="py-2 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeItemRow(index)}
                          className="text-stone-400 hover:text-rose-600 p-1"
                          title="Hapus Baris"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: Biaya Tambahan & Perhitungan Cicilan */}
          <div className="bg-stone-50 p-4 rounded-lg border border-stone-200">
            <div className="text-xs font-bold text-stone-700 uppercase tracking-wider mb-3">
              3. Biaya Tambahan, DP, & Sisa Cicilan
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Biaya Request (Custom / Potong Panjang Badan dll)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={biayaRequest || ''}
                    onChange={(e) => setBiayaRequest(Number(e.target.value))}
                    placeholder="Contoh: 15000"
                    className="w-full text-xs px-3 py-1.5 bg-white border border-stone-300 rounded focus:border-[#264936] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Ongkir + Packing
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={ongkirPacking || ''}
                    onChange={(e) => setOngkirPacking(Number(e.target.value))}
                    placeholder="Contoh: 0 jika COD / belum tahu"
                    className="w-full text-xs px-3 py-1.5 bg-white border border-stone-300 rounded focus:border-[#264936] focus:outline-hidden"
                  />
                </div>

                {!isEditing && (
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Uang Muka / DP Langsung Dibayar (Rp)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={dpAwal || ''}
                      onChange={(e) => setDpAwal(Number(e.target.value))}
                      placeholder="Contoh: 150000"
                      className="w-full text-xs px-3 py-1.5 bg-white border border-emerald-300 rounded focus:border-[#264936] focus:outline-hidden font-bold"
                    />
                    <p className="text-[11px] text-stone-500 mt-1">
                      DP akan otomatis dicatat sebagai pembayaran pertama.
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Catatan Khusus Pesanan
                  </label>
                  <textarea
                    rows={2}
                    value={catatanKhusus}
                    onChange={(e) => setCatatanKhusus(e.target.value)}
                    placeholder="Contoh: Request pb 130 cm, bahan adem, warna dark violet"
                    className="w-full text-xs px-3 py-1.5 bg-white border border-stone-300 rounded focus:border-[#264936] focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Live Calculation Preview */}
              <div className="bg-white p-4 rounded-lg border border-stone-200 flex flex-col justify-between space-y-2 text-xs">
                <div className="font-bold text-stone-800 border-b pb-2">
                  Ringkasan Kalkulasi Otomatis
                </div>
                <div className="space-y-1.5 text-stone-700">
                  <div className="flex justify-between">
                    <span>Total Item:</span>
                    <span className="font-semibold">{totalItemCount} pcs</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Subtotal Barang:</span>
                    <span>{formatRupiah(subtotalBarang)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Biaya Request:</span>
                    <span>{formatRupiah(biayaRequest || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Ongkir + packing:</span>
                    <span>{formatRupiah(ongkirPacking || 0)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-stone-900 border-t pt-1.5 text-sm">
                    <span>Total Tagihan:</span>
                    <span>{formatRupiah(totalTagihan)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span>Total DP / Cicilan Masuk:</span>
                    <span>{formatRupiah(isEditing ? totalTerbayar : Number(dpAwal || 0))}</span>
                  </div>
                  <div className="flex justify-between font-extrabold text-[#264936] text-base border-t-2 border-[#264936] pt-2">
                    <span>Kekurangan / Sisa:</span>
                    <span>{formatRupiah(isEditing ? kekurangan : Math.max(0, totalTagihan - Number(dpAwal || 0)))}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#264936] hover:bg-[#1d392b] text-white text-xs font-bold rounded flex items-center gap-1.5 shadow-xs"
            >
              <CheckCircle2 size={16} /> {isEditing ? 'Simpan Perubahan' : 'Buat Pesanan & Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
