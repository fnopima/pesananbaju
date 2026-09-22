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
    <header className="no-print sticky top-0 z-40 bg-[#264936] text-white border-b border-[#1c3829] shadow-sm">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2 sm:gap-4">
          {/* Brand */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="cursor-pointer shrink-0" onClick={onOpenShopSettings} title="Pengaturan Identitas Toko">
              <div className="flex items-center gap-1 text-lg sm:text-2xl font-black tracking-tight text-white whitespace-nowrap">
                <span>ByUzmaa</span>
                <span className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-emerald-300 inline-block"></span>
              </div>
              <div className="text-[10px] text-emerald-200 tracking-wider hidden sm:block truncate">
                {shopProfile.tagline}
              </div>
            </div>

            <div className="hidden xl:flex items-center gap-2 pl-4 border-l border-emerald-800/80 text-xs shrink-0">
              <span className="bg-emerald-900/60 px-2.5 py-1 rounded text-emerald-200 whitespace-nowrap">
                Total Piutang Cicilan: <strong className="text-white">{formatRupiah(totalKekuranganAll)}</strong>
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
                  ? 'bg-emerald-800/50 border-emerald-600 text-emerald-100 hover:bg-emerald-800'
                  : 'bg-amber-900/40 border-amber-500/60 text-amber-200 hover:bg-amber-900/60'
              }`}
              title="Database Google Sheet di Drive Pribadi"
            >
              <FileSpreadsheet size={15} className={`shrink-0 ${syncState.isConnected ? 'text-emerald-300' : 'text-amber-300'}`} />
              <span className="hidden md:inline whitespace-nowrap">
                {syncState.isConnected ? 'Google Sheet Drive' : 'Hubungkan Drive'}
              </span>
              {syncState.isConnected && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
              )}
            </button>

            {/* WhatsApp Reminder Button */}
            <button
              id="btn-whatsapp-reminder-center"
              onClick={onOpenWhatsAppModal}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-700/80 hover:bg-emerald-700 border border-emerald-500/60 text-white transition relative shadow-xs shrink-0"
              title="Pusat Pengingat WhatsApp Jatuh Tempo"
            >
              <MessageCircle size={15} className="text-emerald-200 shrink-0" />
              <span className="hidden lg:inline whitespace-nowrap">Pengingat WA</span>
              {overdueOrders.length > 0 ? (
                <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full flex items-center gap-0.5 shrink-0">
                  <AlertTriangle size={10} /> {overdueOrders.length}
                </span>
              ) : unpaidOrders.length > 0 ? (
                <span className="bg-emerald-900 text-emerald-200 text-[10px] font-bold px-1.5 py-0.2 rounded-full shrink-0">
                  {unpaidOrders.length}
                </span>
              ) : null}
            </button>

            {/* Profile Settings */}
            <button
              onClick={onOpenShopSettings}
              className="p-1.5 sm:p-2 text-emerald-200 hover:text-white hover:bg-emerald-800/60 rounded-lg transition shrink-0"
              title="Pengaturan Identitas ByUzmaa"
            >
              <Store size={17} />
            </button>

            {/* Add New Order Button */}
            <button
              id="btn-new-order-entry"
              onClick={onOpenNewOrder}
              aria-label="+ Pesanan Baru"
              className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-lg text-xs font-bold bg-white text-[#264936] hover:bg-stone-100 transition shadow-xs shrink-0 whitespace-nowrap active:scale-95 cursor-pointer"
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
