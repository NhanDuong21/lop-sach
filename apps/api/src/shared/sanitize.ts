export function sanitizeFilename(value: string): string {
  return (
    value
      .normalize('NFKD')
      .replace(/[^a-zA-Z0-9._-]+/gu, '-')
      .replace(/-{2,}/gu, '-')
      .replace(/^-|-$/gu, '')
      .slice(0, 100) || 'lop-sach'
  );
}
