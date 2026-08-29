export const APP_ENTRY_ROUTE = '/';
export const INSTALL_ROUTE = '/install';

export function buildCanonicalInstallUrl(currentHref: string): string {
  const current = new URL(currentHref);
  current.pathname = INSTALL_ROUTE;
  current.hash = '';
  return current.toString();
}
