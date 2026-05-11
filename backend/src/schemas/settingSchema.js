const { z } = require('zod');

const updateSettingSchema = z.object({
  businessName: z.string().min(1, "Nama bisnis wajib diisi").optional(),
  businessAddress: z.string().optional(),
  businessPhone: z.string().optional(),
  requireCustomerName: z.boolean().optional(),
  requireCustomerPhone: z.boolean().optional(),
  requireCustomerAddress: z.boolean().optional(),
  staffAllowedMenus: z.array(z.string()).optional(),
  whatsappTemplates: z.object({
    RECEIPT: z.string().nullable().optional(),
    PROSES: z.string().nullable().optional(),
    SELESAI: z.string().nullable().optional(),
    DIAMBIL: z.string().nullable().optional(),
  }).optional(),
  whatsappNotificationStates: z.array(z.string()).optional(),
  membershipPackages: z.array(z.object({
    id: z.string().optional(),
    name: z.string().min(1),
    durationDays: z.number().int().positive().optional(),
    items: z.array(z.object({
      serviceId: z.string(),
      quotaAmount: z.number().positive(),
      deductionRate: z.number().positive().optional(),
    })).optional(),
  })).optional(),
});

module.exports = { updateSettingSchema };
