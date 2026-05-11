const { z } = require('zod');

const serviceSchema = z.object({
  name: z.string().min(2, "Nama layanan minimal 2 karakter"),
  price: z.number().nonnegative("Harga tidak boleh negatif"),
  type: z.enum(['KILOAN', 'SATUAN']),
  unit: z.string().min(1, "Unit wajib diisi"),
  estimateValue: z.number().int().positive().optional(),
  estimateUnit: z.enum(['HOUR', 'DAY']).optional(),
  isActive: z.boolean().optional(),
});

module.exports = { serviceSchema };
