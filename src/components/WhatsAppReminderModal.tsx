import React, { useState } from 'react';
import { Order, ShopProfile } from '../types';
import {
  formatRupiah,
  formatTanggal,
  generateDueDateReminderMessage,
  createWhatsAppUrl,
} from '../lib/whatsapp';
import {
  X,
  MessageCircle,
  Clock,
  AlertTriangle,
  Calendar,
  Send,
  CheckCircle,
  Copy,
  ExternalLink,
} from 'lucide-react';

interface WhatsAppReminderModalProps {
  orders: Order[];
  shopProfile: ShopProfile;
  onUpdateReminderDate: (orderId: string) => void;
  onClose: () => void;
}

export const WhatsAppReminderModal: React.FC<WhatsAppReminderModalProps> = ({
  orders,
  shopProfile,
  onUpdateReminderDate,
  onClose,
}) => {
  // Filter only orders with remaining balance (kekurangan > 0)
  const unpaidOrders = orders.filter((o) => o.kekurangan > 0);

  const today = new Date().toISOString().split('T')[0];

  const [selectedOrderId, setSelectedOrderId] = useState<string>(
    unpaidOrders.length > 0 ? unpaidOrders[0].id : ''
  );
  const [filterType, setFilterType] = useState<'all' | 'overdue' | 'today' | 'upcoming'>('all');
  const [customMessage, setCustomMessage] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const getOrderStatusDueDate = (order: Order) => {
    if (!order.jatuhTempo) return 'normal';
    if (order.jatuhTempo < today) return 'overdue';
    if (order.jatuhTempo === today) return 'today';
    return 'upcoming';
  };

  const filteredOrders = unpaidOrders.filter((o) => {
    const status = getOrderStatusDueDate(o);
    if (filterType === 'overdue') return status === 'overdue';
    if (filterType === 'today') return status === 'today';
    if (filterType === 'upcoming') return status === 'upcoming';
    return true;
  });

  const activeOrder = unpaidOrders.find((o) => o.id === selectedOrderId) || unpaidOrders[0];

  // Update default custom message when active order changes
  React.useEffect(() => {
    if (activeOrder) {
      setCustomMessage(generateDueDateReminderMessage(activeOrder, shopProfile));
    }
  }, [activeOrder, shopProfile]);

  const handleSendWA = () => {
    if (!activeOrder) return;
    const url = createWhatsAppUrl(activeOrder.noWhatsApp, customMessage);
    window.open(url, '_blank');
    onUpdateReminderDate(activeOrder.id);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(customMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-xl shadow-xl border border-stone-200 overflow-hidden my-6">
        {/* Header */}
        <div className="bg-[#264936] text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle size={22} className="text-emerald-300" />
            <div>
              <h2 className="text-base font-bold">Pusat Notifikasi & Pengingat WhatsApp Jatuh Tempo</h2>
              <p className="text-xs text-emerald-100">
                Kirim pesan otomatis pengingat cicilan dan pelunasan busana ke nomor WhatsApp pelanggan
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

        {/* Filter Bar */}
        <div className="bg-stone-50 border-b border-stone-200 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-stone-600">
            <span>Filter Jatuh Tempo:</span>
            <button
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 rounded transition ${
                filterType === 'all' ? 'bg-[#264936] text-white' : 'bg-white border text-stone-700 hover:bg-stone-100'
              }`}
            >
              Semua Belum Lunas ({unpaidOrders.length})
            </button>
            <button
              onClick={() => setFilterType('overdue')}
              className={`px-2.5 py-1 rounded transition flex items-center gap-1 ${
                filterType === 'overdue' ? 'bg-rose-700 text-white' : 'bg-white border border-rose-200 text-rose-700 hover:bg-rose-50'
              }`}
            >
              <AlertTriangle size={12} />
              Lewat Tempo ({unpaidOrders.filter((o) => getOrderStatusDueDate(o) === 'overdue').length})
            </button>
            <button
              onClick={() => setFilterType('today')}
              className={`px-2.5 py-1 rounded transition flex items-center gap-1 ${
                filterType === 'today' ? 'bg-amber-600 text-white' : 'bg-white border border-amber-200 text-amber-700 hover:bg-amber-50'
              }`}
            >
              <Clock size={12} />
              Hari Ini ({unpaidOrders.filter((o) => getOrderStatusDueDate(o) === 'today').length})
            </button>
          </div>

          <div className="text-stone-500 text-[11px]">
            Toko: <strong>{shopProfile.namaToko}</strong> ({shopProfile.noHp})
          </div>
        </div>

        {/* Body 2 Columns */}
        {unpaidOrders.length === 0 ? (
          <div className="p-12 text-center text-stone-500">
            <CheckCircle size={40} className="text-emerald-500 mx-auto mb-2" />
            <h3 className="font-bold text-stone-800">Semua Tagihan Sudah Lunas!</h3>
            <p className="text-xs text-stone-500 mt-1">
              Tidak ada pesanan dengan sisa cicilan atau tagihan tertunggak saat ini.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-stone-200 max-h-[70vh] overflow-hidden">
            {/* Left Column: Order Selection List (2 cols) */}
            <div className="md:col-span-2 overflow-y-auto p-3 space-y-2 bg-stone-50/50">
              <div className="text-xs font-bold text-stone-600 uppercase tracking-wider px-1">
                Pilih Pelanggan ({filteredOrders.length})
              </div>

              {filteredOrders.length === 0 ? (
                <div className="p-4 text-center text-xs text-stone-400">
                  Tidak ada data untuk kategori ini.
                </div>
              ) : (
                filteredOrders.map((order) => {
                  const status = getOrderStatusDueDate(order);
                  const isSelected = order.id === activeOrder?.id;

                  return (
                    <div
                      key={order.id}
                      onClick={() => setSelectedOrderId(order.id)}
                      className={`p-3 rounded-lg border cursor-pointer transition text-xs ${
                        isSelected
                          ? 'bg-white border-[#264936] ring-1 ring-[#264936] shadow-xs'
                          : 'bg-white border-stone-200 hover:border-stone-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-stone-900">{order.namaPelanggan}</span>
                        {status === 'overdue' && (
                          <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-rose-100 text-rose-800 flex items-center gap-0.5">
                            <AlertTriangle size={10} /> Overdue
                          </span>
                        )}
                        {status === 'today' && (
                          <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-amber-100 text-amber-800 flex items-center gap-0.5">
                            <Clock size={10} /> Hari Ini
                          </span>
                        )}
                        {status === 'upcoming' && (
                          <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-stone-100 text-stone-700">
                            {formatTanggal(order.jatuhTempo || '')}
                          </span>
                        )}
                      </div>

                      <div className="text-stone-600 text-[11px] mb-1">
                        {order.brandSeries} • {order.invoiceNo}
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-stone-100">
                        <span className="text-stone-500 font-mono text-[11px]">{order.noWhatsApp}</span>
                        <span className="font-bold text-rose-700">
                          Sisa {formatRupiah(order.kekurangan)}
                        </span>
                      </div>

                      {order.terakhirIngatkanWA && (
                        <div className="mt-1 text-[10px] text-stone-400">
                          Terakhir diingatkan: {formatTanggal(order.terakhirIngatkanWA)}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Right Column: WhatsApp Message Preview & Send (3 cols) */}
            <div className="md:col-span-3 p-4 flex flex-col justify-between overflow-y-auto bg-white">
              {activeOrder ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-stone-200">
                    <div>
                      <div className="text-sm font-bold text-stone-900">
                        Pesan untuk: {activeOrder.namaPelanggan}
                      </div>
                      <div className="text-xs text-stone-500">
                        WA: <strong>{activeOrder.noWhatsApp}</strong> • Sisa Tagihan:{' '}
                        <strong className="text-rose-700">{formatRupiah(activeOrder.kekurangan)}</strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={handleCopy}
                        className="px-2.5 py-1 text-xs bg-stone-100 hover:bg-stone-200 rounded border border-stone-300 text-stone-700 flex items-center gap-1"
                        title="Salin Teks Pesan"
                      >
                        <Copy size={13} />
                        {copied ? 'Tersalin' : 'Salin'}
                      </button>
                    </div>
                  </div>

                  {/* Message Editor / Preview */}
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Isi Pesan WhatsApp Pengingat (Dapat Disunting):
                    </label>
                    <textarea
                      rows={12}
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      className="w-full text-xs font-mono p-3 bg-stone-50 border border-stone-300 rounded-lg focus:outline-hidden focus:border-[#264936] text-stone-800 leading-relaxed"
                    />
                  </div>

                  {/* Send Action */}
                  <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg flex items-center justify-between">
                    <div className="text-xs text-emerald-800">
                      <div>Klik tombol untuk langsung membuka WhatsApp pelanggan dengan pesan ini.</div>
                      <div className="text-[11px] text-emerald-600 mt-0.5">
                        Tujuan: +{activeOrder.noWhatsApp}
                      </div>
                    </div>

                    <button
                      id="btn-send-whatsapp-action"
                      onClick={handleSendWA}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm transition"
                    >
                      <Send size={15} />
                      Buka WhatsApp Sekarang
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 text-stone-400 text-xs">
                  Silakan pilih pelanggan di sebelah kiri
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="bg-stone-100 px-5 py-3 border-t border-stone-200 flex justify-end">
          <button
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
