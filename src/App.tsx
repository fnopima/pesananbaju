import React, { useState, useEffect, useCallback } from 'react';
import { Order, PaymentRecord, ShopProfile, GoogleSyncState } from './types';
import {
  getStoredOrders,
  saveStoredOrders,
  getStoredShopProfile,
  saveStoredShopProfile,
  getStoredSpreadsheetId,
  saveStoredSpreadsheetId,
} from './lib/storage';
import {
  initAuth,
  googleSignIn,
  logoutGoogle,
  getAccessToken,
} from './lib/googleAuth';
import {
  findOrCreateDatabaseSpreadsheet,
  syncOrdersToSpreadsheet,
} from './lib/googleSheetsService';
import { Navbar } from './components/Navbar';
import { OrderList } from './components/OrderList';
import { InvoiceView } from './components/InvoiceView';
import { OrderFormModal } from './components/OrderFormModal';
import { PaymentModal } from './components/PaymentModal';
import { WhatsAppReminderModal } from './components/WhatsAppReminderModal';
import { GoogleDriveSyncModal } from './components/GoogleDriveSyncModal';
import { ShopSettingsModal } from './components/ShopSettingsModal';
import { CheckCircle2, AlertCircle, FileSpreadsheet, X } from 'lucide-react';

export default function App() {
  const [orders, setOrders] = useState<Order[]>(() => getStoredOrders());
  const [shopProfile, setShopProfile] = useState<ShopProfile>(() => getStoredShopProfile());

  // Modals state
  const [activeInvoiceOrder, setActiveInvoiceOrder] = useState<Order | null>(null);
  const [activePaymentOrder, setActivePaymentOrder] = useState<Order | null>(null);
  const [orderToEdit, setOrderToEdit] = useState<Order | null>(null);
  const [isOrderFormOpen, setIsOrderFormOpen] = useState<boolean>(false);
  const [isWhatsAppReminderOpen, setIsWhatsAppReminderOpen] = useState<boolean>(false);
  const [isGoogleSyncModalOpen, setIsGoogleSyncModalOpen] = useState<boolean>(false);
  const [isShopSettingsOpen, setIsShopSettingsOpen] = useState<boolean>(false);

  // Sync state
  const [syncState, setSyncState] = useState<GoogleSyncState>({
    isConnected: false,
    userEmail: null,
    spreadsheetId: getStoredSpreadsheetId(),
    spreadsheetUrl: getStoredSpreadsheetId()
      ? `https://docs.google.com/spreadsheets/d/${getStoredSpreadsheetId()}/edit`
      : null,
    lastSyncedAt: null,
    isSyncing: false,
    errorMessage: null,
  });

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Sync to Google Sheets helper
  const performGoogleSheetsSync = useCallback(
    async (ordersToSync: Order[], tokenOverride?: string) => {
      const token = tokenOverride || (await getAccessToken());
      if (!token) return;

      setSyncState((prev) => ({ ...prev, isSyncing: true, errorMessage: null }));

      try {
        let sheetId = syncState.spreadsheetId;
        let sheetUrl = syncState.spreadsheetUrl;

        // Find or create spreadsheet if not already set
        if (!sheetId) {
          const creation = await findOrCreateDatabaseSpreadsheet(token);
          sheetId = creation.spreadsheetId;
          sheetUrl = creation.spreadsheetUrl;
          saveStoredSpreadsheetId(sheetId);
        }

        // Push data to Google Sheets
        await syncOrdersToSpreadsheet(token, sheetId, ordersToSync);

        const nowTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        setSyncState((prev) => ({
          ...prev,
          spreadsheetId: sheetId,
          spreadsheetUrl: sheetUrl,
          lastSyncedAt: `Hari ini, ${nowTime}`,
          isSyncing: false,
          errorMessage: null,
        }));
      } catch (err: unknown) {
        console.error('Sync to Google Sheets failed:', err);
        const errMsg = err instanceof Error ? err.message : 'Gagal sinkron ke Google Sheet';
        setSyncState((prev) => ({
          ...prev,
          isSyncing: false,
          errorMessage: errMsg,
        }));
      }
    },
    [syncState.spreadsheetId, syncState.spreadsheetUrl]
  );

  // Initialize Firebase Auth listener
  useEffect(() => {
    const unsubscribe = initAuth(
      async (user, token) => {
        setSyncState((prev) => ({
          ...prev,
          isConnected: true,
          userEmail: user.email,
        }));
        // Auto-sync initial state to Google Drive spreadsheet
        await performGoogleSheetsSync(orders, token);
      },
      () => {
        setSyncState((prev) => ({
          ...prev,
          isConnected: false,
          userEmail: null,
        }));
      }
    );

    return () => {
      unsubscribe();
    };
  }, [performGoogleSheetsSync, orders]);

  // Save Orders and trigger optional cloud sync
  const updateOrdersAndPersist = (newOrders: Order[]) => {
    setOrders(newOrders);
    saveStoredOrders(newOrders);
    if (syncState.isConnected) {
      performGoogleSheetsSync(newOrders);
    }
  };

  // Google Login Handler
  const handleGoogleSignIn = async () => {
    try {
      setSyncState((prev) => ({ ...prev, isSyncing: true, errorMessage: null }));
      const result = await googleSignIn();
      if (result) {
        setSyncState((prev) => ({
          ...prev,
          isConnected: true,
          userEmail: result.user.email,
        }));
        showToast('Berhasil terhubung dengan Google Drive pribadi!');
        await performGoogleSheetsSync(orders, result.accessToken);
      } else {
        // User closed or cancelled the popup without signing in
        setSyncState((prev) => ({ ...prev, isSyncing: false }));
      }
    } catch (err: unknown) {
      console.error('Login error:', err);
      const msg = err instanceof Error ? err.message : 'Gagal login ke Google';
      setSyncState((prev) => ({ ...prev, isSyncing: false, errorMessage: msg }));
      showToast(msg, 'error');
    }
  };

  const handleGoogleSignOut = async () => {
    await logoutGoogle();
    setSyncState((prev) => ({
      ...prev,
      isConnected: false,
      userEmail: null,
      lastSyncedAt: null,
    }));
    showToast('Telah keluar dari akun Google.');
  };

  const handleManualSync = () => {
    performGoogleSheetsSync(orders);
    showToast('Menyinkronkan data pesanan ke Google Sheets...');
  };

  // Order CRUD
  const handleSaveOrder = (savedOrder: Order) => {
    let updated: Order[];
    const exists = orders.some((o) => o.id === savedOrder.id);
    if (exists) {
      updated = orders.map((o) => (o.id === savedOrder.id ? savedOrder : o));
      showToast(`Pesanan ${savedOrder.invoiceNo} berhasil diperbarui!`);
    } else {
      updated = [savedOrder, ...orders];
      showToast(`Pesanan ${savedOrder.invoiceNo} berhasil dibuat!`);
    }

    updateOrdersAndPersist(updated);
    setOrderToEdit(null);
    setIsOrderFormOpen(false);

    // Prompt open invoice view
    setActiveInvoiceOrder(savedOrder);
  };

  const handleDeleteOrder = (orderId: string) => {
    const updated = orders.filter((o) => o.id !== orderId);
    updateOrdersAndPersist(updated);
    showToast('Pesanan berhasil dihapus');
  };

  // Payment CRUD
  const handleSavePayment = (
    orderId: string,
    paymentData: Omit<PaymentRecord, 'id' | 'orderId' | 'createdAt'>
  ) => {
    const target = orders.find((o) => o.id === orderId);
    if (!target) return;

    const newPayment: PaymentRecord = {
      id: `pay-${Date.now()}`,
      orderId,
      createdAt: new Date().toISOString(),
      ...paymentData,
    };

    const updatedPembayaran = [...target.pembayaran, newPayment];

    const totalDp = updatedPembayaran
      .filter((p) => p.jenis === 'DP')
      .reduce((sum, p) => sum + p.jumlah, 0);

    const totalCicilan = updatedPembayaran
      .filter((p) => p.jenis === 'Cicilan' || p.jenis === 'Pelunasan')
      .reduce((sum, p) => sum + p.jumlah, 0);

    const totalTerbayar = totalDp + totalCicilan;
    const kekurangan = Math.max(0, target.totalTagihan - totalTerbayar);

    let statusPembayaran: Order['statusPembayaran'] = 'Belum Bayar';
    if (kekurangan <= 0 && totalTerbayar > 0) {
      statusPembayaran = 'Lunas';
    } else if (totalCicilan > 0) {
      statusPembayaran = 'Cicilan Sebagian';
    } else if (totalDp > 0) {
      statusPembayaran = 'DP Saja';
    }

    const updatedOrder: Order = {
      ...target,
      pembayaran: updatedPembayaran,
      totalDp,
      totalCicilan,
      totalTerbayar,
      kekurangan,
      statusPembayaran,
      updatedAt: new Date().toISOString(),
    };

    const updatedAll = orders.map((o) => (o.id === orderId ? updatedOrder : o));
    updateOrdersAndPersist(updatedAll);

    showToast(`Pembayaran ${paymentData.label} berhasil dicatat!`);

    // If active invoice is open, update it
    if (activeInvoiceOrder?.id === orderId) {
      setActiveInvoiceOrder(updatedOrder);
    }
  };

  const handleDeletePayment = (orderId: string, paymentId: string) => {
    const target = orders.find((o) => o.id === orderId);
    if (!target) return;

    const updatedPembayaran = target.pembayaran.filter((p) => p.id !== paymentId);

    const totalDp = updatedPembayaran
      .filter((p) => p.jenis === 'DP')
      .reduce((sum, p) => sum + p.jumlah, 0);

    const totalCicilan = updatedPembayaran
      .filter((p) => p.jenis === 'Cicilan' || p.jenis === 'Pelunasan')
      .reduce((sum, p) => sum + p.jumlah, 0);

    const totalTerbayar = totalDp + totalCicilan;
    const kekurangan = Math.max(0, target.totalTagihan - totalTerbayar);

    let statusPembayaran: Order['statusPembayaran'] = 'Belum Bayar';
    if (kekurangan <= 0 && totalTerbayar > 0) {
      statusPembayaran = 'Lunas';
    } else if (totalCicilan > 0) {
      statusPembayaran = 'Cicilan Sebagian';
    } else if (totalDp > 0) {
      statusPembayaran = 'DP Saja';
    }

    const updatedOrder: Order = {
      ...target,
      pembayaran: updatedPembayaran,
      totalDp,
      totalCicilan,
      totalTerbayar,
      kekurangan,
      statusPembayaran,
      updatedAt: new Date().toISOString(),
    };

    const updatedAll = orders.map((o) => (o.id === orderId ? updatedOrder : o));
    updateOrdersAndPersist(updatedAll);

    if (activePaymentOrder?.id === orderId) {
      setActivePaymentOrder(updatedOrder);
    }
    if (activeInvoiceOrder?.id === orderId) {
      setActiveInvoiceOrder(updatedOrder);
    }

    showToast('Catatan pembayaran dihapus');
  };

  const handleUpdateReminderDate = (orderId: string) => {
    const today = new Date().toISOString().split('T')[0];
    const updatedAll = orders.map((o) =>
      o.id === orderId ? { ...o, terakhirIngatkanWA: today } : o
    );
    updateOrdersAndPersist(updatedAll);
    showToast('Status pengingat WhatsApp diperbarui');
  };

  const handleSaveShopProfile = (newProfile: ShopProfile) => {
    setShopProfile(newProfile);
    saveStoredShopProfile(newProfile);
    showToast('Identitas toko berhasil disimpan!');
  };

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 font-sans flex flex-col">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-60 animate-bounce">
          <div
            className={`px-4 py-2.5 rounded-lg shadow-lg text-xs font-semibold flex items-center gap-2 ${
              toastMessage.type === 'success'
                ? 'bg-[#264936] text-white'
                : 'bg-rose-700 text-white'
            }`}
          >
            {toastMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Top Navbar */}
      <Navbar
        orders={orders}
        syncState={syncState}
        shopProfile={shopProfile}
        onOpenNewOrder={() => {
          setOrderToEdit(null);
          setIsOrderFormOpen(true);
        }}
        onOpenWhatsAppModal={() => setIsWhatsAppReminderOpen(true)}
        onOpenSyncModal={() => setIsGoogleSyncModalOpen(true)}
        onOpenShopSettings={() => setIsShopSettingsOpen(true)}
      />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Google Drive Status Bar Banner */}
        <div className="no-print bg-white p-3 sm:p-4 rounded-xl border border-stone-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-2 rounded-lg bg-emerald-50 text-[#264936]">
              <FileSpreadsheet size={18} />
            </div>
            <div>
              <div className="font-bold text-stone-800 flex items-center gap-2">
                <span>Database Google Sheets</span>
                {syncState.isConnected ? (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800">
                    Online Drive
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800">
                    Mode Penyimpanan Lokal (Offline)
                  </span>
                )}
              </div>
              <div className="text-stone-500 text-[11px] mt-0.5">
                {syncState.isConnected
                  ? `Tersimpan di Google Drive: ${syncState.userEmail || ''} • ${syncState.lastSyncedAt || 'Tersinkron'}`
                  : 'Hubungkan akun Google untuk menyinkronkan database secara otomatis ke Google Drive Anda.'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {syncState.isConnected ? (
              <>
                {syncState.spreadsheetUrl && (
                  <a
                    href={syncState.spreadsheetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold rounded text-xs transition"
                  >
                    Buka Google Sheet
                  </a>
                )}
                <button
                  onClick={handleManualSync}
                  disabled={syncState.isSyncing}
                  className="px-3 py-1.5 bg-[#264936] text-white font-semibold rounded text-xs hover:bg-[#1f3a2c] disabled:opacity-50 transition shadow-xs"
                >
                  {syncState.isSyncing ? 'Sinkron...' : 'Sinkronkan'}
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsGoogleSyncModalOpen(true)}
                className="px-3 py-1.5 bg-[#264936] text-white font-semibold rounded text-xs hover:bg-[#1f3a2c] transition shadow-xs"
              >
                Hubungkan Google Drive
              </button>
            )}
          </div>
        </div>

        {/* Orders List & Dashboard */}
        <OrderList
          orders={orders}
          shopProfile={shopProfile}
          onViewInvoice={(order) => setActiveInvoiceOrder(order)}
          onRecordPayment={(order) => setActivePaymentOrder(order)}
          onEditOrder={(order) => {
            setOrderToEdit(order);
            setIsOrderFormOpen(true);
          }}
          onDeleteOrder={handleDeleteOrder}
          onSendQuickReminder={(order) => {
            setActivePaymentOrder(null);
            setIsWhatsAppReminderOpen(true);
          }}
        />
      </main>

      {/* MODALS */}

      {/* 1. Exact ByUzmaa Invoice Modal */}
      {activeInvoiceOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-3xl rounded-xl shadow-2xl border border-stone-300 overflow-hidden my-6">
            <div className="no-print bg-stone-900 text-white p-3 flex items-center justify-between">
              <span className="text-xs font-bold">
                Pratinjau Invoice: {activeInvoiceOrder.invoiceNo}
              </span>
              <button
                onClick={() => setActiveInvoiceOrder(null)}
                className="text-stone-400 hover:text-white p-1"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-4 sm:p-6 max-h-[85vh] overflow-y-auto">
              <InvoiceView
                order={activeInvoiceOrder}
                shopProfile={shopProfile}
                onClose={() => setActiveInvoiceOrder(null)}
                onOpenPaymentModal={() => {
                  setActivePaymentOrder(activeInvoiceOrder);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* 2. Order Form Modal (New / Edit) */}
      {isOrderFormOpen && (
        <OrderFormModal
          orderToEdit={orderToEdit}
          onSave={handleSaveOrder}
          onClose={() => {
            setIsOrderFormOpen(false);
            setOrderToEdit(null);
          }}
        />
      )}

      {/* 3. Record Payment (DP / Installment) Modal */}
      {activePaymentOrder && (
        <PaymentModal
          order={activePaymentOrder}
          shopProfile={shopProfile}
          onSavePayment={handleSavePayment}
          onDeletePayment={handleDeletePayment}
          onClose={() => setActivePaymentOrder(null)}
        />
      )}

      {/* 4. WhatsApp Reminder Center Modal */}
      {isWhatsAppReminderOpen && (
        <WhatsAppReminderModal
          orders={orders}
          shopProfile={shopProfile}
          onUpdateReminderDate={handleUpdateReminderDate}
          onClose={() => setIsWhatsAppReminderOpen(false)}
        />
      )}

      {/* 5. Google Drive Sync Modal */}
      {isGoogleSyncModalOpen && (
        <GoogleDriveSyncModal
          syncState={syncState}
          orders={orders}
          onSignIn={handleGoogleSignIn}
          onSignOut={handleGoogleSignOut}
          onManualSync={handleManualSync}
          onClose={() => setIsGoogleSyncModalOpen(false)}
        />
      )}

      {/* 6. Shop Profile Settings Modal */}
      {isShopSettingsOpen && (
        <ShopSettingsModal
          profile={shopProfile}
          onSave={handleSaveShopProfile}
          onClose={() => setIsShopSettingsOpen(false)}
        />
      )}
    </div>
  );
}
