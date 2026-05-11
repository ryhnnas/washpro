const { z } = require('zod');

const registerSchema = z.object({
  businessName: z.string().min(3, "Nama bisnis minimal 3 karakter"),
  ownerName: z.string().min(2, "Nama pemilik minimal 2 karakter"),
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
});

const loginSchema = z.object({
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(1, "Password wajib diisi"),
});

const updateProfileSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter").optional(),
  password: z.string().min(6, "Password minimal 6 karakter").optional(),
}).refine(data => data.name || data.password, {
  message: "Minimal satu data (nama atau password) harus diisi untuk update",
});

module.exports = { registerSchema, loginSchema, updateProfileSchema };
