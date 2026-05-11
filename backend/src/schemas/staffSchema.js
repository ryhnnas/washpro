const { z } = require('zod');

const staffSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter"),
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter").optional().or(z.literal("")),
});

const createStaffSchema = staffSchema.extend({
  password: z.string().min(6, "Password minimal 6 karakter"),
});

module.exports = { staffSchema, createStaffSchema };
