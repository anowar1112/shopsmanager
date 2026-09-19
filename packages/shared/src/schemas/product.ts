import { z } from 'zod';
import { PRODUCT_UNITS } from '../constants.js';
import { idSchema, moneySchema, paginationSchema } from './common.js';

export const createProductSchema = z
  .object({
    name: z.string().trim().min(2, 'At least 2 characters').max(120),
    sku: z
      .string()
      .trim()
      .toUpperCase()
      .min(2, 'At least 2 characters')
      .max(40)
      .regex(/^[A-Z0-9-]+$/, 'Only letters, numbers and hyphen'),
    barcode: z.string().trim().max(64).optional().or(z.literal('')),
    categoryId: idSchema,
    unit: z.enum(PRODUCT_UNITS).default('pcs'),
    costPrice: moneySchema,
    sellingPrice: moneySchema,
    openingStock: z.number().int().min(0).default(0),
    minStockLevel: z.number().int().min(0).default(5),
    imageUrl: z.string().url('Enter a valid URL').optional().or(z.literal('')),
    description: z.string().trim().max(1000).optional().or(z.literal('')),
    isActive: z.boolean().default(true),
  })
  .refine((v) => v.sellingPrice >= v.costPrice, {
    message: 'Selling price cannot be lower than cost price',
    path: ['sellingPrice'],
  });

/** Opening stock can only be set at creation; later changes go through inventory. */
export const updateProductSchema = createProductSchema
  .innerType()
  .omit({ openingStock: true })
  .partial();

export const productQuerySchema = paginationSchema.extend({
  q: z.string().trim().max(120).optional(),
  categoryId: idSchema.optional(),
  stockStatus: z.enum(['all', 'in-stock', 'low-stock', 'out-of-stock']).default('all'),
  isActive: z.enum(['all', 'active', 'inactive']).default('active'),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductQuery = z.infer<typeof productQuerySchema>;
