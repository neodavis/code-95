import { slugify } from './slug.util';

describe('slugify', () => {
  it('converts Latin text to lowercase slug', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('handles accented characters', () => {
    expect(slugify('Café résumé')).toBe('cafe-resume');
  });

  it('removes special characters', () => {
    expect(slugify('Hello, World! #2025')).toBe('hello-world-2025');
  });

  it('collapses multiple spaces into single hyphen', () => {
    expect(slugify('a   b   c')).toBe('a-b-c');
  });

  it('trims leading and trailing hyphens', () => {
    expect(slugify('--hello--')).toBe('hello');
  });

  it('converts underscores to hyphens', () => {
    expect(slugify('hello_world')).toBe('hello-world');
  });

  it('returns "item" for empty string', () => {
    expect(slugify('')).toBe('item');
  });

  it('returns "item" for string with only special chars', () => {
    expect(slugify('!@#$%')).toBe('item');
  });

  it('handles Cyrillic by stripping non-word chars', () => {
    const result = slugify('Привіт Світ');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('handles mixed Latin and numbers', () => {
    expect(slugify('Article 123 Test')).toBe('article-123-test');
  });
});
