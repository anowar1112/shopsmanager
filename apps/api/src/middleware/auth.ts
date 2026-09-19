import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import type { Role } from '@shop/shared';
import { env } from '../lib/env.js';
import { ApiError } from '../lib/api-error.js';

type AccessTokenPayload = { sub: string; shopId: string; role: Role; name: string; email: string };

export const requireAuth: RequestHandler = (req, _res, next) => {
  const header = req.get('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
  if (!token) return next(ApiError.unauthenticated());

  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
    if (!payload.sub || !payload.shopId || !payload.role || !payload.name || !payload.email) return next(ApiError.unauthenticated());
    req.user = { id: payload.sub, shopId: payload.shopId, role: payload.role, name: payload.name, email: payload.email };
    return next();
  } catch {
    return next(ApiError.unauthenticated());
  }
};
