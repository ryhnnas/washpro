const { z } = require('zod');

const customerSchema = z.object({
  name: z.string().min(1, "Nama pelanggan wajib diisi"),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
});

const activateMembershipSchema = z.object({
  templateId: z.string().optional(),
  startAt: z.string().optional().or(z.date().optional()),
});

const createWithMembershipSchema = customerSchema.extend({
  templateId: z.string().optional(),
  startAt: z.string().optional().or(z.date().optional()),
});

module.exports = { customerSchema, activateMembershipSchema, createWithMembershipSchema };
