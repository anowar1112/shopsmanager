import { Router, type Router as ExpressRouter } from 'express';
import { createPurchaseSchema, purchaseQuerySchema } from '@shop/shared';
import { prisma } from '../../lib/prisma.js';
import { ok } from '../../lib/respond.js';
import { asyncHandler } from '../../middleware/error-handler.js';
import { requireAuth } from '../../middleware/auth.js';
import { ApiError } from '../../lib/api-error.js';
import { requirePermission } from '../../middleware/permission.js';

const router: ExpressRouter = Router();
const money = (value: number) => Number(value.toFixed(2));

router.get('/', requireAuth, requirePermission('purchase:read'), asyncHandler(async (req, res) => {
  const query = purchaseQuerySchema.parse(req.query);
  const where = { shopId: req.user!.shopId, ...(query.supplierId ? { supplierId: query.supplierId } : {}), ...(query.q ? { referenceNo: { contains: query.q, mode: 'insensitive' as const } } : {}), ...(query.from || query.to ? { purchasedAt: { ...(query.from ? { gte: query.from } : {}), ...(query.to ? { lte: query.to } : {}) } } : {}) };
  const [total, purchases] = await Promise.all([
    prisma.purchase.count({ where }),
    prisma.purchase.findMany({ where, include: { supplier: { select: { name: true } }, createdBy: { select: { name: true } }, items: true }, orderBy: { purchasedAt: 'desc' }, skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
  ]);
  return ok(res, purchases.map((purchase) => ({ ...purchase, subtotal: Number(purchase.subtotal), total: Number(purchase.total), dueAmount: Number(purchase.dueAmount), supplier: purchase.supplier.name, createdBy: purchase.createdBy.name })), { page: query.page, pageSize: query.pageSize, total, totalPages: Math.max(1, Math.ceil(total / query.pageSize)) });
}));

router.post('/', requireAuth, requirePermission('purchase:create'), asyncHandler(async (req, res) => {
  const input = createPurchaseSchema.parse(req.body);
  const productIds = [...new Set(input.items.map((item) => item.productId))];
  if (productIds.length !== input.items.length) throw ApiError.badRequest('A product can only appear once in a purchase');
  const purchase = await prisma.$transaction(async (tx) => {
    const supplier = await tx.supplier.findFirst({ where: { id: input.supplierId, shopId: req.user!.shopId, deletedAt: null } });
    if (!supplier) throw ApiError.notFound('Supplier');
    const products = await tx.product.findMany({ where: { id: { in: productIds }, shopId: req.user!.shopId, deletedAt: null } });
    if (products.length !== productIds.length) throw ApiError.notFound('Product');
    const byId = new Map(products.map((product) => [product.id, product]));
    const items = input.items.map((item) => ({ product: byId.get(item.productId)!, quantity: item.quantity, unitCost: item.unitCost, lineTotal: money(item.quantity * item.unitCost) }));
    const subtotal = money(items.reduce((sum, item) => sum + item.lineTotal, 0));
    if (input.paidAmount > subtotal) throw ApiError.badRequest('Paid amount cannot be greater than the purchase total');
    const dueAmount = money(subtotal - input.paidAmount);
    const created = await tx.purchase.create({ data: { shopId: req.user!.shopId, supplierId: supplier.id, referenceNo: input.referenceNo || null, subtotal, total: subtotal, paidAmount: input.paidAmount, dueAmount, note: input.note || null, purchasedAt: input.purchasedAt, createdById: req.user!.id } });
    for (const item of items) {
      const stockAfter = item.product.stockQuantity + item.quantity;
      await tx.purchaseItem.create({ data: { purchaseId: created.id, productId: item.product.id, productName: item.product.name, sku: item.product.sku, quantity: item.quantity, unitCost: item.unitCost, lineTotal: item.lineTotal } });
      await tx.product.update({ where: { id: item.product.id }, data: { stockQuantity: stockAfter, ...(input.updateCostPrice ? { costPrice: item.unitCost } : {}) } });
      await tx.inventoryTransaction.create({ data: { shopId: req.user!.shopId, productId: item.product.id, type: 'IN', quantityChange: item.quantity, stockBefore: item.product.stockQuantity, stockAfter, unitCost: item.unitCost, referenceType: 'PURCHASE', referenceId: created.id, note: input.referenceNo || 'Purchase received', createdById: req.user!.id, createdAt: input.purchasedAt } });
    }
    await tx.supplier.update({ where: { id: supplier.id }, data: { totalPurchases: { increment: subtotal }, outstandingAmount: { increment: dueAmount }, lastPurchaseAt: input.purchasedAt } });
    return created;
  });
  return res.status(201).json({ success: true, data: { id: purchase.id, total: Number(purchase.total), dueAmount: Number(purchase.dueAmount) } });
}));

export { router as purchasesRouter };
