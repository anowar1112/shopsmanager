import { Router, type Router as ExpressRouter } from 'express';
import { createExpenseSchema, expenseQuerySchema, LARGE_EXPENSE_THRESHOLD, updateExpenseSchema } from '@shop/shared';
import { prisma } from '../../lib/prisma.js';
import { ok } from '../../lib/respond.js';
import { asyncHandler } from '../../middleware/error-handler.js';
import { requireAuth } from '../../middleware/auth.js';
import { ApiError } from '../../lib/api-error.js';
import { requirePermission } from '../../middleware/permission.js';

const router: ExpressRouter = Router();

router.get('/', requireAuth, requirePermission('expense:read'), asyncHandler(async (req, res) => {
  const query = expenseQuerySchema.parse(req.query);
  const where = { shopId: req.user!.shopId, deletedAt: null, ...(query.category ? { category: query.category } : {}), ...(query.q ? { description: { contains: query.q, mode: 'insensitive' as const } } : {}), ...(query.from || query.to ? { expenseDate: { ...(query.from ? { gte: query.from } : {}), ...(query.to ? { lte: query.to } : {}) } } : {}) };
  const [total, expenses] = await Promise.all([
    prisma.expense.count({ where }),
    prisma.expense.findMany({ where, include: { createdBy: { select: { name: true } } }, orderBy: { expenseDate: 'desc' }, skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
  ]);
  return ok(res, expenses.map((expense) => ({ ...expense, amount: Number(expense.amount), addedBy: expense.createdBy.name })), { page: query.page, pageSize: query.pageSize, total, totalPages: Math.max(1, Math.ceil(total / query.pageSize)) });
}));

router.post('/', requireAuth, requirePermission('expense:create'), asyncHandler(async (req, res) => {
  const input = createExpenseSchema.parse(req.body);
  const expense = await prisma.$transaction(async (tx) => {
    const created = await tx.expense.create({ data: { shopId: req.user!.shopId, category: input.category, amount: input.amount, expenseDate: input.expenseDate, description: input.description || null, createdById: req.user!.id } });
    if (input.amount >= LARGE_EXPENSE_THRESHOLD) {
      await tx.notification.create({ data: { shopId: req.user!.shopId, type: 'LARGE_EXPENSE', title: 'Large expense added', body: `${input.category} expense of ৳ ${input.amount.toLocaleString('en-BD')}`, referenceId: created.id } });
    }
    return created;
  });
  return res.status(201).json({ success: true, data: { ...expense, amount: Number(expense.amount) } });
}));

router.patch('/:id', requireAuth, requirePermission('expense:update'), asyncHandler(async (req, res) => {
  const input = updateExpenseSchema.parse(req.body);
  const expense = await prisma.expense.findFirst({ where: { id: req.params.id, shopId: req.user!.shopId, deletedAt: null } });
  if (!expense) throw ApiError.notFound('Expense');
  if (req.user!.role === 'EMPLOYEE') throw ApiError.forbidden('Only a manager or owner can edit expenses');
  return ok(res, await prisma.expense.update({ where: { id: expense.id }, data: { ...input, description: input.description || null } }));
}));

router.delete('/:id', requireAuth, requirePermission('expense:delete'), asyncHandler(async (req, res) => {
  if (req.user!.role === 'EMPLOYEE') throw ApiError.forbidden('Only a manager or owner can archive expenses');
  const expense = await prisma.expense.findFirst({ where: { id: req.params.id, shopId: req.user!.shopId, deletedAt: null } });
  if (!expense) throw ApiError.notFound('Expense');
  await prisma.expense.update({ where: { id: expense.id }, data: { deletedAt: new Date() } });
  return res.status(204).end();
}));

export { router as expensesRouter };
