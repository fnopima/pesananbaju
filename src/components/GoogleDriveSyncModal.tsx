import React from 'react';
import { GoogleSyncState, Order } from '../types';
import { SPREADSHEET_TITLE } from '../lib/googleSheetsService';
import {
  X,
  FileSpreadsheet,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  AlertCircle,
  HardDrive,
  LogOut,
  Layers,
} from 'lucide-react';

interface GoogleDriveSyncModalProps {
  syncState: GoogleSyncState;
  orders: Order[];
  onSignIn: () => void;
  onSignOut: () => void;
  onManualSync: () => void;
  onClose: () => void;
}

export const GoogleDriveSyncModal: React.FC<GoogleDriveSyncModalProps> = ({
  syncState,
  orders,
  onSignIn,
  onSignOut,
  onManualSync,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-xl shadow-xl border border-stone-200 overflow-hidden my-6">
        {/* Header */}
        <div className="bg-[#264936] text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HardDrive size={22} className="text-emerald-300" />
            <div>
              <h2 className="text-base font-bold">Database Google Sheets & Google Drive</h2>
              <p className="text-xs text-emerald-100">
                Penyimpanan data pesanan, rincian barang, & cicilan di Google Drive pribadi
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

        <div className="p-5 space-y-4 text-xs">
          {/* Status Box */}
          <div
            className={`p-4 rounded-lg border ${
              syncState.isConnected
                ? 'bg-emerald-50/70 border-emerald-200'
                : 'bg-amber-50/70 border-amber-200'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                {syncState.isConnected ? (
                  <CheckCircle2 size={18} className="text-emerald-600" />
                ) : (
                  <AlertCircle size={18} className="text-amber-600" />
                )}
                <div>
                  <div className="font-bold text-stone-900 text-sm">
                    {syncState.isConnected ? 'Terhubung dengan Google Drive' : 'Belum Terhubung dengan Akun Google'}
                  </div>
                  <div className="text-stone-600 text-[11px] mt-0.5">
                    {syncState.isConnected
                      ? `Akun: ${syncState.userEmail || 'Google User'}`
                      : 'Hubungkan akun Google Anda untuk menyimpan spreadsheet di Drive pribadi'}
                  </div>
                </div>
              </div>

              {syncState.isConnected && (
                <button
                  onClick={onSignOut}
                  className="text-stone-500 hover:text-rose-600 p-1 flex items-center gap-1 text-[11px]"
                  title="Putuskan Akun"
                >
                  <LogOut size={13} /> Putuskan
                </button>
              )}
            </div>

            {/* If not connected, show official GSI styled button */}
            {!syncState.isConnected && (
              <div className="mt-4 pt-3 border-t border-amber-200 flex flex-col items-center">
                <button
                  type="button"
                  onClick={onSignIn}
                  disabled={syncState.isSyncing}
                  className="gsi-material-button flex items-center justify-center gap-3 px-4 py-2.5 bg-white border border-stone-300 rounded-lg shadow-xs hover:bg-stone-50 transition w-full sm:w-auto font-medium text-stone-700 disabled:opacity-50"
                >
                  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-4 h-4">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  </svg>
                  <span>{syncState.isSyncing ? 'Menghubungkan...' : 'Masuk dengan Google Drive'}</span>
                </button>
                <span className="text-[11px] text-stone-500 mt-2 text-center">
                  Mengakses Google Drive & Spreadsheet Anda secara aman dengan izin
                </span>

                {syncState.errorMessage && (
                  <div className="mt-3 w-full p-2.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded text-center space-y-2">
                    <div>{syncState.errorMessage}</div>
                    <a
                      href={window.location.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-rose-300 rounded font-medium text-rose-700 hover:bg-rose-100 transition text-[11px]"
                    >
                      Buka di Tab Baru <ExternalLink size={12} />
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Connected Details */}
          {syncState.isConnected && (
            <div className="space-y-3">
              <div className="bg-stone-50 p-3.5 rounded-lg border border-stone-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="text-emerald-700" size={18} />
                    <span className="font-bold text-stone-800">{SPREADSHEET_TITLE}</span>
                  </div>
                  {syncState.spreadsheetUrl && (
                    <a
                      href={syncState.spreadsheetUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#264936] hover:underline font-semibold flex items-center gap-1 text-[11px]"
                    >
                      Buka di Drive <ExternalLink size={12} />
                    </a>
                  )}
                </div>

                <div className="text-[11px] text-stone-600">
                  <div>Tersimpan di: <strong>Google Drive Pribadi Anda</strong></div>
                  <div>Terakhir disinkronkan: <strong>{syncState.lastSyncedAt || 'Baru saja'}</strong></div>
                </div>

                {/* Structure info */}
                <div className="mt-2 pt-2 border-t border-stone-200">
                  <div className="text-[11px] font-semibold text-stone-700 mb-1 flex items-center gap-1">
                    <Layers size={13} /> Tab Sheet Otomatis Dikelola:
                  </div>
                  <ul className="list-disc list-inside text-[11px] text-stone-600 space-y-0.5 ml-1">
                    <li><strong>Ringkasan Pesanan</strong> (Tagihan, DP, Cicilan, Status, Kekurangan)</li>
                    <li><strong>Rincian Barang</strong> (Detail setiap baju, harga satuan, diskon, jumlah)</li>
                    <li><strong>Riwayat Pembayaran & Cicilan</strong> (Tanggal, tahap, nominal, metode)</li>
                  </ul>
                </div>
              </div>

              {/* Sync Action */}
              <div className="flex items-center justify-between pt-1">
                <div className="text-[11px] text-stone-500">
                  Jumlah pesanan saat ini: <strong>{orders.length} pesanan</strong>
                </div>

                <button
                  onClick={onManualSync}
                  disabled={syncState.isSyncing}
                  className="px-3 py-1.5 bg-[#264936] text-white font-bold rounded hover:bg-[#1f3a2c] flex items-center gap-1.5 disabled:opacity-50 transition shadow-xs"
                >
                  <RefreshCw size={13} className={syncState.isSyncing ? 'animate-spin' : ''} />
                  {syncState.isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}
                </button>
              </div>

              {syncState.errorMessage && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded">
                  {syncState.errorMessage}
                </div>
              )}
            </div>
          )}

          {/* Info note */}
          <div className="text-[11px] text-stone-500 bg-stone-100 p-2.5 rounded">
            <strong>Catatan Keamanan:</strong> Data Anda juga disimpan di memori browser lokal (Local Storage) sehingga tetap aman dan tidak akan hilang meskipun saat offline atau sebelum login ke Google Drive.
          </div>
        </div>

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
