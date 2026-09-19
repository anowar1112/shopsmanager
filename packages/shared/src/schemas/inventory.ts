import { z } from 'zod';
import { idSchema, moneySchema, paginationSchema, quantitySchema } from './common.js';

export const stockInSchema = z.object({
  productId: idSchema,
  quantity: quantitySchema,
  unitCost: moneySchema.optional(),
  note: z.string().trim().max(300).optional(),
});

export const stockOutSchema = z.object({
  productId: idSchema,
  quantity: quantitySchema,
  reason: z.string().trim().min(3, 'Please write a reason').max(300),
});

/** Adjustment sets an absolute counted quantity, not a delta. */
export const stockAdjustSchema = z.object({
  productId: idSchema,
  countedQuantity: z.number().int().min(0, 'Cannot be negative'),
  reason: z.string().trim().min(3, 'Please write a reason').max(300),
});

export const inventoryHistoryQuerySchema = paginationSchema.extend({
  productId: idSchema.optional(),
  type: z.enum(['all', 'IN', 'OUT', 'ADJUST']).default('all'),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export type StockInInput = z.infer<typeof stockInSchema>;
export type StockOutInput = z.infer<typeof stockOutSchema>;
export type StockAdjustInput = z.infer<typeof stockAdjustSchema>;
