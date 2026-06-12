import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
  ) {}

  /** Liveness — process is up, no dependency checks */
  @Get()
  @HealthCheck()
  liveness(): Promise<unknown> {
    return this.health.check([]);
  }

  /** Readiness — DB must be reachable */
  @Get('ready')
  @HealthCheck()
  readiness(): Promise<unknown> {
    return this.health.check([() => this.db.pingCheck('database')]);
  }
}
