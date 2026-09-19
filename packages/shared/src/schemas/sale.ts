import { z } from 'zod';
import { PAYMENT_METHODS } from '../constants.js';
import { idSchema, moneySchema, paginationSchema, quantitySchema } from './common.js';

export const saleItemInputSchema = z.object({
  productId: idSchema,
  quantity: quantitySchema,
  unitPrice: moneySchema,
  discountAmount: moneySchema.default(0),
});

export const createSaleSchema = z
  .object({
    customerId: idSchema.optional().nullable(),
    items: z.array(saleItemInputSchema).min(1, 'Add at least one product'),
    discountAmount: moneySchema.default(0),
    paymentMethod: z.enum(PAYMENT_METHODS),
    paidAmount: moneySchema,
    note: z.string().trim().max(500).optional(),
  })
  .refine((v) => v.paymentMethod !== 'DUE' || !!v.customerId, {
    message: 'A customer is required for a due (credit) sale',
    path: ['customerId'],
  });

export const voidSaleSchema = z.object({
  reason: z.string().trim().min(5, 'Please write a short reason').max(300),
});

export const saleQuerySchema = paginationSchema.extend({
  q: z.string().trim().max(120).optional(),
  customerId: idSchema.optional(),
  soldById: idSchema.optional(),
  paymentMethod: z.enum(PAYMENT_METHODS).optional(),
  status: z.enum(['all', 'COMPLETED', 'VOID']).default('all'),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export type CreateSaleInput = z.infer<typeof createSaleSchema>;
export type SaleQuery = z.infer<typeof saleQuerySchema>;
