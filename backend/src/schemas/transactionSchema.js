const { z } = require('zod');

const createTransactionSchema = z.object({
  customerName: z.string().min(1, "Nama pelanggan wajib diisi"),
  customerPhone: z.string().nullable().optional(),
  customerAddress: z.string().nullable().optional(),
  serviceName: z.string().optional(),
  serviceId: z.string().optional(),
  weight: z.number().positive("Berat/jumlah harus lebih dari 0").optional(),
  totalPrice: z.number().nonnegative("Total harga tidak boleh negatif").optional(),
  paymentMethod: z.enum(['CASH', 'QRIS']).default('CASH'),
  items: z.array(z.object({
    serviceId: z.string().optional(),
    serviceName: z.string().optional(),
    qty: z.number().positive(),
  })).optional(),
}).refine(data => (data.serviceId && data.weight) || (data.items && data.items.length > 0), {
  message: "Harus menyertakan layanan atau rincian item",
});

const updateStatusSchema = z.object({
  status: z.enum(['PENDING', 'PROSES', 'SELESAI', 'DIAMBIL']),
  notify: z.boolean().default(true).optional(),
});

module.exports = { createTransactionSchema, updateStatusSchema };
