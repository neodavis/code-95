import { plainToInstance } from 'class-transformer';
import { validate, type ValidationError } from 'class-validator';

export async function validateDto<T extends object>(
  DtoClass: new () => T,
  data: Record<string, unknown>,
): Promise<ValidationError[]> {
  const instance = plainToInstance(DtoClass, data);
  return validate(instance);
}
