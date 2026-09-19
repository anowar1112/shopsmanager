import { Router, type Router as ExpressRouter } from 'express';
import { createProductSchema, inventoryHistoryQuerySchema, productQuerySchema, stockAdjustSchema, stockInSchema, stockOutSchema, updateProductSchema } from '@shop/shared';
import { prisma } from '../../lib/prisma.js';
import { ok } from '../../lib/respond.js';
import { asyncHandler } from '../../middleware/error-handler.js';
import { requireAuth } from '../../middleware/auth.js';
import { ApiError } from '../../lib/api-error.js';

const router: ExpressRouter = Router();

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const query = productQuerySchema.parse(req.query);
  const where = {
    shopId: req.user!.shopId,
    ...(query.isActive === 'active' ? { isActive: true, deletedAt: null } : query.isActive === 'inactive' ? { isActive: false } : {}),
    ...(query.categoryId ? { categoryId: query.categoryId } : {}),
    ...(query.q ? { OR: [{ name: { contains: query.q, mode: 'insensitive' as const } }, { sku: { contains: query.q, mode: 'insensitive' as const } }, { barcode: { contains: query.q, mode: 'insensitive' as const } }] } : {}),
  };

  const [allMatching, categories] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { category: { select: { id: true, name: true } } },
      orderBy: query.sortBy === 'name' ? { name: query.sortDir } : query.sortBy === 'stock' ? { stockQuantity: query.sortDir } : { updatedAt: query.sortDir },
    }),
    prisma.category.findMany({ where: { shopId: req.user!.shopId, deletedAt: null }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
  ]);

  const filtered = query.stockStatus === 'low-stock'
    ? allMatching.filter((product) => product.stockQuantity <= product.minStockLevel && product.stockQuantity > 0)
    : query.stockStatus === 'out-of-stock'
      ? allMatching.filter((product) => product.stockQuantity === 0)
      : query.stockStatus === 'in-stock'
        ? allMatching.filter((product) => product.stockQuantity > product.minStockLevel)
        : allMatching;
  const total = filtered.length;
  const products = filtered.slice((query.page - 1) * query.pageSize, query.page * query.pageSize).map((product) => ({
    ...product,
    costPrice: Number(product.costPrice),
    sellingPrice: Number(product.sellingPrice),
    stockStatus: product.stockQuantity === 0 ? 'out-of-stock' : product.stockQuantity <= product.minStockLevel ? 'low-stock' : 'in-stock',
  }));

  return ok(res, { products, categories }, { page: query.page, pageSize: query.pageSize, total, totalPages: Math.max(1, Math.ceil(total / query.pageSize)) });
}));

router.post('/', requireAuth, asyncHandler(async (req, res) => {
  const input = createProductSchema.parse(req.body);
  const category = await prisma.category.findFirst({ where: { id: input.categoryId, shopId: req.user!.shopId, deletedAt: null } });
  if (!category) throw ApiError.notFound('Category');

  const product = await prisma.$transaction(async (tx) => {
    const created = await tx.product.create({
      data: {
        shopId: req.user!.shopId,
        categoryId: input.categoryId,
        name: input.name,
        sku: input.sku,
        barcode: input.barcode || null,
        unit: input.unit,
        costPrice: input.costPrice,
        sellingPrice: input.sellingPrice,
        stockQuantity: input.openingStock,
        minStockLevel: input.minStockLevel,
        imageUrl: input.imageUrl || null,
        description: input.description || null,
        isActive: input.isActive,
      },
    });
    if (input.openingStock > 0) {
      await tx.inventoryTransaction.create({
        data: { shopId: req.user!.shopId, productId: created.id, type: 'IN', quantityChange: input.openingStock, stockBefore: 0, stockAfter: input.openingStock, unitCost: input.costPrice, referenceType: 'OPENING', note: 'Opening stock', createdById: req.user!.id },
      });
    }
    return created;
  });
  return res.status(201).json({ success: true, data: product });
}));

router.patch('/:id', requireAuth, asyncHandler(async (req, res) => {
  if (req.user!.role === 'EMPLOYEE') throw ApiError.forbidden('Only a manager or owner can edit products');
  const input = updateProductSchema.parse(req.body);
  const existing = await prisma.product.findFirst({ where: { id: req.params.id, shopId: req.user!.shopId, deletedAt: null } });
  if (!existing) throw ApiError.notFound('Product');
  if (input.categoryId) {
    const category = await prisma.category.findFirst({ where: { id: input.categoryId, shopId: req.user!.shopId, deletedAt: null } });
    if (!category) throw ApiError.notFound('Category');
  }
  const product = await prisma.product.update({ where: { id: existing.id }, data: { ...input, barcode: input.barcode || null, imageUrl: input.imageUrl || null, description: input.description || null } });
  return ok(res, product);
}));

