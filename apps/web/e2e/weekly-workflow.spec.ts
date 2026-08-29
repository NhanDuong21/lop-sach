import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';

test('creates, publishes, completes and exports a weekly schedule at 360 px', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  const expectNoHorizontalOverflow = async (): Promise<void> => {
    const viewportDimensions = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }));
    expect(viewportDimensions.scrollWidth).toBeLessThanOrEqual(viewportDimensions.innerWidth);
  };
  const expectClassTabsFit = async (): Promise<void> => {
    const tabDimensions = await page.locator('.classroom-tabs').evaluate((element) => ({
      scrollWidth: element.scrollWidth,
      clientWidth: element.clientWidth,
    }));
    expect(tabDimensions.scrollWidth).toBeLessThanOrEqual(tabDimensions.clientWidth);
  };
  await page.goto('/login');
  await page.getByLabel('Tên đăng nhập').fill('owner');
  await page.getByLabel('Mật khẩu', { exact: true }).fill('mat-khau-thu-nghiem');
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
  for (const student of [
    { displayName: 'An', gender: 'MALE' },
    { displayName: 'Bình', gender: 'FEMALE' },
    { displayName: 'Chi', gender: 'UNSPECIFIED' },
    { displayName: 'Dũng', gender: 'UNSPECIFIED' },
  ] as const) {
    const response = await page.request.post('/api/v1/students', {
      headers: { Origin: origin },
      data: { ...student, groupId, active: true, restrictions: [] },
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
  await page.goto('/class/students');
  await expect(page.getByRole('heading', { name: 'Học sinh', exact: true })).toBeVisible();
  await expect(page.locator('.student-row')).toHaveCount(4);
  await expect(page.locator('.student-row .initial-avatar').first()).toBeVisible();
  await expect(page.locator('.student-row').filter({ hasText: 'An' })).toContainText('Tổ 1 · Nam');
  await expect(page.locator('.student-row').filter({ hasText: 'Bình' })).toContainText('Tổ 1 · Nữ');
  await expect(page.locator('.student-row').filter({ hasText: 'Chi' })).toContainText(
    'Tổ 1 · Chưa thiết lập',
  );
  await expect(page.locator('.bottom-navigation a.active')).toContainText('Lớp học');
  await expectClassTabsFit();
  await expectNoHorizontalOverflow();
  await page.getByLabel('Tìm theo tên học sinh').fill('An');
  await expect(page.locator('.student-row')).toHaveCount(1);
  await page.getByLabel('Tìm theo tên học sinh').clear();
  await page.getByLabel('Lọc theo trạng thái').selectOption('INACTIVE');
  await expect(
    page.getByRole('heading', { name: 'Chưa có học sinh trong danh sách này' }),
  ).toBeVisible();
  await page.getByLabel('Lọc theo trạng thái').selectOption('ACTIVE');
  await page.getByRole('button', { name: 'Thêm một bạn' }).click();
  const studentDialog = page.getByRole('dialog', { name: 'Thêm một học sinh' });
  await expect(studentDialog).toBeVisible();
  await expect(studentDialog.getByLabel('Họ và tên')).toBeFocused();
  const modalAccessibility = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(
    modalAccessibility.violations,
    JSON.stringify(modalAccessibility.violations, null, 2),
  ).toEqual([]);
  await studentDialog.getByRole('button', { name: 'Hủy' }).click();
  await page.getByRole('button', { name: 'Thêm nhanh nhiều bạn' }).click();
  const bulkDialog = page.getByRole('dialog', { name: 'Thêm nhanh nhiều học sinh' });
  await expect(bulkDialog).toBeVisible();
  await bulkDialog.getByRole('button', { name: 'Hủy' }).click();
  await page.getByLabel('Tùy chọn cho An').click();
  await page.getByRole('button', { name: 'Ngừng tham gia' }).click();
  const studentDeactivateDialog = page.getByRole('dialog', {
    name: 'Ngừng cho học sinh tham gia?',
  });
  await expect(studentDeactivateDialog).toBeVisible();
  await studentDeactivateDialog.getByRole('button', { name: 'Hủy' }).click();

  await page.goto('/class/tasks');
  await expect(page.getByRole('heading', { name: 'Công việc trực nhật' })).toBeVisible();
  await expect(page.locator('.task-template-card')).toHaveCount(3);
  await expect(page.locator('.task-template-card .metadata-chips').first()).toBeVisible();
  await expectClassTabsFit();
  await expectNoHorizontalOverflow();
  await page.getByRole('button', { name: 'Đã tạm ngừng (0)' }).click();
  await expect(page.getByRole('heading', { name: 'Chưa có công việc' })).toBeVisible();
  await page.getByRole('button', { name: 'Đang dùng (3)' }).click();
  await page.getByRole('button', { name: 'Thêm công việc' }).click();
  const taskDialog = page.getByRole('dialog', { name: 'Thêm công việc' });
  await expect(taskDialog).toBeVisible();
  await taskDialog.getByRole('button', { name: 'Hủy' }).click();
  await page.getByLabel('Tùy chọn cho Lau bảng').click();
  await page.getByRole('button', { name: 'Tạm ngừng', exact: true }).click();
  const taskDeactivateDialog = page.getByRole('dialog', { name: 'Tạm ngừng công việc?' });
  await expect(taskDeactivateDialog).toBeVisible();
  await taskDeactivateDialog.getByRole('button', { name: 'Hủy' }).click();

  await page.goto('/class');
  await expect(page.locator('.class-hub-hero')).toBeVisible();
  await expect(page.locator('.class-hub-mascot img')).toHaveAttribute(
    'src',
    '/images/meoconcamchoi.png',
  );
  await expect(page.locator('.mobile-class-shortcuts')).toBeVisible();
  await expect(page.locator('.class-student-preview')).toBeHidden();
  await expectClassTabsFit();
  await expectNoHorizontalOverflow();
  await page.getByRole('button', { name: 'Chỉnh sửa' }).click();
  await expect(page.getByLabel('Tên lớp')).toHaveValue('10C8');
  await page.getByRole('button', { name: 'Hủy thay đổi' }).click();
  await page.getByRole('button', { name: 'Sửa', exact: true }).first().click();
  const groupDialog = page.getByRole('dialog', { name: 'Sửa Tổ 1' });
  await expect(groupDialog).toBeVisible();
  await groupDialog.getByRole('button', { name: 'Hủy' }).click();

  for (const width of [375, 390, 414, 430]) {
    await page.setViewportSize({ width, height: 844 });
    await expect(page.locator('.topbar')).toBeVisible();
    await expect(page.locator('.bottom-navigation')).toBeVisible();
    await expectClassTabsFit();
    await expectNoHorizontalOverflow();
  }
  await page.setViewportSize({ width: 768, height: 900 });
  await expect(page.locator('.sidebar')).toBeHidden();
  await expect(page.locator('.class-hub-hero')).toBeVisible();
  await expectClassTabsFit();
  await expectNoHorizontalOverflow();
  for (const viewport of [
    { width: 1024, height: 768 },
    { width: 1280, height: 800 },
    { width: 1366, height: 768 },
    { width: 1440, height: 900 },
    { width: 1600, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await expect(page.locator('.sidebar')).toBeVisible();
    await expect(page.locator('.topbar')).toBeHidden();
    await expect(page.locator('.class-student-preview')).toBeVisible();
    const classroomContainer = await page.locator('.classroom-container').boundingBox();
    expect(classroomContainer).not.toBeNull();
    expect(classroomContainer?.width ?? 0).toBeLessThanOrEqual(1280);
    await expectClassTabsFit();
    await expectNoHorizontalOverflow();
  }
  await page.setViewportSize({ width: 360, height: 780 });

  await page.goto('/weeks/new');
  await expect(page.getByRole('heading', { name: 'Chuẩn bị tuần trực' })).toBeVisible();
  await page.getByLabel('Ngày Thứ Hai đầu tuần').fill('2026-08-24');
  await page.getByRole('button', { name: 'Bắt đầu chuẩn bị tuần' }).click();
  await expect(page.getByRole('heading', { name: 'Tuần 24/08 – 24/08/2026' })).toBeVisible();
  await page.getByRole('button', { name: 'Xóa bản nháp' }).click();
  const deleteDraftDialog = page.getByRole('dialog', { name: 'Xóa bản nháp?' });
  await expect(deleteDraftDialog.getByText(/sẽ bị xóa vĩnh viễn/u)).toBeVisible();
  await deleteDraftDialog.getByRole('button', { name: 'Xóa bản nháp' }).click();
  await expect(page.getByRole('heading', { name: 'Chưa có lịch tuần này' })).toBeVisible();
  await page.goto('/weeks/new');
  await page.getByLabel('Ngày Thứ Hai đầu tuần').fill('2026-08-24');
  await page.getByRole('button', { name: 'Bắt đầu chuẩn bị tuần' }).click();
  await expect(page.getByRole('heading', { name: 'Tuần 24/08 – 24/08/2026' })).toBeVisible();
  await page.getByRole('button', { name: 'Thêm việc phát sinh' }).click();
  const oneOffDialog = page.getByRole('dialog', { name: 'Thêm công việc phát sinh' });
  await expect(oneOffDialog).toBeVisible();
  await oneOffDialog.getByRole('button', { name: 'Hủy' }).click();
  await page.getByRole('button', { name: 'Tiếp tục tạo phân công' }).click();
  await expect(page.getByText('Phân công đã đủ điều kiện để công bố.')).toBeVisible();
  const draftPngDownloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Tải bảng PNG' }).click();
  const draftPngDownload = await draftPngDownloadPromise;
  expect(draftPngDownload.suggestedFilename()).toBe('lop-sach-10c8-2026-08-24-ban-nhap.png');
  expect(await draftPngDownload.path()).not.toBeNull();
  await page.getByRole('button', { name: 'Tiếp tục công bố' }).click();
  await page.getByRole('button', { name: 'Công bố lịch' }).click();
  await expect(page.getByRole('heading', { name: 'Công bố lịch tuần?' })).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Công bố lịch' }).click();
  await expect(page.getByText('Đã công bố', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Hoàn thành tuần' }).click();
  await expect(page.getByRole('heading', { name: 'Hoàn thành tuần trực' })).toBeVisible();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /mọi người làm đúng lịch/u })
    .click();
  await expect(page.getByText('Đã hoàn thành', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Lịch sử' }).last().click();
  await expect(page.getByRole('heading', { name: 'Lịch sử trực nhật' })).toBeVisible();
  await page.getByRole('link', { name: /24\/08 – 24\/08\/2026/u }).click();
  await expect(page.getByRole('heading', { name: 'Tuần 24/08 – 24/08/2026' })).toBeVisible();
  const textDownloadPromise = page.waitForEvent('download');
  await page.getByText('Tùy chọn khác').click();
  await page.getByRole('button', { name: 'Tải tệp văn bản (.txt)' }).click();
  const textDownload = await textDownloadPromise;
  expect(textDownload.suggestedFilename()).toBe('lop-sach-10c8-2026-08-24.txt');
  const textPath = await textDownload.path();
  expect(textPath).not.toBeNull();
  const exportedText = await readFile(textPath ?? '', 'utf8');
  expect(exportedText).toContain('LỚP SẠCH — 10C8');
  expect(exportedText).toContain('Tuần 24/08 – 24/08/2026 · Tổ 1');
  expect(exportedText).not.toContain('generationContextHash');
  const pngDownloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Tải ảnh PNG' }).click();
  expect((await pngDownloadPromise).suggestedFilename()).toBe('lop-sach-10c8-2026-08-24.png');
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Tuần này' })).toBeVisible();
  await expect(page.getByText('Đã hoàn thành', { exact: true })).toBeVisible();
  await expect(page.locator('.topbar')).toBeVisible();
  await expect(page.locator('.sidebar')).toBeHidden();
  await expect(page.locator('.bottom-navigation')).toBeVisible();
  await expect(page.locator('.mobile-week-list')).toBeVisible();
  await expect(page.locator('.desktop-week-grid')).toBeHidden();
  await expect(page.locator('.current-week-mascot img')).toHaveAttribute(
    'src',
    '/images/meoconcamchoi.png',
  );
  await expect(page.locator('.mobile-summary-copy')).toContainText(/\d+ nhiệm vụ · \d+ bạn/u);
  await expectNoHorizontalOverflow();

  for (const width of [375, 390, 414, 430]) {
    await page.setViewportSize({ width, height: 844 });
    await expect(page.locator('.topbar')).toBeVisible();
    await expect(page.locator('.bottom-navigation')).toBeVisible();
    await expectNoHorizontalOverflow();
  }

  await page.setViewportSize({ width: 768, height: 900 });
  await expect(page.locator('.topbar')).toBeVisible();
  await expect(page.locator('.sidebar')).toBeHidden();
  await expect(page.locator('.bottom-navigation')).toBeVisible();
  await expectNoHorizontalOverflow();

  await page.setViewportSize({ width: 1024, height: 768 });
  await expect(page.locator('.sidebar')).toBeVisible();
  await expect(page.locator('.topbar')).toBeHidden();
  await expect(page.locator('.bottom-navigation')).toBeHidden();
  await expect(page.locator('.desktop-week-grid')).toBeVisible();
  await expect(page.locator('.mobile-week-list')).toBeHidden();
  expect(
    await page
      .locator('.app-layout')
      .evaluate((element) => getComputedStyle(element).backgroundImage),
  ).toBe('none');
  await expectNoHorizontalOverflow();

  for (const viewport of [
    { width: 1280, height: 800 },
    { width: 1366, height: 768 },
    { width: 1440, height: 900 },
    { width: 1600, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    const wideContainer = await page.locator('.current-week-container').boundingBox();
    expect(wideContainer).not.toBeNull();
    expect(wideContainer?.width ?? 0).toBeLessThanOrEqual(1200);
    await expectNoHorizontalOverflow();
  }

  await page.setViewportSize({ width: 360, height: 780 });
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
  await expect(page.getByRole('link', { name: 'Lập lịch tuần sau' })).toHaveCount(0);
  await page.context().setOffline(false);
  await page.reload();
  await page.getByRole('button', { name: 'Đăng xuất' }).click();
  const logoutDialog = page.getByRole('dialog', { name: 'Đăng xuất khỏi Lớp Sạch?' });
  await expect(logoutDialog).toBeVisible();
  await logoutDialog.getByRole('button', { name: 'Hủy' }).click();
  await expect(logoutDialog).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Tuần này' })).toBeVisible();
  await page.getByRole('button', { name: 'Đăng xuất' }).click();
  await logoutDialog.getByRole('button', { name: 'Đăng xuất' }).click();
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
