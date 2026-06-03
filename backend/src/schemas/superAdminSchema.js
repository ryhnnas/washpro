const { z } = require('zod');

const loginSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(1, 'Password wajib diisi'),
});

const toggleBusinessSchema = z.object({
  action: z.enum(['SUSPEND', 'ACTIVATE'], {
    errorMap: () => ({ message: "action harus 'SUSPEND' atau 'ACTIVATE'" }),
  }),
  reason: z.string().max(500).optional(),
});

const deleteBusinessSchema = z.object({
  confirmName: z.string().min(1, 'Nama konfirmasi wajib diisi'),
});

const rejectPaymentSchema = z.object({
  reason: z.string().min(5, 'Alasan penolakan minimal 5 karakter').max(500).optional(),
});

const upsertPlanSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(3, 'Nama paket minimal 3 karakter'),
  price: z.number().int().positive('Harga harus lebih dari 0'),
  durationDays: z.number().int().positive('Durasi harus lebih dari 0'),
  features: z.array(z.string()).optional(),
  isActive: z.boolean().optional().default(true),
});

const connectPairingSchema = z.object({
  phoneNumber: z.string().min(9, 'Nomor HP tidak valid'),
});

const sendTestMessageSchema = z.object({
  phone: z.string().min(9, 'Nomor HP tidak valid'),
});

module.exports = {
  loginSchema,
  toggleBusinessSchema,
  deleteBusinessSchema,
  rejectPaymentSchema,
  upsertPlanSchema,
  connectPairingSchema,
  sendTestMessageSchema,
};
