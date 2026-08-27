import { defineConfig, devices } from '@playwright/test';

const topologyOrigin = process.env.LOP_SACH_TOPOLOGY_WEB_ORIGIN;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: topologyOrigin ?? 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    ...devices['Desktop Chrome'],
  },
  ...(topologyOrigin
    ? {}
    : {
        webServer: [
          {
            command: 'pnpm --filter @lop-sach/api e2e:server',
            url: 'http://127.0.0.1:3000/health/live',
            reuseExistingServer: !process.env.CI,
            timeout: 120_000,
          },
          {
            command: 'pnpm build && pnpm exec vite preview --host 127.0.0.1 --port 4173',
            url: 'http://127.0.0.1:4173',
            reuseExistingServer: !process.env.CI,
            timeout: 120_000,
          },
        ],
      }),
});
