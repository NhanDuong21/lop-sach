import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const origin = 'http://127.0.0.1:4173';

test('keeps an impossible schedule visible, unassigned and unpublished', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto('/login');
  await page.getByLabel('Tên đăng nhập').fill('owner');
  await page.getByLabel('Mật khẩu').fill('mat-khau-thu-nghiem');
  const loginResponsePromise = page.waitForResponse('**/api/v1/auth/login');
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  expect((await loginResponsePromise).status()).toBe(200);

  const classroomResponse = await page.request.get('/api/v1/classroom');
  expect(classroomResponse.status()).toBe(200);
  const classroom = (await classroomResponse.json()) as {
    data: { groups: { id: string; active: boolean }[] };
  };
  const groupId = classroom.data.groups.find((group) => group.active)?.id;
  expect(groupId).toBeTruthy();

  const createResponse = await page.request.post('/api/v1/duty-weeks', {
    headers: { Origin: origin },
    data: {
      weekStart: '2026-08-31',
      selectedGroupId: groupId,
      selectionBasis: 'MANUAL',
      selectionNote: 'Kiểm tra lịch không thể xếp đủ',
    },
  });
  expect(createResponse.status()).toBe(201);
  let week = (await createResponse.json()) as {
    data: {
      id: string;
      version: number;
      studentSnapshots: { id: string }[];
      taskOccurrences: { date: string; enabled: boolean }[];
    };
  };
  const dates = [
    ...new Set(
      week.data.taskOccurrences
        .filter((occurrence) => occurrence.enabled)
        .map((occurrence) => occurrence.date),
    ),
  ];
  expect(dates.length).toBeGreaterThan(0);
  expect(week.data.studentSnapshots.length).toBeGreaterThan(0);

  const absenceResponse = await page.request.put(`/api/v1/duty-weeks/${week.data.id}/absences`, {
    headers: { Origin: origin },
    data: {
      expectedVersion: week.data.version,
      absences: week.data.studentSnapshots.flatMap((student) =>
        dates.map((date) => ({ studentId: student.id, date })),
      ),
    },
  });
  expect(absenceResponse.status()).toBe(200);
  week = (await absenceResponse.json()) as typeof week;

  const contextResponse = await page.request.get(
    `/api/v1/duty-weeks/${week.data.id}/generation-context`,
  );
  expect(contextResponse.status()).toBe(200);
  const context = (await contextResponse.json()) as {
    data: {
      inputHash: string;
      serverSchedulerEngineVersion: string;
    };
  };
  const generateResponse = await page.request.post(`/api/v1/duty-weeks/${week.data.id}/generate`, {
    headers: { Origin: origin },
    data: {
      expectedVersion: week.data.version,
      clientSchedulerEngineVersion: context.data.serverSchedulerEngineVersion,
      inputHash: context.data.inputHash,
    },
  });
  expect(generateResponse.status()).toBe(200);
  const generated = (await generateResponse.json()) as {
    data: {
      id: string;
      assignments: { studentId: string | null }[];
      warnings: { code: string }[];
      fairness: { score: number; unassignedSlotCount: number };
    };
  };
  expect(generated.data.assignments).toHaveLength(0);
  expect(generated.data.warnings.some((warning) => warning.code === 'UNASSIGNED_SLOT')).toBe(true);
  expect(generated.data.fairness.unassignedSlotCount).toBeGreaterThan(0);
  expect(generated.data.fairness.score).toBeLessThanOrEqual(64);

  await page.goto(`/weeks/${generated.data.id}`);
  await expect(page.getByRole('heading', { name: 'Tuần 31/08 – 31/08/2026' })).toBeVisible();
  await expect(page.getByText('Còn vị trí chưa phân công.').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Phát hành' })).toBeDisabled();
  await expect(page.getByText(/time overlap/iu)).toHaveCount(0);
  const accessibility = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(accessibility.violations, JSON.stringify(accessibility.violations, null, 2)).toEqual([]);
  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.innerWidth);
});
