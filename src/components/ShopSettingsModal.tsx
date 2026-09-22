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
      <div className="bg-white w-full max-w-md rounded-xl shadow-xl border border-stone-200 overflow-hidden my-6">
        {/* Header */}
        <div className="bg-[#264936] text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Store size={20} className="text-emerald-200" />
            <div>
              <h2 className="text-base font-bold">Pengaturan Identitas Toko</h2>
              <p className="text-xs text-emerald-100">
                Informasi yang tertera pada kop invoice dan format pengingat WhatsApp
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

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-stone-700 mb-1">Nama Brand / Toko</label>
            <input
              type="text"
              value={formData.namaToko}
              onChange={(e) => setFormData({ ...formData, namaToko: e.target.value })}
              className="w-full px-3 py-1.5 bg-stone-50 border border-stone-300 rounded focus:border-[#264936] focus:outline-hidden font-bold"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-stone-700 mb-1">Tagline / Slogan</label>
            <input
              type="text"
              value={formData.tagline}
              onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
              className="w-full px-3 py-1.5 bg-stone-50 border border-stone-300 rounded focus:border-[#264936] focus:outline-hidden"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-stone-700 mb-1">Alamat Toko / Pengirim</label>
            <input
              type="text"
              value={formData.alamat}
              onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
              className="w-full px-3 py-1.5 bg-stone-50 border border-stone-300 rounded focus:border-[#264936] focus:outline-hidden"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Email Toko</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-1.5 bg-stone-50 border border-stone-300 rounded focus:border-[#264936] focus:outline-hidden"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-stone-700 mb-1">No WhatsApp Toko</label>
              <input
                type="text"
                value={formData.noHp}
                onChange={(e) => setFormData({ ...formData, noHp: e.target.value })}
                className="w-full px-3 py-1.5 bg-stone-50 border border-stone-300 rounded focus:border-[#264936] focus:outline-hidden"
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-stone-700 mb-1">Info Rekening Transfer Pembayaran</label>
            <textarea
              rows={2}
              value={formData.bankInfo}
              onChange={(e) => setFormData({ ...formData, bankInfo: e.target.value })}
              className="w-full px-3 py-1.5 bg-stone-50 border border-stone-300 rounded focus:border-[#264936] focus:outline-hidden"
              placeholder="Contoh: BCA 128-092-8811 a.n ByUzmaa Official"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-stone-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-stone-100 text-stone-700 font-semibold rounded hover:bg-stone-200"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-[#264936] text-white font-bold rounded hover:bg-[#1f3a2c] flex items-center gap-1.5 shadow-xs"
            >
              <Check size={14} /> Simpan Pengaturan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
