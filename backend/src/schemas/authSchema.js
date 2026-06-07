const { z } = require('zod');

const normalizeIndonesianPhone = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return raw;
  let v = raw.replace(/[\s-]/g, '');
  if (v.startsWith('+')) v = v.slice(1);
  if (v.startsWith('08')) v = `62${v.slice(1)}`;
  return v;
};

const indonesianPhoneSchema = z
  .string({ required_error: 'Nomor WhatsApp wajib diisi' })
  .min(10, 'Nomor WhatsApp minimal 10 digit')
  .max(16, 'Nomor WhatsApp maksimal 16 digit')
  .transform(normalizeIndonesianPhone)
  .refine((v) => /^62\d{8,13}$/.test(v), {
    message: 'Format nomor WhatsApp tidak valid. Gunakan 08xxxxxxxxxx, 628xxxxxxxxxx, atau +628xxxxxxxxxx',
  });

const passwordPolicySchema = z
  .string()
  .min(8, 'Password minimal 8 karakter')
  .regex(/[A-Z]/, 'Password harus mengandung huruf besar')
  .regex(/[a-z]/, 'Password harus mengandung huruf kecil')
  .regex(/[0-9]/, 'Password harus mengandung angka')
  .regex(/[^A-Za-z0-9]/, 'Password harus mengandung simbol');

const registerSchema = z.object({
  businessName: z.string().min(3, "Nama bisnis minimal 3 karakter"),
  ownerName: z.string().min(2, "Nama pemilik minimal 2 karakter"),
  email: z.string().email("Format email tidak valid"),
  password: passwordPolicySchema,
  confirmPassword: z.string().min(1, "Konfirmasi password wajib diisi"),
  phone: indonesianPhoneSchema,
}).refine((data) => data.password === data.confirmPassword, {
  message: "Password dan konfirmasi password harus sama",
  path: ["confirmPassword"],
});

const loginSchema = z.object({
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(1, "Password wajib diisi"),
});

const updateProfileSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter").optional(),
  currentPassword: z.string().min(1, "Password saat ini wajib diisi").optional(),
  password: passwordPolicySchema.optional(),
  phone: indonesianPhoneSchema.optional().or(z.literal("")),
}).refine((data) => data.name || data.password || data.phone !== undefined, {
  message: "Minimal satu data (nama, password, atau nomor HP) harus diisi untuk update",
}).refine((data) => {
  if (!data.password) return true;
  return typeof data.currentPassword === 'string' && data.currentPassword.length > 0;
}, {
  message: "Password saat ini wajib diisi untuk mengganti password",
  path: ["currentPassword"],
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Password lama wajib diisi"),
  newPassword: passwordPolicySchema,
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

const verifyEmailOtpSchema = z.object({
  email: z.string().email("Format email tidak valid"),
  otp: z.string().length(6, "OTP harus 6 digit"),
});

const resendEmailOtpSchema = z.object({
  email: z.string().email("Format email tidak valid"),
});

const resetPasswordSchema = z.object({
  resetToken: z.string().min(1, "Token wajib diisi"),
  newPassword: passwordPolicySchema,
});

module.exports = {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  verifyOtpSchema,
  verifyEmailOtpSchema,
  resendEmailOtpSchema,
  resetPasswordSchema,
};
