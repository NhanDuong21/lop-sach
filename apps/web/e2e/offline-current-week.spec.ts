import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('installs the app shell without caching API or auth responses', async ({ page }) => {
  await page.goto('/login');
  const accessibility = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(accessibility.violations, JSON.stringify(accessibility.violations, null, 2)).toEqual([]);
  await page.evaluate(() => navigator.serviceWorker.ready);
  const manifest = (await (await page.request.get('/manifest.webmanifest')).json()) as {
    display: string;
    start_url: string;
    icons: { src: string; sizes: string; purpose: string }[];
  };
  const cacheState = await page.evaluate(async () => {
    const cacheNames = await caches.keys();
    const requests = (
      await Promise.all(cacheNames.map(async (name) => (await caches.open(name)).keys()))
    ).flat();
    return {
      cacheNames,
      urls: requests.map((request) => new URL(request.url).pathname),
      manifestHref: document.querySelector<HTMLLinkElement>('link[rel="manifest"]')?.href,
      faviconHref: document.querySelector<HTMLLinkElement>('link[rel="icon"]')?.href,
    };
  });
  expect(cacheState.cacheNames.some((name) => name.startsWith('lop-sach-static-'))).toBe(true);
  expect(cacheState.urls.some((path) => path.startsWith('/api/'))).toBe(false);
  expect(cacheState.urls).toContain('/index.html');
  expect(cacheState.urls.some((path) => path.startsWith('/assets/'))).toBe(true);
  expect(cacheState.urls.some((path) => path.startsWith('/landing/'))).toBe(false);
  expect(cacheState.manifestHref).toBe('http://127.0.0.1:4173/manifest.webmanifest');
  expect(cacheState.faviconHref).toBe('http://127.0.0.1:4173/icons/icon-maskable-512.png');
  expect(cacheState.urls).not.toContain('/icons/icon.svg');
  expect(manifest).toMatchObject({ display: 'standalone', start_url: '/' });
  expect(
    manifest.icons.some(
      (icon) =>
        icon.src === '/icons/icon-maskable-512.png' &&
        icon.sizes === '1254x1254' &&
        icon.purpose === 'maskable',
    ),
  ).toBe(true);
});
