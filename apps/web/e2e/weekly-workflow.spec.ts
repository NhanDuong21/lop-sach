import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';

test('creates, publishes, completes and exports a weekly schedule at 360 px', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto('/login');
  await page.getByLabel('Tên đăng nhập').fill('owner');
  await page.getByLabel('Mật khẩu').fill('mat-khau-thu-nghiem');
  const loginResponsePromise = page.waitForResponse('**/api/v1/auth/login');
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  const loginResponse = await loginResponsePromise;
  expect(loginResponse.status()).toBe(200);
  await expect(page.getByRole('heading', { name: 'Thiết lập lớp của bạn' })).toBeVisible();

  const origin = 'http://127.0.0.1:4173';
  const classroomResponse = await page.request.put('/api/v1/classroom', {
    headers: { Origin: origin },
    data: { name: '10C8', schoolYear: '2026-2027', schoolDays: ['MONDAY'] },
  });
  expect(classroomResponse.status()).toBe(201);
  const classroom = (await classroomResponse.json()) as {
    data: { groups: { id: string }[] };
  };
  const groupId = classroom.data.groups[0]?.id;
  expect(groupId).toBeTruthy();
  for (const displayName of ['An', 'Bình', 'Chi', 'Dũng']) {
    const response = await page.request.post('/api/v1/students', {
      headers: { Origin: origin },
      data: { displayName, groupId, active: true, gender: 'UNSPECIFIED', restrictions: [] },
    });
    expect(response.status()).toBe(201);
  }
  const currentClassroom = await page.request.get('/api/v1/classroom');
  const current = (await currentClassroom.json()) as { data: { version: number } };
  const completedOnboarding = await page.request.patch('/api/v1/classroom', {
    headers: { Origin: origin },
    data: { onboardingStep: 6, completeOnboarding: true, expectedVersion: current.data.version },
  });
  expect(completedOnboarding.status()).toBe(200);

  await page.reload();
  await page.goto('/weeks/new');
  await expect(page.getByRole('heading', { name: 'Tạo tuần mới' })).toBeVisible();
  await page.getByLabel('Ngày Thứ Hai đầu tuần').fill('2026-08-24');
  await page.getByRole('button', { name: 'Tạo tuần và kiểm tra vắng mặt' }).click();
  await expect(page.getByRole('heading', { name: 'Tuần 2026-08-24' })).toBeVisible();
  await page.getByRole('button', { name: 'Tạo phân công' }).click();
  await expect(page.getByText('Dữ liệu dùng để phân công hiện hợp lệ.')).toBeVisible();
  await page.getByRole('button', { name: 'Phát hành' }).click();
  await expect(page.getByRole('heading', { name: 'Phát hành lịch tuần?' })).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Phát hành' }).click();
  await expect(page.getByText('Đã phát hành')).toBeVisible();
  await page.getByRole('button', { name: 'Hoàn thành tuần' }).click();
  await expect(
    page.getByRole('heading', { name: 'Ghi nhận người thực hiện thực tế' }),
  ).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Hoàn thành tuần' }).click();
  await expect(page.getByText('Đã hoàn thành')).toBeVisible();
  await page.getByRole('link', { name: 'Lịch sử' }).last().click();
  await expect(page.getByRole('heading', { name: 'Lịch sử trực nhật' })).toBeVisible();
  await page.getByRole('link', { name: /Tuần 2026-08-24/u }).click();
  await expect(page.getByRole('heading', { name: 'Tuần 2026-08-24' })).toBeVisible();
  const textDownloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Xuất văn bản' }).click();
  const textDownload = await textDownloadPromise;
  expect(textDownload.suggestedFilename()).toBe('lop-sach-10c8-2026-08-24.txt');
  const textPath = await textDownload.path();
  expect(textPath).not.toBeNull();
  const exportedText = await readFile(textPath ?? '', 'utf8');
  expect(exportedText).toContain('LỚP SẠCH — 10C8');
  expect(exportedText).toContain('Tuần 2026-08-24 · Tổ 1 · Bản phát hành 1');
  expect(exportedText).not.toContain('generationContextHash');
  const pngDownloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Xuất PNG' }).click();
  expect((await pngDownloadPromise).suggestedFilename()).toBe('lop-sach-10c8-2026-08-24.png');
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Tuần này' })).toBeVisible();
  await expect(page.getByText('Bản phát hành 1')).toBeVisible();
  const accessibility = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(accessibility.violations, JSON.stringify(accessibility.violations, null, 2)).toEqual([]);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          new Promise<boolean>((resolve) => {
            const request = indexedDB.open('lop-sach-display-cache', 1);
            request.onsuccess = () => {
              const transaction = request.result.transaction('current-week', 'readonly');
              const get = transaction.objectStore('current-week').get('published-current-week');
              get.onsuccess = () => {
                request.result.close();
                resolve(Boolean(get.result));
              };
              get.onerror = () => resolve(false);
            };
            request.onerror = () => resolve(false);
          }),
      ),
    )
    .toBe(true);
  await page.evaluate(() => navigator.serviceWorker.ready);
  if (!(await page.evaluate(() => Boolean(navigator.serviceWorker.controller))))
    await page.reload();
  await expect
    .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
    .toBe(true);
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const requests = (
          await Promise.all(
            (await caches.keys()).map(async (name) => (await caches.open(name)).keys()),
          )
        ).flat();
        return requests.some((request) => new URL(request.url).pathname.startsWith('/assets/'));
      }),
    )
    .toBe(true);
  await page.context().setOffline(true);
  expect(
    await page.evaluate(async () => {
      const script = document.querySelector<HTMLScriptElement>('script[type="module"]');
      return script?.src ? (await fetch(script.src)).status : 0;
    }),
  ).toBe(200);
  await expect(page.getByRole('heading', { name: 'Tuần này · Ngoại tuyến' })).toBeVisible();
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Tuần này · Ngoại tuyến' })).toBeVisible();
  await expect(page.getByText('Chỉ xem bản đã lưu; mọi thay đổi đều bị chặn.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Tạo tuần khác' })).toHaveCount(0);
  await page.context().setOffline(false);
  await page.reload();
  await page.getByRole('button', { name: 'Đăng xuất' }).click();
  await expect(page.getByRole('button', { name: 'Đăng nhập' })).toBeVisible();
  await page.context().setOffline(true);
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(
    page.getByRole('heading', { name: 'Chưa có lịch đã lưu cho tuần này' }),
  ).toBeVisible();
  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.innerWidth);
  await page.context().setOffline(false);
});
