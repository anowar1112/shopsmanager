import { z } from 'zod';
import { paginationSchema, phoneSchema } from './common.js';

export const createCustomerSchema = z.object({
  name: z.string().trim().min(2, 'At least 2 characters').max(100),
  phone: phoneSchema,
  address: z.string().trim().max(300).optional().or(z.literal('')),
  note: z.string().trim().max(500).optional().or(z.literal('')),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export const createSupplierSchema = z.object({
  name: z.string().trim().min(2, 'At least 2 characters').max(100),
  phone: phoneSchema,
  company: z.string().trim().max(120).optional().or(z.literal('')),
  address: z.string().trim().max(300).optional().or(z.literal('')),
  note: z.string().trim().max(500).optional().or(z.literal('')),
});

export const updateSupplierSchema = createSupplierSchema.partial();

export const partyQuerySchema = paginationSchema.extend({
  q: z.string().trim().max(120).optional(),
  hasDue: z.coerce.boolean().optional(),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
