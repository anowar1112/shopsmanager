import { Router, type Router as ExpressRouter } from 'express';
import { createCustomerSchema, partyQuerySchema, updateCustomerSchema } from '@shop/shared';
import { prisma } from '../../lib/prisma.js';
import { ok } from '../../lib/respond.js';
import { asyncHandler } from '../../middleware/error-handler.js';
import { requireAuth } from '../../middleware/auth.js';
import { ApiError } from '../../lib/api-error.js';

const router: ExpressRouter = Router();

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const query = partyQuerySchema.parse(req.query);
  const where = { shopId: req.user!.shopId, isActive: true, deletedAt: null, ...(query.q ? { OR: [{ name: { contains: query.q, mode: 'insensitive' as const } }, { phone: { contains: query.q } }] } : {}), ...(query.hasDue ? { outstandingAmount: { gt: 0 } } : {}) };
  const [total, customers] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.findMany({ where, orderBy: { name: 'asc' }, skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
  ]);
  return ok(res, customers.map((customer) => ({ ...customer, totalPurchases: Number(customer.totalPurchases), outstandingAmount: Number(customer.outstandingAmount) })), { page: query.page, pageSize: query.pageSize, total, totalPages: Math.max(1, Math.ceil(total / query.pageSize)) });
}));

router.post('/', requireAuth, asyncHandler(async (req, res) => {
  const input = createCustomerSchema.parse(req.body);
  const customer = await prisma.customer.create({ data: { shopId: req.user!.shopId, name: input.name, phone: input.phone, address: input.address || null, note: input.note || null } });
  return res.status(201).json({ success: true, data: customer });
}));

router.patch('/:id', requireAuth, asyncHandler(async (req, res) => {
  const input = updateCustomerSchema.parse(req.body);
  const customer = await prisma.customer.findFirst({ where: { id: req.params.id, shopId: req.user!.shopId, deletedAt: null } });
  if (!customer) throw ApiError.notFound('Customer');
  return ok(res, await prisma.customer.update({ where: { id: customer.id }, data: { ...input, address: input.address || null, note: input.note || null } }));
}));

export { router as customersRouter };
