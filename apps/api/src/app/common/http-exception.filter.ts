import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { type Request, type Response } from 'express';

/**
 * RFC 7807 Problem Details for HTTP APIs.
 * All API errors are returned as:
 * {
 *   "type": "about:blank",
 *   "title": "Not Found",
 *   "status": 404,
 *   "detail": "Study group not found",
 *   "instance": "/api/v1/cabinet/study-groups/abc"
 * }
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let title = 'Internal Server Error';
    let detail: string | undefined;
    const extra: Record<string, unknown> = {};

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      title = HttpStatus[status]?.replace(/_/g, ' ') ?? 'Error';
      const body = exception.getResponse();
      if (typeof body === 'string') {
        detail = body;
      } else if (typeof body === 'object' && body !== null) {
        const b = body as Record<string, unknown>;
        detail = typeof b['message'] === 'string' ? b['message'] : undefined;
        // include additional fields (e.g. validation fields, blockedDriverIds)
        for (const [key, value] of Object.entries(b)) {
          if (key !== 'message' && key !== 'statusCode' && key !== 'error') {
            extra[key] = value;
          }
        }
      }
    } else if (exception instanceof Error) {
      this.logger.error(exception.message, exception.stack);
      detail = 'An unexpected error occurred';
    } else {
      this.logger.error('Unknown exception', String(exception));
      detail = 'An unexpected error occurred';
    }

    const body: Record<string, unknown> = {
      type: 'about:blank',
      title,
      status,
      instance: request.url,
      ...extra,
    };
    if (detail !== undefined) {
      body['detail'] = detail;
    }

    response
      .status(status)
      .setHeader('Content-Type', 'application/problem+json')
      .json(body);
  }
}
