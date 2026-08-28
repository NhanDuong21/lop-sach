import { expect, test } from '@playwright/test';

const webOrigin = process.env.LOP_SACH_TOPOLOGY_WEB_ORIGIN;
const apiOrigin = process.env.LOP_SACH_TOPOLOGY_API_ORIGIN;
const username = process.env.LOP_SACH_SMOKE_USERNAME;
const password = process.env.LOP_SACH_SMOKE_PASSWORD;
const configured = Boolean(webOrigin && apiOrigin && username && password);

test.describe('@topology production chain', () => {
  test.skip(!configured, 'Production topology credentials and origins are not configured.');

  test('verifies HTTPS, session persistence, origin guard, health and cache policy', async ({
    context,
    page,
    request,
  }) => {
    expect(webOrigin).toMatch(/^https:\/\//u);
    expect(apiOrigin).toMatch(/^https:\/\//u);

    const live = await request.get(new URL('/health/live', apiOrigin).toString());
    expect(live.status()).toBe(200);
    const ready = await request.get(new URL('/health/ready', apiOrigin).toString());
    expect(ready.status()).toBe(200);

    await page.goto('/login');
    const loginResponsePromise = page.waitForResponse((response) =>
      response.url().includes('/api/v1/auth/login'),
    );
    await page.getByLabel('Tên đăng nhập').fill(username as string);
    await page.getByLabel('Mật khẩu', { exact: true }).fill(password as string);
    await page.getByRole('button', { name: 'Đăng nhập' }).click();
    const loginResponse = await loginResponsePromise;
    expect(loginResponse.status()).toBe(200);
    expect((await loginResponse.headerValue('cache-control'))?.toLowerCase()).toContain('no-store');

    const cookies = await context.cookies(webOrigin as string);
    const sessionCookie = cookies.find((cookie) => cookie.name === '__Host-lop_sach_session');
    expect(sessionCookie).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
      path: '/',
    });
    expect(sessionCookie?.domain).toBe(new URL(webOrigin as string).hostname);
    expect(sessionCookie?.domain.startsWith('.')).toBe(false);

    await expect(page.getByText(/^Chào /u)).toBeVisible();
    const meResponsePromise = page.waitForResponse((response) =>
      response.url().includes('/api/v1/auth/me'),
    );
    await page.reload();
    const meResponse = await meResponsePromise;
    expect(meResponse.status()).toBe(200);
    expect((await meResponse.headerValue('cache-control'))?.toLowerCase()).toContain('no-store');
    await expect(page.getByText(/^Chào /u)).toBeVisible();

    const rejected = await request.post(new URL('/api/v1/auth/login', webOrigin).toString(), {
      headers: { Origin: 'https://incorrect-origin.invalid', 'Content-Type': 'application/json' },
      data: { username, password },
    });
    expect(rejected.status()).toBe(403);

    await page.getByRole('button', { name: 'Đăng xuất' }).click();
    await expect(
      page.getByRole('heading', { name: 'Đăng nhập để phân công trực nhật' }),
    ).toBeVisible();
    expect(
      (await context.cookies(webOrigin as string)).some(
        (cookie) => cookie.name === '__Host-lop_sach_session',
      ),
    ).toBe(false);
    const afterLogout = await page.request.get(new URL('/api/v1/auth/me', webOrigin).toString());
    expect(afterLogout.status()).toBe(401);
    const afterLogoutHeaders: Record<string, string> = afterLogout.headers();
    expect(afterLogoutHeaders['cache-control']?.toLowerCase()).toContain('no-store');
  });
});
