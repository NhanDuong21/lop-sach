import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('serves a responsive public PWA install landing with real install and share flows', async ({
  context,
  page,
}) => {
  const authRequests: string[] = [];
  const consoleErrors: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/api/v1/auth/bootstrap')) authRequests.push(request.url());
  });
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/install?class=10c8');
  await expect(page).toHaveTitle('Cài đặt Lớp Sạch');
  await expect(
    page.getByRole('heading', { name: /Ứng dụng phân công trực nhật lớp/u }),
  ).toBeVisible();
  await expect(page.locator('.sidebar, .topbar, .bottom-navigation')).toHaveCount(0);
  await expect(page.locator('.install-phone')).toBeVisible();
  await expect(page.locator('.install-qr-card')).toBeVisible();
  await expect(page.locator('.install-mobile-guide-button')).toBeHidden();
  await expect(page.locator('.install-qr-code')).toHaveAttribute(
    'data-install-url',
    'http://127.0.0.1:4173/install?class=10c8',
  );
  expect(authRequests).toEqual([]);

  const desktopLayout = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    phoneBottom: document.querySelector('.install-phone')?.getBoundingClientRect().bottom,
    ctaBottom: document.querySelector('.install-actions')?.getBoundingClientRect().bottom,
    brokenImages: [...document.images]
      .filter((image) => image.complete && image.naturalWidth === 0)
      .map((image) => image.currentSrc),
  }));
  expect(desktopLayout.scrollWidth).toBeLessThanOrEqual(desktopLayout.innerWidth);
  expect(desktopLayout.phoneBottom ?? 901).toBeLessThanOrEqual(900);
  expect(desktopLayout.ctaBottom ?? 901).toBeLessThanOrEqual(900);
  expect(desktopLayout.brokenImages).toEqual([]);

  await page.reload();
  await expect(page).toHaveTitle('Cài đặt Lớp Sạch');
  await expect(page.getByRole('button', { name: 'Cài ứng dụng ngay' })).toBeVisible();

  await page.evaluate(() => {
    const event = new Event('beforeinstallprompt', { cancelable: true });
    Object.defineProperties(event, {
      prompt: { value: () => Promise.resolve() },
      userChoice: { value: Promise.resolve({ outcome: 'accepted', platform: 'web' }) },
    });
    window.dispatchEvent(event);
  });
  await page.getByRole('button', { name: 'Cài ứng dụng ngay' }).click();
  await expect(page.getByRole('button', { name: 'Mở Lớp Sạch' })).toBeVisible();
  await expect(page.getByText('Lớp Sạch đã được cài đặt')).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(page.locator('.install-phone')).toBeHidden();
  await expect(page.locator('.install-qr-card')).toBeHidden();
  await expect(page.locator('.install-mobile-guide-button')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Chia sẻ link cài đặt' }).first()).toBeVisible();
  const mobileLayout = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(mobileLayout.scrollWidth).toBeLessThanOrEqual(mobileLayout.innerWidth);

  await page.getByRole('button', { name: 'Cài ứng dụng ngay' }).click();
  const installDialog = page.getByRole('dialog', { name: 'Cài Lớp Sạch từ trình duyệt' });
  await expect(installDialog).toBeVisible();
  await installDialog.getByRole('button', { name: 'Đã hiểu' }).click();
  await expect(installDialog).toBeHidden();

  await page.getByRole('button', { name: 'Hướng dẫn cài đặt' }).click();
  await expect(page.getByRole('heading', { name: 'Cài Lớp Sạch chỉ trong 1 phút' })).toBeVisible();
  await page.getByRole('button', { name: 'Chia sẻ link cài đặt' }).first().click();
  await expect(page.getByText('Đã sao chép link cài đặt')).toBeVisible();
  const accessibility = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(accessibility.violations, JSON.stringify(accessibility.violations, null, 2)).toEqual([]);
  expect(consoleErrors).toEqual([]);

  const standalonePage = await context.newPage();
  await standalonePage.addInitScript(() => {
    const nativeMatchMedia = window.matchMedia.bind(window);
    window.matchMedia = (query: string): MediaQueryList => {
      if (query !== '(display-mode: standalone)') return nativeMatchMedia(query);
      return {
        matches: true,
        media: query,
        onchange: null,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => true,
      };
    };
  });
  await standalonePage.goto('/install');
  await expect(standalonePage).toHaveURL('http://127.0.0.1:4173/');
  await standalonePage.close();

  await page.goto('/login');
  await expect(
    page.getByRole('heading', { name: 'Đăng nhập để phân công trực nhật' }),
  ).toBeVisible();
});
