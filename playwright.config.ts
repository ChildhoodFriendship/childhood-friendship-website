import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env['E2E_PORT'] ?? 4310);

/** Test end-to-end: richiedono la build web (`npm run build -w @cf/web`). */
export default defineConfig({
  testDir: 'e2e',
  testMatch: '*.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI'] ? [['github'], ['list']] : 'list',
  use: {
    baseURL: `http://localhost:${port}`,
    locale: 'it-IT',
    timezoneId: 'Europe/Rome',
    trace: 'retain-on-failure',
    // In locale si può usare Chrome già installato: E2E_CHANNEL=chrome
    ...devices['Desktop Chrome'],
    ...(process.env['E2E_CHANNEL'] ? { channel: process.env['E2E_CHANNEL'] } : {})
  },
  webServer: {
    command: 'npx tsx e2e/server.mts',
    url: `http://localhost:${port}/api/health`,
    reuseExistingServer: !process.env['CI'],
    timeout: 60_000,
    env: { E2E_PORT: String(port) }
  }
});
