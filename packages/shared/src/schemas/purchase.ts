import { z } from 'zod';
import { idSchema, moneySchema, paginationSchema, quantitySchema } from './common.js';

export const purchaseItemInputSchema = z.object({
  productId: idSchema,
  quantity: quantitySchema,
  unitCost: moneySchema,
});

export const createPurchaseSchema = z.object({
  supplierId: idSchema,
  items: z.array(purchaseItemInputSchema).min(1, 'Add at least one product'),
  paidAmount: moneySchema.default(0),
  referenceNo: z.string().trim().max(60).optional().or(z.literal('')),
  purchasedAt: z.coerce.date().default(() => new Date()),
  note: z.string().trim().max(500).optional().or(z.literal('')),
  /** Update each product's cost price to this purchase's unit cost. */
  updateCostPrice: z.boolean().default(true),
});

export const purchaseQuerySchema = paginationSchema.extend({
  q: z.string().trim().max(120).optional(),
  supplierId: idSchema.optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export type CreatePurchaseInput = z.infer<typeof createPurchaseSchema>;
