import { z } from 'zod';
import { EXPENSE_CATEGORIES } from '../constants.js';
import { moneySchema, paginationSchema } from './common.js';

export const createExpenseSchema = z.object({
  category: z.enum(EXPENSE_CATEGORIES),
  amount: moneySchema.refine((n) => n > 0, 'Amount must be greater than 0'),
  expenseDate: z.coerce.date().default(() => new Date()),
  description: z.string().trim().max(500).optional().or(z.literal('')),
});

export const updateExpenseSchema = createExpenseSchema.partial();

export const expenseQuerySchema = paginationSchema.extend({
  q: z.string().trim().max(120).optional(),
  category: z.enum(EXPENSE_CATEGORIES).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
