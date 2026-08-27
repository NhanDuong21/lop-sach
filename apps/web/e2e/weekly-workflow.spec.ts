import { expect, test } from '@playwright/test';

test('creates, generates and publishes a weekly schedule at 360 px', async ({ page }) => {
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
  await expect(page.getByText('Ngữ cảnh phân công hiện hợp lệ.')).toBeVisible();
  await page.getByRole('button', { name: 'Phát hành' }).click();
  await expect(page.getByRole('heading', { name: 'Phát hành lịch tuần?' })).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Phát hành' }).click();
  await expect(page.getByText('Đã phát hành')).toBeVisible();
  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.innerWidth);
});
