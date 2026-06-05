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

const baseStaffSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter"),
  email: z.string().email("Format email tidak valid"),
  password: passwordPolicySchema.optional().or(z.literal("")),
  confirmPassword: z.string().optional().or(z.literal("")),
  phone: indonesianPhoneSchema.optional().or(z.literal("")),
});

const staffSchema = baseStaffSchema.refine((data) => {
  const hasPassword = typeof data.password === 'string' && data.password.trim() !== '';
  if (!hasPassword) return true;
  return data.password === data.confirmPassword;
}, {
  message: "Password dan konfirmasi password harus sama",
  path: ["confirmPassword"],
});

const createStaffSchema = baseStaffSchema.extend({
  password: passwordPolicySchema,
  confirmPassword: z.string().min(1, "Konfirmasi password wajib diisi"),
  phone: indonesianPhoneSchema,
}).refine((data) => data.password === data.confirmPassword, {
  message: "Password dan konfirmasi password harus sama",
  path: ["confirmPassword"],
});

module.exports = { staffSchema, createStaffSchema };
