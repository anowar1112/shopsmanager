import { Router, type Router as ExpressRouter } from 'express';
import { productQuerySchema } from '@shop/shared';
import { prisma } from '../../lib/prisma.js';
import { ok } from '../../lib/respond.js';
import { asyncHandler } from '../../middleware/error-handler.js';
import { requireAuth } from '../../middleware/auth.js';

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

export { router as productsRouter };
