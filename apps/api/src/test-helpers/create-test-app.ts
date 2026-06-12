import { Test, type TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  type CanActivate,
  type INestApplication,
  type Type,
  ValidationPipe,
} from '@nestjs/common';

interface GuardOverride {
  guard: Type<CanActivate>;
  useValue: CanActivate;
}

interface TestAppOptions {
  controllers: Type[];
  providers: unknown[];
  guards?: GuardOverride[];
}

export async function createTestApp(
  options: TestAppOptions,
): Promise<INestApplication> {
  let builder = Test.createTestingModule({
    controllers: options.controllers,
    providers: options.providers as Type[],
  });

  for (const override of options.guards ?? []) {
    builder = builder.overrideGuard(override.guard).useValue(override.useValue);
  }

  const moduleRef: TestingModule = await builder.compile();

  const app = moduleRef.createNestApplication();

  app.setGlobalPrefix('api/v1');

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

  await app.init();
  return app;
}
