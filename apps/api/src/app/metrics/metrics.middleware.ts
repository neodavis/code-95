import { Injectable, type NestMiddleware } from '@nestjs/common';
import { type Request, type Response, type NextFunction } from 'express';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsMiddleware implements NestMiddleware {
  constructor(private readonly metricsService: MetricsService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    // Skip metrics and health endpoints to avoid noise
    if (req.path.includes('/metrics') || req.path.includes('/health')) {
      return next();
    }

    const method = req.method;
    this.metricsService.httpRequestsInProgress.inc({ method });
    const end = this.metricsService.httpRequestDuration.startTimer();

    res.on('finish', () => {
      const route = this.normalizeRoute(req.route?.path || req.path);
      const statusCode = String(res.statusCode);

      end({ method, route, status_code: statusCode });
      this.metricsService.httpRequestsTotal.inc({
        method,
        route,
        status_code: statusCode,
      });
      this.metricsService.httpRequestsInProgress.dec({ method });
    });

    next();
  }

  /** Replace numeric path segments with :id to prevent label cardinality explosion */
  private normalizeRoute(path: string): string {
    return path.replace(/\/\d+/g, '/:id');
  }
}
