import { Router, type Router as ExpressRouter } from 'express';
import { prisma } from '../../lib/prisma.js';
import { ok } from '../../lib/respond.js';
import { asyncHandler } from '../../middleware/error-handler.js';
import { requireAuth } from '../../middleware/auth.js';
import { ApiError } from '../../lib/api-error.js';

const router: ExpressRouter = Router();

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const notifications = await prisma.notification.findMany({ where: { shopId: req.user!.shopId, OR: [{ userId: null }, { userId: req.user!.id }] }, orderBy: { createdAt: 'desc' }, take: 30 });
  const unread = notifications.filter((notification) => !notification.isRead).length;
  return ok(res, { notifications, unread });
}));

router.post('/:id/read', requireAuth, asyncHandler(async (req, res) => {
  const notification = await prisma.notification.findFirst({ where: { id: req.params.id, shopId: req.user!.shopId, OR: [{ userId: null }, { userId: req.user!.id }] } });
  if (!notification) throw ApiError.notFound('Notification');
  return ok(res, await prisma.notification.update({ where: { id: notification.id }, data: { isRead: true } }));
}));

router.post('/read-all', requireAuth, asyncHandler(async (req, res) => {
  await prisma.notification.updateMany({ where: { shopId: req.user!.shopId, isRead: false, OR: [{ userId: null }, { userId: req.user!.id }] }, data: { isRead: true } });
  return ok(res, { read: true });
}));

export { router as notificationsRouter };
