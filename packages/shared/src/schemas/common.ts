import { z } from 'zod';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../constants.js';

/** Money is always a positive 2-decimal number; never a float in the DB. */
export const moneySchema = z
  .number({ invalid_type_error: 'Must be a number' })
  .nonnegative('Cannot be negative')
  .max(99_999_999, 'Amount is too large')
  .refine((n) => Number.isFinite(n) && Math.round(n * 100) === n * 100, {
    message: 'Maximum 2 decimal places',
  });

export const quantitySchema = z
  .number({ invalid_type_error: 'Must be a number' })
  .int('Must be a whole number')
  .min(1, 'Must be at least 1')
  .max(1_000_000, 'Quantity is too large');

export const idSchema = z.string().uuid('Invalid id');

/** Bangladeshi mobile number: 01XXXXXXXXX, optionally +880 prefixed. */
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^(?:\+?880|0)1[3-9]\d{8}$/, 'Enter a valid mobile number (e.g. 01712345678)');

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  sortBy: z.string().optional(),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
});

export const dateRangeSchema = z
  .object({
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  })
  .refine((v) => !v.from || !v.to || v.from <= v.to, {
    message: 'Start date must be before end date',
    path: ['from'],
  });

export type Pagination = z.infer<typeof paginationSchema>;
export type DateRange = z.infer<typeof dateRangeSchema>;
