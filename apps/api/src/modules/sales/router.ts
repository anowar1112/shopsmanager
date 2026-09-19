import { Router, type Router as ExpressRouter } from 'express';
import { createSaleSchema, saleQuerySchema } from '@shop/shared';
import { prisma } from '../../lib/prisma.js';
import { ok } from '../../lib/respond.js';
import { asyncHandler } from '../../middleware/error-handler.js';
import { requireAuth } from '../../middleware/auth.js';
import { ApiError } from '../../lib/api-error.js';

const router: ExpressRouter = Router();
const money = (value: number) => Number(value.toFixed(2));

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const query = saleQuerySchema.parse(req.query);
  const where = {
    shopId: req.user!.shopId,
    ...(query.status !== 'all' ? { status: query.status } : {}),
    ...(query.customerId ? { customerId: query.customerId } : {}),
    ...(query.soldById ? { soldById: query.soldById } : {}),
    ...(query.paymentMethod ? { paymentMethod: query.paymentMethod } : {}),
    ...(query.q ? { invoiceNo: { contains: query.q, mode: 'insensitive' as const } } : {}),
    ...(query.from || query.to ? { createdAt: { ...(query.from ? { gte: query.from } : {}), ...(query.to ? { lte: query.to } : {}) } } : {}),
  };
  const [total, sales] = await Promise.all([
    prisma.sale.count({ where }),
    prisma.sale.findMany({ where, include: { customer: { select: { name: true } }, soldBy: { select: { name: true } } }, orderBy: { createdAt: 'desc' }, skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
  ]);
  return ok(res, sales.map((sale) => ({ ...sale, subtotal: Number(sale.subtotal), total: Number(sale.total), dueAmount: Number(sale.dueAmount), customer: sale.customer?.name ?? 'Walk-in customer', employee: sale.soldBy.name })), { page: query.page, pageSize: query.pageSize, total, totalPages: Math.max(1, Math.ceil(total / query.pageSize)) });
}));

router.post('/', requireAuth, asyncHandler(async (req, res) => {
  const input = createSaleSchema.parse(req.body);
  const productIds = [...new Set(input.items.map((item) => item.productId))];
  if (productIds.length !== input.items.length) throw ApiError.badRequest('A product can only appear once in the cart');

  const sale = await prisma.$transaction(async (tx) => {
    const products = await tx.product.findMany({ where: { id: { in: productIds }, shopId: req.user!.shopId, isActive: true, deletedAt: null } });
    if (products.length !== productIds.length) throw ApiError.notFound('Product');
    const byId = new Map(products.map((product) => [product.id, product]));
    let subtotal = 0;
    let itemDiscount = 0;
    let costTotal = 0;
    const items = input.items.map((item) => {
      const product = byId.get(item.productId)!;
      if (item.quantity > product.stockQuantity) throw ApiError.insufficientStock(`${product.name}: only ${product.stockQuantity} ${product.unit} available`);
      const lineDiscount = Math.min(item.discountAmount, item.quantity * Number(product.sellingPrice));
      const lineTotal = money(item.quantity * Number(product.sellingPrice) - lineDiscount);
      subtotal += item.quantity * Number(product.sellingPrice);
      itemDiscount += lineDiscount;
      costTotal += item.quantity * Number(product.costPrice);
      return { product, quantity: item.quantity, lineDiscount, lineTotal };
    });
    const total = money(subtotal - itemDiscount - input.discountAmount);
    if (total < 0 || input.paidAmount > total) throw ApiError.badRequest('Paid amount cannot be greater than the sale total');
    const dueAmount = money(total - input.paidAmount);
    if (dueAmount > 0 && !input.customerId) throw ApiError.badRequest('A customer is required when the sale has an outstanding amount');
    if (input.customerId) {
      const customer = await tx.customer.findFirst({ where: { id: input.customerId, shopId: req.user!.shopId, deletedAt: null } });
      if (!customer) throw ApiError.notFound('Customer');
    }
    const shop = await tx.shop.update({ where: { id: req.user!.shopId }, data: { invoiceSeq: { increment: 1 } }, select: { invoicePrefix: true, invoiceSeq: true } });
    const invoiceNo = `${shop.invoicePrefix}-${String(shop.invoiceSeq - 1).padStart(6, '0')}`;
    const created = await tx.sale.create({ data: { shopId: req.user!.shopId, invoiceNo, customerId: input.customerId ?? null, subtotal, discountAmount: itemDiscount + input.discountAmount, total, paidAmount: input.paidAmount, dueAmount, costTotal, paymentMethod: input.paymentMethod, note: input.note || null, soldById: req.user!.id } });
    for (const item of items) {
      const stockAfter = item.product.stockQuantity - item.quantity;
      await tx.saleItem.create({ data: { saleId: created.id, productId: item.product.id, productName: item.product.name, sku: item.product.sku, quantity: item.quantity, unitPrice: item.product.sellingPrice, costPrice: item.product.costPrice, discountAmount: item.lineDiscount, lineTotal: item.lineTotal } });
      await tx.product.update({ where: { id: item.product.id }, data: { stockQuantity: stockAfter } });
      await tx.inventoryTransaction.create({ data: { shopId: req.user!.shopId, productId: item.product.id, type: 'OUT', quantityChange: -item.quantity, stockBefore: item.product.stockQuantity, stockAfter, unitCost: item.product.costPrice, referenceType: 'SALE', referenceId: created.id, note: invoiceNo, createdById: req.user!.id } });
    }
    if (input.customerId) await tx.customer.update({ where: { id: input.customerId }, data: { totalPurchases: { increment: total }, outstandingAmount: { increment: dueAmount }, lastPurchaseAt: new Date() } });
    return created;
  });
  return res.status(201).json({ success: true, data: { id: sale.id, invoiceNo: sale.invoiceNo, total: Number(sale.total), dueAmount: Number(sale.dueAmount) } });
}));

export { router as salesRouter };
