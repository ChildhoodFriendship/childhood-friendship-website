import { expect, test } from '@playwright/test';
import { COMPANY } from '../packages/shared/src/company';

test('informativa privacy e cookie raggiungibili dal footer', async ({ page }) => {
  await page.goto('/');
  const footer = page.locator('footer');
  await expect(footer.getByText(COMPANY.email)).toHaveCount(0);
  await footer.getByRole('link', { name: 'Privacy' }).click();
  await expect(page).toHaveURL(/\/privacy$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Informativa privacy' })).toBeVisible();
  await expect(page.getByText(/Titolare del trattamento: Lorenzo Garoffolo/)).toBeVisible();
  await expect(page.getByRole('link', { name: COMPANY.email }).first()).toBeVisible();
  await page.getByRole('navigation', { name: 'Documenti legali' }).getByRole('link', { name: 'Cookie' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Cookie policy' })).toBeVisible();
  await expect(page.getByText(/XSRF-TOKEN/)).toBeVisible();
});

test('nessuna richiesta verso server esterni dalla landing', async ({ page }) => {
  const external: string[] = [];
  page.on('request', (r) => { const u = new URL(r.url()); if (!['localhost', '127.0.0.1'].includes(u.hostname) && u.protocol.startsWith('http')) external.push(u.hostname); });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  expect(external).toEqual([]);
});
