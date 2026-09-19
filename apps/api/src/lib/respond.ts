import type { Response } from 'express';
import type { ApiMeta } from '@shop/shared';

export function ok<T>(res: Response, data: T, meta?: ApiMeta) {
  return res.json({ success: true, data, ...(meta ? { meta } : {}) });
}

export function created<T>(res: Response, data: T) {
  return res.status(201).json({ success: true, data });
}

export function noContent(res: Response) {
  return res.status(204).end();
}

export function buildMeta(page: number, pageSize: number, total: number): ApiMeta {
  return { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}
