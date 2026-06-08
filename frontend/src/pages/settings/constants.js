export const DEFAULT_TEMPLATES = {
  RECEIPT: `*{{businessName}}*
Nota Digital — #{{orderId}}
{{separator}}
Halo *{{customerName}}*,
Terima kasih telah mempercayakan cucian Anda.

*Detail Pesanan*
{{detailItems}}

Bayar   : {{paymentMethod}}
Total   : *{{totalPrice}}*
Status  : {{status}}
Waktu   : {{date}}
{{separator}}
Simpan pesan ini sebagai bukti transaksi.
_Nota dikirim otomatis oleh sistem._`,
  PROSES: `*{{businessName}}*
Update Status #{{orderId}}
{{separator}}
Halo *{{customerName}}*,

Pesanan Anda *{{serviceName}}* sekarang berstatus:
*{{statusLabel}}*

Mohon ditunggu ya, kami sedang mengerjakannya dengan sepenuh hati.`,
  SELESAI: `*{{businessName}}*
Update Status #{{orderId}}
{{separator}}
Halo *{{customerName}}*,

Pesanan Anda *{{serviceName}}* sekarang berstatus:
*{{statusLabel}}*

Silakan datang ke gerai untuk pengambilan. Terima kasih!`,
  DIAMBIL: `*{{businessName}}*
Update Status #{{orderId}}
{{separator}}
Halo *{{customerName}}*,

Pesanan Anda *{{serviceName}}* sekarang berstatus:
*{{statusLabel}}*

Terima kasih telah menggunakan jasa kami. Sampai jumpa kembali!`,
};

export const STAFF_MENU_OPTIONS = ['DASHBOARD', 'REPORTS', 'CUSTOMERS', 'SERVICES'];

export const NOTIFICATION_STATE_OPTIONS = [
  { id: 'PENDING', label: 'Pesanan Baru', desc: 'Dikirim saat transaksi dibuat' },
  { id: 'PROSES', label: 'Mulai Proses', desc: 'Dikirim saat status jadi PROSES' },
  { id: 'SELESAI', label: 'Cucian Selesai', desc: 'Dikirim saat status jadi SELESAI' },
  { id: 'DIAMBIL', label: 'Sudah Diambil', desc: 'Dikirim saat status jadi DIAMBIL' },
];

export const WA_TEMPLATE_TABS = Object.keys(DEFAULT_TEMPLATES);
