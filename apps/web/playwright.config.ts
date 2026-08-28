import { defineConfig, devices } from '@playwright/test';

const topologyOrigin = process.env.LOP_SACH_TOPOLOGY_WEB_ORIGIN;
const e2eApiPort = process.env.LOP_SACH_E2E_API_PORT ?? '3100';
const e2eWebPort = process.env.LOP_SACH_E2E_WEB_PORT ?? '4173';
const e2eApiOrigin = `http://127.0.0.1:${e2eApiPort}`;
const e2eWebOrigin = `http://127.0.0.1:${e2eWebPort}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: topologyOrigin ?? e2eWebOrigin,
    trace: 'retain-on-failure',
    ...devices['Desktop Chrome'],
  },
  projects: topologyOrigin
    ? [{ name: 'production-topology', testMatch: 'production-topology.spec.ts' }]
    : [
        { name: 'weekly-workflow', testMatch: 'weekly-workflow.spec.ts' },
        {
          name: 'quality-gates',
          testMatch: ['offline-current-week.spec.ts', 'impossible-schedule.spec.ts'],
          dependencies: ['weekly-workflow'],
        },
      ],
  ...(topologyOrigin
    ? {}
    : {
        webServer: [
          {
            command: 'pnpm --filter @lop-sach/api e2e:server',
            url: `${e2eApiOrigin}/health/live`,
            env: {
              LOP_SACH_E2E_API_PORT: e2eApiPort,
              LOP_SACH_E2E_WEB_ORIGIN: e2eWebOrigin,
            },
            reuseExistingServer: false,
            timeout: 120_000,
          },
          {
            command: `pnpm build && pnpm exec vite preview --host 127.0.0.1 --port ${e2eWebPort}`,
            url: e2eWebOrigin,
            env: { LOP_SACH_API_ORIGIN: e2eApiOrigin },
            reuseExistingServer: false,
            timeout: 120_000,
          },
        ],
      }),
});
