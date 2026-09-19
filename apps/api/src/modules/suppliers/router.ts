import { Router, type Router as ExpressRouter } from 'express';
import { createSupplierSchema, partyQuerySchema, updateSupplierSchema } from '@shop/shared';
import { prisma } from '../../lib/prisma.js';
import { ok } from '../../lib/respond.js';
import { asyncHandler } from '../../middleware/error-handler.js';
import { requireAuth } from '../../middleware/auth.js';
import { ApiError } from '../../lib/api-error.js';
import { requirePermission } from '../../middleware/permission.js';

const router: ExpressRouter = Router();

router.get('/', requireAuth, requirePermission('supplier:read'), asyncHandler(async (req, res) => {
  const query = partyQuerySchema.parse(req.query);
  const where = { shopId: req.user!.shopId, isActive: true, deletedAt: null, ...(query.q ? { OR: [{ name: { contains: query.q, mode: 'insensitive' as const } }, { phone: { contains: query.q } }, { company: { contains: query.q, mode: 'insensitive' as const } }] } : {}), ...(query.hasDue ? { outstandingAmount: { gt: 0 } } : {}) };
  const [total, suppliers] = await Promise.all([prisma.supplier.count({ where }), prisma.supplier.findMany({ where, orderBy: { name: 'asc' }, skip: (query.page - 1) * query.pageSize, take: query.pageSize })]);
  return ok(res, suppliers.map((supplier) => ({ ...supplier, totalPurchases: Number(supplier.totalPurchases), outstandingAmount: Number(supplier.outstandingAmount) })), { page: query.page, pageSize: query.pageSize, total, totalPages: Math.max(1, Math.ceil(total / query.pageSize)) });
}));

router.post('/', requireAuth, requirePermission('supplier:create'), asyncHandler(async (req, res) => {
  const input = createSupplierSchema.parse(req.body);
  return res.status(201).json({ success: true, data: await prisma.supplier.create({ data: { shopId: req.user!.shopId, name: input.name, phone: input.phone, company: input.company || null, address: input.address || null, note: input.note || null } }) });
}));

router.patch('/:id', requireAuth, requirePermission('supplier:update'), asyncHandler(async (req, res) => {
  const input = updateSupplierSchema.parse(req.body);
  const supplier = await prisma.supplier.findFirst({ where: { id: req.params.id, shopId: req.user!.shopId, deletedAt: null } });
  if (!supplier) throw ApiError.notFound('Supplier');
  return ok(res, await prisma.supplier.update({ where: { id: supplier.id }, data: { ...input, company: input.company || null, address: input.address || null, note: input.note || null } }));
}));

export { router as suppliersRouter };
