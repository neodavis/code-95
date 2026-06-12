import { Transform, type TransformFnParams } from 'class-transformer';
import sanitizeHtml from 'sanitize-html';

const ALLOWED_TAGS = [
  'p',
  'b',
  'i',
  'u',
  'ul',
  'ol',
  'li',
  'a',
  'br',
  'strong',
  'em',
  'h2',
  'h3',
];

const ALLOWED_ATTRS: Record<string, string[]> = {
  a: ['href', 'target', 'rel'],
};

const ALLOWED_SCHEMES = ['http', 'https', 'mailto'];

export const sanitizeHtmlValue = (value: unknown): unknown => {
  if (typeof value !== 'string') {
    return value;
  }
  return sanitizeHtml(value, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRS,
    allowedSchemes: ALLOWED_SCHEMES,
  });
};

export const SanitizeHtml = (): PropertyDecorator =>
  Transform(({ value }: TransformFnParams) => sanitizeHtmlValue(value));
