const { z } = require('zod');

const registerSchema = z.object({
  businessName: z.string().min(3, "Nama bisnis minimal 3 karakter"),
  ownerName: z.string().min(2, "Nama pemilik minimal 2 karakter"),
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
  phone: z.string().min(10, "Nomor HP minimal 10 digit").max(15, "Nomor HP maksimal 15 digit").optional(),
});

const loginSchema = z.object({
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(1, "Password wajib diisi"),
});

const updateProfileSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter").optional(),
  password: z.string().min(6, "Password minimal 6 karakter").optional(),
  phone: z.string().min(10, "Nomor HP minimal 10 digit").max(15, "Nomor HP maksimal 15 digit").optional().or(z.literal("")),
}).refine(data => data.name || data.password || data.phone !== undefined, {
  message: "Minimal satu data (nama, password, atau nomor HP) harus diisi untuk update",
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Password lama wajib diisi"),
  newPassword: z.string().min(6, "Password baru minimal 6 karakter"),
}).refine(data => data.currentPassword !== data.newPassword, {
  message: "Password baru tidak boleh sama dengan password lama",
  path: ["newPassword"],
});

const forgotPasswordSchema = z.object({
  email: z.string().email("Format email tidak valid"),
});

const verifyOtpSchema = z.object({
  email: z.string().email("Format email tidak valid"),
  otp: z.string().length(6, "OTP harus 6 digit"),
});

const resetPasswordSchema = z.object({
  resetToken: z.string().min(1, "Token wajib diisi"),
  newPassword: z.string().min(6, "Password baru minimal 6 karakter"),
});

module.exports = {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  verifyOtpSchema,
  resetPasswordSchema,
};
