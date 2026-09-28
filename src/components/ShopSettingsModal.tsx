import React, { useState } from 'react';
import { ShopProfile } from '../types';
import { X, Check, Store } from 'lucide-react';

interface ShopSettingsModalProps {
  profile: ShopProfile;
  onSave: (profile: ShopProfile) => void;
  onClose: () => void;
}

export const ShopSettingsModal: React.FC<ShopSettingsModalProps> = ({
  profile,
  onSave,
  onClose,
}) => {
  const [formData, setFormData] = useState<ShopProfile>(profile);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-md rounded-xl shadow-xl border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="bg-[#0B192C] text-white p-4 flex items-center justify-between border-b border-[#1E293B]">
          <div className="flex items-center gap-2">
            <Store size={20} className="text-amber-400" />
            <div>
              <h2 className="text-base font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                Pengaturan Identitas Toko
              </h2>
              <p className="text-xs text-teal-200">
                Informasi yang tertera pada kop invoice dan format pengingat WhatsApp
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Nama Brand / Toko</label>
            <input
              type="text"
              value={formData.namaToko}
              onChange={(e) => setFormData({ ...formData, namaToko: e.target.value })}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:outline-hidden font-bold"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Tagline / Slogan</label>
            <input
              type="text"
              value={formData.tagline}
              onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:outline-hidden"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Alamat Toko / Pengirim</label>
            <input
              type="text"
              value={formData.alamat}
              onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:outline-hidden"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Email Toko</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:outline-hidden"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">No WhatsApp Toko</label>
              <input
                type="text"
                value={formData.noHp}
                onChange={(e) => setFormData({ ...formData, noHp: e.target.value })}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:outline-hidden"
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Info Rekening Transfer Pembayaran</label>
            <textarea
              rows={2}
              value={formData.bankInfo}
              onChange={(e) => setFormData({ ...formData, bankInfo: e.target.value })}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:outline-hidden"
              placeholder="Contoh: BCA 128-092-8811 a.n ByUzmaa Official"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-100 text-slate-700 font-semibold rounded hover:bg-slate-200 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-teal-700 text-white font-bold rounded hover:bg-teal-800 flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Check size={14} /> Simpan Pengaturan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
