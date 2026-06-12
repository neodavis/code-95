import { Injectable, type NestMiddleware } from '@nestjs/common';
import { type Request, type Response, type NextFunction } from 'express';
import { randomUUID } from 'crypto';

/**
 * Assigns a unique correlation/request ID to every inbound request.
 * - Reads the incoming `x-request-id` header if present; otherwise generates a UUID v4.
 * - Writes the ID back to the response as `x-request-id` so clients can correlate.
 * - Stores the ID on `req.id` — pino-http uses this field via `genReqId` to stamp every log line.
 */
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const id =
      (req.headers['x-request-id'] as string | undefined) ?? randomUUID();
    (req as Request & { id: string }).id = id;
    res.setHeader('x-request-id', id);
    next();
  }
}
