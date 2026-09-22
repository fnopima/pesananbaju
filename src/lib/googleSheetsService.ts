import { Order } from '../types';

export const SPREADSHEET_TITLE = 'Database Pesanan Pakaian - ByUzmaa';

export interface SheetCreationResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
}

/**
 * Cari spreadsheet yang sudah pernah dibuat di Google Drive pengguna,
 * atau buat yang baru jika belum ada.
 */
export async function findOrCreateDatabaseSpreadsheet(accessToken: string): Promise<SheetCreationResult> {
  // 1. Cek apakah file sudah ada di Drive
  try {
    const query = encodeURIComponent(`name = '${SPREADSHEET_TITLE}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`);
    const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,webViewLink)`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.files && searchData.files.length > 0) {
        const file = searchData.files[0];
        return {
          spreadsheetId: file.id,
          spreadsheetUrl: file.webViewLink || `https://docs.google.com/spreadsheets/d/${file.id}/edit`,
        };
      }
    }
  } catch (err) {
    console.warn('Gagal mencari file lama di Google Drive, mencoba membuat file baru...', err);
  }

  // 2. Buat spreadsheet baru dengan struktur 3 sheet
  const newSheetPayload = {
    properties: {
      title: SPREADSHEET_TITLE,
    },
    sheets: [
      {
        properties: {
          title: 'Ringkasan Pesanan',
          gridProperties: { rowCount: 100, columnCount: 20, frozenRowCount: 1 },
        },
      },
      {
        properties: {
          title: 'Rincian Barang',
          gridProperties: { rowCount: 200, columnCount: 10, frozenRowCount: 1 },
        },
      },
      {
        properties: {
          title: 'Riwayat Pembayaran & Cicilan',
          gridProperties: { rowCount: 200, columnCount: 10, frozenRowCount: 1 },
        },
      },
    ],
  };

  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(newSheetPayload),
  });

  if (!createRes.ok) {
    const errData = await createRes.json().catch(() => ({}));
    throw new Error(errData?.error?.message || 'Gagal membuat Google Spreadsheet di Google Drive.');
  }

  const createdData = await createRes.json();
  const spreadsheetId = createdData.spreadsheetId;
  const spreadsheetUrl = createdData.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  return { spreadsheetId, spreadsheetUrl };
}

/**
 * Sinkronkan seluruh data pesanan, rincian barang, dan riwayat cicilan ke Google Sheets.
 */
export async function syncOrdersToSpreadsheet(
  accessToken: string,
  spreadsheetId: string,
  orders: Order[]
): Promise<void> {
  // 1. Data Sheet 1: Ringkasan Pesanan
  const pesananHeader = [
    'No Invoice',
    'Tanggal Pesanan',
    'Jatuh Tempo',
    'Nama Pelanggan',
    'No WhatsApp',
    'Brand / Series',
    'Total Item',
    'Subtotal (Rp)',
    'Biaya Request (Rp)',
    'Ongkir + Packing (Rp)',
    'Total Tagihan (Rp)',
    'Total DP (Rp)',
    'Total Cicilan (Rp)',
    'Total Terbayar (Rp)',
    'Kekurangan / Sisa (Rp)',
    'Status Pembayaran',
    'Status Pesanan',
    'Ekspedisi',
    'Alamat Kirim',
    'Catatan Khusus',
  ];

  const pesananRows = orders.map((o) => [
    o.invoiceNo,
    o.tanggal,
    o.jatuhTempo || '-',
    o.namaPelanggan,
    o.noWhatsApp,
    o.brandSeries,
    o.totalItem,
    o.subtotal,
    o.biayaRequest,
    o.ongkirPacking,
    o.totalTagihan,
    o.totalDp,
    o.totalCicilan,
    o.totalTerbayar,
    o.kekurangan,
    o.statusPembayaran,
    o.statusPesanan,
    o.ekspedisi || '-',
    o.alamat || '-',
    o.catatanKhusus || '-',
  ]);

  // 2. Data Sheet 2: Rincian Barang
  const rincianHeader = [
    'No Invoice',
    'Nama Pelanggan',
    'No Item',
    'Nama Barang',
    'Harga Satuan (Rp)',
    'Qty',
    'Diskon (%)',
    'Jumlah (Rp)',
  ];

  const rincianRows: (string | number)[][] = [];
  orders.forEach((o) => {
    o.items.forEach((item, idx) => {
      rincianRows.push([
        o.invoiceNo,
        o.namaPelanggan,
        idx + 1,
        item.namaBarang,
        item.harga,
        item.qty,
        item.diskonPersen,
        item.jumlah,
      ]);
    });
  });

  // 3. Data Sheet 3: Riwayat Pembayaran & Cicilan
  const pembayaranHeader = [
    'No Invoice',
    'Nama Pelanggan',
    'Tanggal Bayar',
    'Jenis Pembayaran',
    'Keterangan / Tahap',
    'Nominal Bayar (Rp)',
    'Metode Pembayaran',
    'Catatan',
  ];

  const pembayaranRows: (string | number)[][] = [];
  orders.forEach((o) => {
    o.pembayaran.forEach((p) => {
      pembayaranRows.push([
        o.invoiceNo,
        o.namaPelanggan,
        p.tanggal,
        p.jenis,
        p.label,
        p.jumlah,
        p.metode,
        p.catatan || '-',
      ]);
    });
  });

  // Bersihkan data lama di 3 sheet dan isi ulang
  const clearRanges = [
    "'Ringkasan Pesanan'!A1:Z500",
    "'Rincian Barang'!A1:Z500",
    "'Riwayat Pembayaran & Cicilan'!A1:Z500",
  ];

  for (const range of clearRanges) {
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:clear`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    }).catch(() => null);
  }

  // Tulis data baru dengan batchUpdate
  const updatePayload = {
    valueInputOption: 'USER_ENTERED',
    data: [
      {
        range: "'Ringkasan Pesanan'!A1",
        values: [pesananHeader, ...pesananRows],
      },
      {
        range: "'Rincian Barang'!A1",
        values: [rincianHeader, ...rincianRows],
      },
      {
        range: "'Riwayat Pembayaran & Cicilan'!A1",
        values: [pembayaranHeader, ...pembayaranRows],
      },
    ],
  };

  const updateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatePayload),
    }
  );

  if (!updateRes.ok) {
    const err = await updateRes.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'Gagal menyinkronkan data ke Google Sheet.');
  }
}
