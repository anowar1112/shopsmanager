import type { ApiErrorCode, ApiFieldError } from '@shop/shared';

/** The only error type services should throw. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ApiErrorCode,
    message: string,
    public readonly fields?: ApiFieldError[],
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static badRequest(message: string, fields?: ApiFieldError[]) {
    return new ApiError(400, 'VALIDATION_ERROR', message, fields);
  }
  static unauthenticated(message = 'Please sign in to continue') {
    return new ApiError(401, 'UNAUTHENTICATED', message);
  }
  static forbidden(message = 'You do not have permission to do this') {
    return new ApiError(403, 'FORBIDDEN', message);
  }
  static notFound(what = 'Record') {
    return new ApiError(404, 'NOT_FOUND', `${what} not found`);
  }
  static conflict(message: string) {
    return new ApiError(409, 'CONFLICT', message);
  }
  static insufficientStock(message: string) {
    return new ApiError(409, 'INSUFFICIENT_STOCK', message);
  }
}
