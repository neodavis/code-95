import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { type NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger, LoggerErrorInterceptor } from 'nestjs-pino';
import helmet from 'helmet';
import { AppModule } from './app/app.module';
import { HttpExceptionFilter } from './app/common/http-exception.filter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  // Behind nginx: trust the first proxy hop so req.ip (used as the
  // rate-limit key) resolves to the real client IP from X-Forwarded-For,
  // not the nginx container IP shared by all clients.
  app.set('trust proxy', 1);

  app.useLogger(app.get(Logger));
  app.useGlobalInterceptors(new LoggerErrorInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  app.use(
    helmet({
      contentSecurityPolicy: false, // managed at nginx level
      crossOriginEmbedderPolicy: false, // allow embedded resources
    }),
  );

  app.setGlobalPrefix('api/v1');

  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:4200',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      exceptionFactory: (errors) => {
        const fields: Record<string, string[]> = {};
        for (const err of errors) {
          fields[err.property] = Object.values(err.constraints ?? {});
        }
        return new BadRequestException({
          message: 'Validation failed',
          fields,
        });
      },
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Code-95 API')
    .setDescription('Professional Driver Registry API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/v1/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);

  const logger = app.get(Logger);
  logger.log(`Application is running on: http://localhost:${port}/api/v1`);
}

void bootstrap();
