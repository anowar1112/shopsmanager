import crypto from 'node:crypto';
import type { Request, Response, Router as ExpressRouter } from 'express';
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { loginSchema } from '@shop/shared';
import { prisma } from '../../lib/prisma.js';
import { env, isProduction } from '../../lib/env.js';
import { ApiError } from '../../lib/api-error.js';
import { ok } from '../../lib/respond.js';
import { asyncHandler } from '../../middleware/error-handler.js';
import { requireAuth } from '../../middleware/auth.js';

const router: ExpressRouter = Router();
const refreshCookieName = 'shop_refresh_token';

type AccessTokenPayload = {
  sub: string;
  shopId: string;
  role: string;
  name: string;
  email: string;
};

function issueAccessToken(user: { id: string; shopId: string; role: string; name?: string; email?: string }) {
  const payload: AccessTokenPayload = {
    sub: user.id,
    shopId: user.shopId,
    role: user.role,
    name: user.name ?? '',
    email: user.email ?? '',
  };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.ACCESS_TOKEN_TTL as jwt.SignOptions['expiresIn'],
  });
}

function setRefreshCookie(res: Response, token: string, expiresAt: Date) {
  res.cookie(refreshCookieName, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/api/v1/auth',
    maxAge: Math.max(0, expiresAt.getTime() - Date.now()),
  });
}

function newRefreshToken() {
  const token = crypto.randomBytes(48).toString('hex');
  return { token, tokenHash: crypto.createHash('sha256').update(token).digest('hex') };
}

router.post('/login', asyncHandler(handleLogin));

async function handleLogin(req: Request, res: Response) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ApiError.badRequest('Please check the highlighted fields', parsed.error.issues.map((issue) => ({
      field: String(issue.path[0] ?? 'form'),
      message: issue.message,
    })));
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    include: { shop: { select: { id: true, name: true, currency: true } } },
  });

  if (!user || !user.isActive || user.deletedAt || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    throw ApiError.unauthenticated('Email or password is incorrect');
  }

  const { token: refreshToken, tokenHash } = newRefreshToken();
  const refreshDays = parsed.data.rememberMe ? env.REFRESH_TOKEN_TTL_DAYS_REMEMBER : env.REFRESH_TOKEN_TTL_DAYS;
  const expiresAt = new Date(Date.now() + refreshDays * 24 * 60 * 60 * 1000);

  await prisma.$transaction([
    prisma.refreshToken.create({
      data: { userId: user.id, tokenHash, expiresAt, userAgent: req.get('user-agent'), ip: req.ip },
    }),
    prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }),
  ]);

  setRefreshCookie(res, refreshToken, expiresAt);

  return ok(res, {
    accessToken: issueAccessToken(user),
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      shop: user.shop,
    },
  });
}

router.post('/refresh', asyncHandler(async (req, res) => {
  const currentToken = req.cookies[refreshCookieName] as string | undefined;
  if (!currentToken) throw ApiError.unauthenticated();

  const tokenHash = crypto.createHash('sha256').update(currentToken).digest('hex');
  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });
  if (!stored || stored.revokedAt || stored.expiresAt <= new Date() || !stored.user.isActive || stored.user.deletedAt) {
    throw ApiError.unauthenticated('Your session has expired');
  }

  const nextToken = newRefreshToken();
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  await prisma.$transaction([
    prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } }),
    prisma.refreshToken.create({
      data: { userId: stored.userId, tokenHash: nextToken.tokenHash, expiresAt, userAgent: req.get('user-agent'), ip: req.ip },
    }),
  ]);
  setRefreshCookie(res, nextToken.token, expiresAt);
  return ok(res, { accessToken: issueAccessToken(stored.user) });
}));

router.post('/logout', asyncHandler(async (req, res) => {
  const currentToken = req.cookies[refreshCookieName] as string | undefined;
  if (currentToken) {
    const tokenHash = crypto.createHash('sha256').update(currentToken).digest('hex');
    await prisma.refreshToken.updateMany({ where: { tokenHash, revokedAt: null }, data: { revokedAt: new Date() } });
  }
  res.clearCookie(refreshCookieName, { httpOnly: true, secure: isProduction, sameSite: 'lax', path: '/api/v1/auth' });
  return res.status(204).end();
}));

router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: { shop: { select: { id: true, name: true, currency: true } } },
  });
  if (!user || !user.isActive || user.deletedAt) throw ApiError.unauthenticated();
  return ok(res, { user: { id: user.id, name: user.name, email: user.email, role: user.role, shop: user.shop } });
}));

export { router as authRouter };
