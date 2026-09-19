import { Router, type Router as ExpressRouter } from 'express';
import { dateRangeSchema } from '@shop/shared';
import { prisma } from '../../lib/prisma.js';
import { ok } from '../../lib/respond.js';
import { asyncHandler } from '../../middleware/error-handler.js';
import { requireAuth } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/permission.js';

const router: ExpressRouter = Router();
const money = (value: unknown) => Number(value ?? 0);

router.get('/overview', requireAuth, requirePermission('report:operational'), asyncHandler(async (req, res) => {
  const parsed = dateRangeSchema.parse(req.query);
  const to = parsed.to ?? new Date();
  const from = parsed.from ?? new Date(to.getTime() - 29 * 24 * 60 * 60 * 1000);
  const saleWhere = { shopId: req.user!.shopId, status: 'COMPLETED' as const, createdAt: { gte: from, lte: to } };
  const [sales, purchases, expenses, products, dailySales] = await Promise.all([
    prisma.sale.aggregate({ where: saleWhere, _sum: { total: true, costTotal: true, dueAmount: true }, _count: { id: true } }),
    prisma.purchase.aggregate({ where: { shopId: req.user!.shopId, purchasedAt: { gte: from, lte: to } }, _sum: { total: true, dueAmount: true }, _count: { id: true } }),
    prisma.expense.aggregate({ where: { shopId: req.user!.shopId, expenseDate: { gte: from, lte: to }, deletedAt: null }, _sum: { amount: true }, _count: { id: true } }),
    prisma.product.findMany({ where: { shopId: req.user!.shopId, isActive: true, deletedAt: null }, select: { stockQuantity: true, costPrice: true } }),
    prisma.sale.findMany({ where: saleWhere, select: { total: true, createdAt: true }, orderBy: { createdAt: 'asc' } }),
  ]);
  const byDay = new Map<string, number>();
  for (const sale of dailySales) { const day = sale.createdAt.toISOString().slice(0, 10); byDay.set(day, (byDay.get(day) ?? 0) + money(sale.total)); }
  const salesTotal = money(sales._sum.total);
  const costTotal = money(sales._sum.costTotal);
  const expenseTotal = money(expenses._sum.amount);
  return ok(res, { range: { from, to }, metrics: { sales: salesTotal, orders: sales._count.id, cost: costTotal, expenses: expenseTotal, profit: salesTotal - costTotal - expenseTotal, purchases: money(purchases._sum.total), purchaseOrders: purchases._count.id, dueSales: money(sales._sum.dueAmount), purchaseDue: money(purchases._sum.dueAmount), expenseEntries: expenses._count.id, stockValue: products.reduce((sum, product) => sum + product.stockQuantity * money(product.costPrice), 0) }, salesByDay: [...byDay.entries()].map(([date, total]) => ({ date, total })) });
}));

export { router as reportsRouter };
