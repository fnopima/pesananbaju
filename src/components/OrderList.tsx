import React, { useState } from 'react';
import { Order, PaymentStatus } from '../types';
import { formatRupiah, formatTanggal, createWhatsAppUrl, generateDueDateReminderMessage } from '../lib/whatsapp';
import {
  Search,
  FileText,
  CreditCard,
  MessageCircle,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Edit,
  Eye,
  Filter,
  Plus,
} from 'lucide-react';
import { ShopProfile } from '../types';

interface OrderListProps {
  orders: Order[];
  shopProfile: ShopProfile;
  onViewInvoice: (order: Order) => void;
  onRecordPayment: (order: Order) => void;
  onEditOrder: (order: Order) => void;
  onDeleteOrder: (orderId: string) => void;
  onSendQuickReminder: (order: Order) => void;
  onOpenNewOrder?: () => void;
}

export const OrderList: React.FC<OrderListProps> = ({
  orders,
  shopProfile,
  onViewInvoice,
  onRecordPayment,
  onEditOrder,
  onDeleteOrder,
  onSendQuickReminder,
  onOpenNewOrder,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | PaymentStatus | 'OVERDUE'>('ALL');

  const today = new Date().toISOString().split('T')[0];

  // Filtering
  const filteredOrders = orders.filter((order) => {
    const isOverdue = order.kekurangan > 0 && order.jatuhTempo && order.jatuhTempo < today;

    if (statusFilter === 'OVERDUE' && !isOverdue) return false;
    if (statusFilter !== 'ALL' && statusFilter !== 'OVERDUE' && order.statusPembayaran !== statusFilter) {
      return false;
    }

    if (!searchTerm.trim()) return true;

    const term = searchTerm.toLowerCase();
    return (
      order.namaPelanggan.toLowerCase().includes(term) ||
      order.invoiceNo.toLowerCase().includes(term) ||
      order.brandSeries.toLowerCase().includes(term) ||
      order.noWhatsApp.includes(term) ||
      order.items.some((it) => it.namaBarang.toLowerCase().includes(term))
    );
  });

  // Aggregate Stats
  const totalOrders = orders.length;
  const lunasOrders = orders.filter((o) => o.kekurangan <= 0);
  const unpaidOrders = orders.filter((o) => o.kekurangan > 0);
  const overdueOrders = unpaidOrders.filter((o) => o.jatuhTempo && o.jatuhTempo < today);
  const totalKekurangan = unpaidOrders.reduce((sum, o) => sum + o.kekurangan, 0);
  const totalOmzet = orders.reduce((sum, o) => sum + o.totalTagihan, 0);

  return (
    <div className="space-y-5">
      {/* Stats Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total Semua Pesanan
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-[#0B192C]">{totalOrders}</span>
            <span className="text-xs text-slate-500">Omzet: {formatRupiah(totalOmzet)}</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-300 bg-amber-50/50 shadow-2xs">
          <div className="text-xs font-semibold text-amber-900 uppercase tracking-wider flex items-center justify-between">
            <span>Sisa Cicilan / Piutang</span>
            <span className="text-[10px] bg-amber-200 text-amber-950 px-1.5 py-0.5 rounded font-bold">
              {unpaidOrders.length} order
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-900 mt-1">
            {formatRupiah(totalKekurangan)}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-teal-300 bg-teal-50/50 shadow-2xs">
          <div className="text-xs font-semibold text-teal-900 uppercase tracking-wider flex items-center justify-between">
            <span>Sudah Lunas</span>
            <CheckCircle2 size={16} className="text-teal-600" />
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-teal-950">{lunasOrders.length}</span>
            <span className="text-xs text-teal-700 font-medium">
              {totalOrders > 0 ? `${Math.round((lunasOrders.length / totalOrders) * 100)}% Lunas` : '0%'}
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-rose-200 bg-rose-50/40 shadow-2xs">
          <div className="text-xs font-semibold text-rose-800 uppercase tracking-wider flex items-center justify-between">
            <span>Lewat Jatuh Tempo</span>
            <AlertTriangle size={16} className="text-rose-600" />
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-rose-900">{overdueOrders.length}</span>
            <span className="text-xs text-rose-700 font-medium">Perlu diingatkan</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari pelanggan, invoice, seri, no WA..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 text-xs">
          <span className="text-slate-500 font-semibold flex items-center gap-1 pl-1">
            <Filter size={13} /> Filter:
          </span>
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
              statusFilter === 'ALL' ? 'bg-[#0B192C] text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Semua ({orders.length})
          </button>
          <button
            onClick={() => setStatusFilter('OVERDUE')}
            className={`px-2.5 py-1 rounded-md font-medium transition flex items-center gap-1 cursor-pointer ${
              statusFilter === 'OVERDUE'
                ? 'bg-rose-700 text-white'
                : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
            }`}
          >
            <AlertTriangle size={12} /> Overdue ({overdueOrders.length})
          </button>
          <button
            onClick={() => setStatusFilter('Cicilan Sebagian')}
            className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
              statusFilter === 'Cicilan Sebagian'
                ? 'bg-amber-600 text-white font-bold'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Cicilan
          </button>
          <button
            onClick={() => setStatusFilter('DP Saja')}
            className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
              statusFilter === 'DP Saja'
                ? 'bg-teal-800 text-white font-bold'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            DP Saja
          </button>
          <button
            onClick={() => setStatusFilter('Lunas')}
            className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
              statusFilter === 'Lunas'
                ? 'bg-teal-600 text-white font-bold'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Lunas ({lunasOrders.length})
          </button>
        </div>
      </div>

      {/* Orders List Table / Cards */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-xl border border-dashed border-slate-300 text-slate-500">
          <FileText size={36} className="mx-auto text-slate-400 mb-2" />
          <h4 className="font-bold text-slate-700 text-sm">Tidak Ada Data Pesanan</h4>
          <p className="text-xs text-slate-400 mt-1">
            {searchTerm
              ? 'Tidak ada pesanan yang sesuai dengan kata kunci pencarian.'
              : 'Belum ada pesanan terdaftar. Klik "+ Pesanan Baru" di atas untuk mencatat pesanan.'}
          </p>
          {!searchTerm && onOpenNewOrder && (
            <button
              onClick={onOpenNewOrder}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-teal-700 text-white text-xs font-bold rounded-lg hover:bg-teal-800 transition shadow-xs cursor-pointer active:scale-95"
            >
              <Plus size={15} className="shrink-0" />
              <span>+ Pesanan Baru</span>
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                  <th className="py-3 px-4">Invoice & Tanggal</th>
                  <th className="py-3 px-4">Pelanggan & Seri Busana</th>
                  <th className="py-3 px-4">Rincian Barang</th>
                  <th className="py-3 px-4 text-right">Total Tagihan</th>
                  <th className="py-3 px-4 text-right">Sudah Dibayar (DP/Cicilan)</th>
                  <th className="py-3 px-4 text-right">Kekurangan (Sisa)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredOrders.map((order) => {
                  const isLunas = order.kekurangan <= 0;
                  const isOverdue = !isLunas && order.jatuhTempo && order.jatuhTempo < today;

                  return (
                    <tr
                      key={order.id}
                      className={`hover:bg-slate-50/80 transition ${
                        isOverdue ? 'bg-rose-50/20' : ''
                      }`}
                    >
                      {/* Invoice & Date */}
                      <td className="py-3 px-4 align-top">
                        <div className="font-bold text-slate-900 font-mono">{order.invoiceNo}</div>
                        <div className="text-slate-500 text-[11px] mt-0.5">
                          {formatTanggal(order.tanggal)}
                        </div>
                        {order.jatuhTempo && !isLunas && (
                          <div
                            className={`inline-flex items-center gap-1 text-[10px] font-semibold mt-1 px-1.5 py-0.5 rounded ${
                              isOverdue
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-900 border border-amber-200'
                            }`}
                          >
                            <Clock size={10} />
                            Tempo: {formatTanggal(order.jatuhTempo)}
                          </div>
                        )}
                      </td>

                      {/* Customer & Brand/Series */}
                      <td className="py-3 px-4 align-top">
                        <div className="font-bold text-slate-900 text-sm">
                          {order.namaPelanggan}
                        </div>
                        <div className="text-slate-600 font-medium text-[11px] mt-0.5">
                          Seri: <span className="text-teal-700 font-semibold">{order.brandSeries}</span>
                        </div>
                        <div className="text-slate-400 font-mono text-[11px] mt-0.5">
                          {order.noWhatsApp}
                        </div>
                        {order.ekspedisi && (
                          <div className="text-slate-500 text-[10px]">
                            Eksp: {order.ekspedisi}
                          </div>
                        )}
                      </td>

                      {/* Items */}
                      <td className="py-3 px-4 align-top max-w-xs">
                        <div className="font-semibold text-slate-800">
                          {order.totalItem} item busana
                        </div>
                        <ul className="text-slate-600 text-[11px] mt-0.5 space-y-0.5">
                          {order.items.map((it, idx) => (
                            <li key={it.id || idx} className="truncate">
                              • {it.namaBarang} ({it.qty}x)
                            </li>
                          ))}
                        </ul>
                      </td>

                      {/* Total Tagihan */}
                      <td className="py-3 px-4 align-top text-right whitespace-nowrap">
                        <div className="font-bold text-slate-900">
                          {formatRupiah(order.totalTagihan)}
                        </div>
                        <div className="text-slate-400 text-[10px] mt-0.5">
                          Subtotal: {formatRupiah(order.subtotal)}
                        </div>
                        {order.biayaRequest > 0 && (
                          <div className="text-slate-500 text-[10px]">
                            Req: +{formatRupiah(order.biayaRequest)}
                          </div>
                        )}
                      </td>

                      {/* Total Terbayar */}
                      <td className="py-3 px-4 align-top text-right whitespace-nowrap">
                        <div className="font-bold text-teal-800">
                          {formatRupiah(order.totalTerbayar)}
                        </div>
                        <div className="text-slate-500 text-[10px] mt-0.5">
                          DP: {formatRupiah(order.totalDp)}
                          {order.totalCicilan > 0 ? ` • Cicilan: ${formatRupiah(order.totalCicilan)}` : ''}
                        </div>
                        <div className="text-slate-400 text-[10px]">
                          ({order.pembayaran.length} kali bayar)
                        </div>
                      </td>

                      {/* Kekurangan / Sisa Belum Bayar */}
                      <td className="py-3 px-4 align-top text-right whitespace-nowrap">
                        <div
                          className={`font-black text-sm ${
                            isLunas ? 'text-teal-700' : 'text-amber-800'
                          }`}
                        >
                          {formatRupiah(order.kekurangan)}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {isLunas ? 'Lunas 100%' : 'Sisa belum bayar'}
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3 px-4 align-top text-center whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-0.5 text-[10px] font-bold rounded-full ${
                            isLunas
                              ? 'bg-teal-100 text-teal-800 border border-teal-300'
                              : isOverdue
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : 'bg-amber-100 text-amber-900 border border-amber-300'
                          }`}
                        >
                          {isLunas ? 'Lunas' : isOverdue ? 'Jatuh Tempo!' : order.statusPembayaran}
                        </span>
                      </td>

                      {/* Action buttons */}
                      <td className="py-3 px-4 align-top text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* View Invoice button */}
                          <button
                            id={`btn-view-invoice-${order.id}`}
                            onClick={() => onViewInvoice(order)}
                            className="p-1.5 text-slate-700 hover:text-white hover:bg-[#0B192C] rounded border border-slate-200 transition"
                            title="Buka Invoice"
                          >
                            <Eye size={14} />
                          </button>

                          {/* Record payment button */}
                          {!isLunas && (
                            <button
                              id={`btn-record-payment-${order.id}`}
                              onClick={() => onRecordPayment(order)}
                              className="p-1.5 text-teal-800 bg-teal-50 hover:bg-teal-100 rounded border border-teal-200 transition"
                              title="Catat Pembayaran DP / Cicilan"
                            >
                              <CreditCard size={14} />
                            </button>
                          )}

                          {/* WhatsApp Reminder Button */}
                          {!isLunas && (
                            <button
                              id={`btn-wa-reminder-${order.id}`}
                              onClick={() => onSendQuickReminder(order)}
                              className="p-1.5 text-teal-700 hover:text-white hover:bg-teal-600 rounded border border-teal-200 transition"
                              title="Kirim Pengingat WhatsApp"
                            >
                              <MessageCircle size={14} />
                            </button>
                          )}

                          {/* Edit order */}
                          <button
                            onClick={() => onEditOrder(order)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 rounded hover:bg-slate-100"
                            title="Edit Pesanan"
                          >
                            <Edit size={13} />
                          </button>

                          {/* Delete order */}
                          <button
                            onClick={() => {
                              if (confirm(`Hapus pesanan ${order.invoiceNo} (${order.namaPelanggan})?`)) {
                                onDeleteOrder(order.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-100"
                            title="Hapus Pesanan"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
