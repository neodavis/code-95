import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CorrelationIdMiddleware } from './common/correlation-id.middleware';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { User } from './users/entities/user.entity';
import { TrainingCentersModule } from './training-centers/training-centers.module';
import { TrainingCenter } from './training-centers/entities/training-center.entity';
import { TrainingCenterEmployee } from './training-centers/entities/training-center-employee.entity';
import { ArticlesModule } from './articles/articles.module';
import { Article } from './articles/entities/article.entity';
import { ArticleCategory } from './articles/entities/article-category.entity';
import { ArticleTag } from './articles/entities/article-tag.entity';
import { FaqModule } from './faq/faq.module';
import { Faq } from './faq/entities/faq.entity';
import { StudyGroupTypesModule } from './study-group-types/study-group-types.module';
import { StudyGroupType } from './study-group-types/entities/study-group-type.entity';
import { CarryTypesModule } from './carry-types/carry-types.module';
import { CabinetModule } from './cabinet/cabinet.module';
import { StudyGroup } from './cabinet/entities/study-group.entity';
import { StudyGroupStudent } from './cabinet/entities/study-group-student.entity';
import { StudyGroupLog } from './cabinet/entities/study-group-log.entity';
import { EDriver } from './cabinet/entities/edriver.entity';
import { ESPK } from './cabinet/entities/espk.entity';
import { ECard } from './cabinet/entities/ecard.entity';
import { EDriverRegistry } from './cabinet/entities/edriver-registry.entity';
import { ECarryType } from './cabinet/entities/ecarry-type.entity';
import { EConstant } from './cabinet/entities/econstant.entity';
import { ECountry } from './cabinet/entities/ecountry.entity';
import { AuditModule } from './audit/audit.module';
import { AuditLog } from './audit/audit-log.entity';
import { HealthModule } from './health/health.module';
import { MetricsModule } from './metrics/metrics.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // No global guard: ThrottlerGuard is applied per-route, only on
    // login, the public QR registry lookup, and public read endpoints.
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 60000, limit: 600 }, // 600 req/min — public reads
      { name: 'medium', ttl: 60000, limit: 60 }, // 60 req/min — reserved
      { name: 'long', ttl: 60000, limit: 10 }, // 10 req/min — login
    ]),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        pinoHttp: {
          // Re-use the correlation ID assigned by CorrelationIdMiddleware
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          genReqId: (req: any) => req.id as string,
          transport:
            config.get<string>('NODE_ENV') !== 'production'
              ? { target: 'pino-pretty', options: { colorize: true } }
              : undefined,
          autoLogging: {
            ignore: (req: { url?: string }) =>
              req.url?.includes('/health') ||
              req.url?.includes('/metrics') ||
              false,
          },
        },
      }),
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('POSTGRES_HOST', 'localhost'),
        port: config.get<number>('POSTGRES_PORT', 5432),
        username: config.get<string>('POSTGRES_USER', 'pdr'),
        password: config.get<string>('POSTGRES_PASSWORD'),
        database: config.get<string>('POSTGRES_DB', 'code95'),
        entities: [
          AuditLog,
          User,
          TrainingCenter,
          TrainingCenterEmployee,
          Article,
          ArticleCategory,
          ArticleTag,
          Faq,
          StudyGroupType,
          StudyGroup,
          StudyGroupStudent,
          StudyGroupLog,
          EDriver,
          ESPK,
          ECard,
          EDriverRegistry,
          ECarryType,
          EConstant,
          ECountry,
        ],
        synchronize: false,
        logging: config.get<string>('TYPEORM_LOGGING', 'false') === 'true',
      }),
    }),
    AuditModule,
    HealthModule,
    MetricsModule,
    UsersModule,
    AuthModule,
    TrainingCentersModule,
    ArticlesModule,
    FaqModule,
    StudyGroupTypesModule,
    CarryTypesModule,
    CabinetModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(CorrelationIdMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