router.delete('/:id', requireAuth, asyncHandler(async (req, res) => {
  if (req.user!.role !== 'OWNER') throw ApiError.forbidden('Only the owner can archive products');
  const product = await prisma.product.findFirst({ where: { id: req.params.id, shopId: req.user!.shopId, deletedAt: null } });
  if (!product) throw ApiError.notFound('Product');
  await prisma.product.update({ where: { id: product.id }, data: { isActive: false, deletedAt: new Date() } });
  return res.status(204).end();
}));

router.post('/:id/stock-in', requireAuth, asyncHandler(async (req, res) => {
  const input = stockInSchema.parse({ ...req.body, productId: req.params.id });
  const product = await prisma.product.findFirst({ where: { id: input.productId, shopId: req.user!.shopId, deletedAt: null } });
  if (!product) throw ApiError.notFound('Product');
  const updated = await prisma.$transaction(async (tx) => {
    const stockAfter = product.stockQuantity + input.quantity;
    const next = await tx.product.update({ where: { id: product.id }, data: { stockQuantity: stockAfter, ...(input.unitCost !== undefined ? { costPrice: input.unitCost } : {}) } });
    await tx.inventoryTransaction.create({
      data: { shopId: req.user!.shopId, productId: product.id, type: 'IN', quantityChange: input.quantity, stockBefore: product.stockQuantity, stockAfter, unitCost: input.unitCost ?? product.costPrice, referenceType: 'PURCHASE', note: input.note || 'Stock received', createdById: req.user!.id },
    });
    return next;
  });
  return ok(res, updated);
}));

router.post('/:id/stock-out', requireAuth, asyncHandler(async (req, res) => {
  const input = stockOutSchema.parse({ ...req.body, productId: req.params.id });
  const product = await prisma.product.findFirst({ where: { id: input.productId, shopId: req.user!.shopId, deletedAt: null } });
  if (!product) throw ApiError.notFound('Product');
  if (input.quantity > product.stockQuantity) throw ApiError.insufficientStock(`Only ${product.stockQuantity} ${product.unit} available`);
  const stockAfter = product.stockQuantity - input.quantity;
  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.product.update({ where: { id: product.id }, data: { stockQuantity: stockAfter } });
    await tx.inventoryTransaction.create({ data: { shopId: req.user!.shopId, productId: product.id, type: 'OUT', quantityChange: -input.quantity, stockBefore: product.stockQuantity, stockAfter, unitCost: product.costPrice, referenceType: 'MANUAL', note: input.reason, createdById: req.user!.id } });
    return next;
  });
  return ok(res, updated);
}));

router.post('/:id/adjust', requireAuth, asyncHandler(async (req, res) => {
  const input = stockAdjustSchema.parse({ ...req.body, productId: req.params.id });
  const product = await prisma.product.findFirst({ where: { id: input.productId, shopId: req.user!.shopId, deletedAt: null } });
  if (!product) throw ApiError.notFound('Product');
  const quantityChange = input.countedQuantity - product.stockQuantity;
  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.product.update({ where: { id: product.id }, data: { stockQuantity: input.countedQuantity } });
    await tx.inventoryTransaction.create({ data: { shopId: req.user!.shopId, productId: product.id, type: 'ADJUST', quantityChange, stockBefore: product.stockQuantity, stockAfter: input.countedQuantity, unitCost: product.costPrice, referenceType: 'MANUAL', note: input.reason, createdById: req.user!.id } });
    return next;
  });
  return ok(res, updated);
}));

router.get('/inventory/history', requireAuth, asyncHandler(async (req, res) => {
  const query = inventoryHistoryQuerySchema.parse(req.query);
  const where = { shopId: req.user!.shopId, ...(query.productId ? { productId: query.productId } : {}), ...(query.type !== 'all' ? { type: query.type } : {}), ...(query.from || query.to ? { createdAt: { ...(query.from ? { gte: query.from } : {}), ...(query.to ? { lte: query.to } : {}) } } : {}) };
  const [total, rows] = await Promise.all([
    prisma.inventoryTransaction.count({ where }),
    prisma.inventoryTransaction.findMany({ where, include: { product: { select: { name: true, sku: true, unit: true } }, createdBy: { select: { name: true } } }, orderBy: { createdAt: 'desc' }, skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
  ]);
  return ok(res, rows.map((row) => ({ ...row, unitCost: row.unitCost ? Number(row.unitCost) : null, product: row.product, changedBy: row.createdBy.name })), { page: query.page, pageSize: query.pageSize, total, totalPages: Math.max(1, Math.ceil(total / query.pageSize)) });
}));

export { router as productsRouter };
