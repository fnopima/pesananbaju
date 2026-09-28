import React from 'react';
import { GoogleSyncState, Order, ShopProfile } from '../types';
import { formatRupiah } from '../lib/whatsapp';
import {
  Plus,
  MessageCircle,
  HardDrive,
  FileSpreadsheet,
  AlertTriangle,
  Store,
} from 'lucide-react';

interface NavbarProps {
  orders: Order[];
  syncState: GoogleSyncState;
  shopProfile: ShopProfile;
  onOpenNewOrder: () => void;
  onOpenWhatsAppModal: () => void;
  onOpenSyncModal: () => void;
  onOpenShopSettings: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  orders,
  syncState,
  shopProfile,
  onOpenNewOrder,
  onOpenWhatsAppModal,
  onOpenSyncModal,
  onOpenShopSettings,
}) => {
  const today = new Date().toISOString().split('T')[0];
  const unpaidOrders = orders.filter((o) => o.kekurangan > 0);
  const overdueOrders = unpaidOrders.filter((o) => o.jatuhTempo && o.jatuhTempo < today);
  const totalKekuranganAll = unpaidOrders.reduce((sum, o) => sum + o.kekurangan, 0);

  return (
    <header className="no-print sticky top-0 z-40 bg-[#0B192C] text-white border-b border-[#1E293B] shadow-sm">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2 sm:gap-4">
          {/* Brand */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="cursor-pointer shrink-0" onClick={onOpenShopSettings} title="Pengaturan Identitas Toko">
              <div className="flex items-center gap-1.5 text-lg sm:text-2xl font-black tracking-tight text-white whitespace-nowrap">
                <span>{shopProfile.namaToko || 'HimmahShop'}</span>
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block shadow-xs" title="Gold Accent"></span>
              </div>
              <div className="text-[10px] text-teal-200 tracking-wider hidden sm:block truncate">
                {shopProfile.tagline}
              </div>
            </div>

            <div className="hidden xl:flex items-center gap-2 pl-4 border-l border-slate-700/80 text-xs shrink-0">
              <span className="bg-slate-800/90 border border-amber-500/30 px-2.5 py-1 rounded text-slate-200 whitespace-nowrap">
                Total Piutang Cicilan: <strong className="text-amber-300">{formatRupiah(totalKekuranganAll)}</strong>
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Google Drive / Sheets sync button */}
            <button
              id="btn-google-drive-sync"
              onClick={onOpenSyncModal}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition border shrink-0 ${
                syncState.isConnected
                  ? 'bg-teal-900/50 border-teal-500/60 text-teal-100 hover:bg-teal-900/80'
                  : 'bg-amber-950/40 border-amber-500/60 text-amber-200 hover:bg-amber-950/70'
              }`}
              title="Database Google Sheet di Drive Pribadi"
            >
              <FileSpreadsheet size={15} className={`shrink-0 ${syncState.isConnected ? 'text-teal-300' : 'text-amber-400'}`} />
              <span className="hidden md:inline whitespace-nowrap">
                {syncState.isConnected ? 'Google Sheet Drive' : 'Hubungkan Drive'}
              </span>
              {syncState.isConnected && (
                <span className="w-2 h-2 rounded-full bg-teal-400 shrink-0"></span>
              )}
            </button>

            {/* WhatsApp Reminder Button */}
            <button
              id="btn-whatsapp-reminder-center"
              onClick={onOpenWhatsAppModal}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-800/80 hover:bg-teal-700 border border-teal-500/60 text-white transition relative shadow-xs shrink-0"
              title="Pusat Pengingat WhatsApp Jatuh Tempo"
            >
              <MessageCircle size={15} className="text-teal-200 shrink-0" />
              <span className="hidden lg:inline whitespace-nowrap">Pengingat WA</span>
              {overdueOrders.length > 0 ? (
                <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full flex items-center gap-0.5 shrink-0">
                  <AlertTriangle size={10} /> {overdueOrders.length}
                </span>
              ) : unpaidOrders.length > 0 ? (
                <span className="bg-amber-400 text-slate-950 text-[10px] font-bold px-1.5 py-0.2 rounded-full shrink-0">
                  {unpaidOrders.length}
                </span>
              ) : null}
            </button>

            {/* Profile Settings */}
            <button
              onClick={onOpenShopSettings}
              className="p-1.5 sm:p-2 text-teal-200 hover:text-white hover:bg-slate-800/70 rounded-lg transition shrink-0"
              title="Pengaturan Identitas Toko"
            >
              <Store size={17} />
            </button>

            {/* Add New Order Button */}
            <button
              id="btn-new-order-entry"
              onClick={onOpenNewOrder}
              aria-label="+ Pesanan Baru"
              className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-lg text-xs font-bold bg-amber-400 text-[#0B192C] hover:bg-amber-300 border border-amber-300/90 transition shadow-xs shrink-0 whitespace-nowrap active:scale-95 cursor-pointer"
              title="Catat Pesanan Baru"
            >
              <Plus size={15} className="shrink-0 stroke-[2.5]" />
              <span className="whitespace-nowrap font-bold">+ Pesanan Baru</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
