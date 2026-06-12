export function slugify(str: string): string {
  return (
    str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_]+/g, '-')
      // eslint-disable-next-line sonarjs/slow-regex
      .replace(/^-+|-+$/g, '') || 'item'
  );
}
