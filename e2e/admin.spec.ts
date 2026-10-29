import { expect, test, type Page } from '@playwright/test';
import { E2E_ADMIN } from './fixtures';

async function login(page: Page, password: string = E2E_ADMIN.password): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(E2E_ADMIN.email);
  await page.getByLabel('Password').fill(password);
  await page.locator('form').getByRole('button', { name: 'Accedi' }).click();
  if (password === E2E_ADMIN.password) await expect(page.getByRole('heading', { name: /Buongiorno/ })).toBeVisible();
}

test('login con password sbagliata: errore e nessun accesso', async ({ page }) => {
  await login(page, 'Password-Sbagliata-1');
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test('dashboard: indicatori, grafici e funnel', async ({ page }) => {
  await login(page);
  await expect(page.getByRole('heading', { name: /Buongiorno, Admin/ })).toBeVisible();
  await expect(page.getByText('Valore pipeline')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Lead per settimana' })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Lead per settimana' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Funnel lead' })).toBeVisible();
  // Il funnel porta alla pagina Lead filtrata
  await page.getByRole('link', { name: /Contattato/ }).click();
  await expect(page).toHaveURL(/\/admin\/lead\?stato=contattato/);
  await expect(page.getByText('Kebab Due')).toBeVisible();
  await expect(page.getByText('Pizzeria Uno')).toHaveCount(0);
});

test('pagina Lead: elenco', async ({ page }) => {
  await login(page);
  await page.goto('/admin/lead');
  await expect(page.getByText('Pizzeria Uno')).toBeVisible();
  await expect(page.getByText('Mario Rossi')).toBeVisible();
});

test('progetto: tipo e preventivo con totale', async ({ page }) => {
  await login(page);
  await page.goto('/admin/progetti');
  await page.getByText('Sito Kebab Prova').first().click();
  await page.getByRole('navigation', { name: 'Sezioni progetto' }).getByRole('link', { name: 'Preventivo' }).click();
  const quote = page.locator('cf-quote-editor');
  await expect(quote.getByRole('radiogroup', { name: 'Tipo di progetto' })).toBeVisible();
  await quote.getByRole('radio', { name: /Sito web \/ landing page/ }).click();
  await quote.getByRole('button', { name: '+ Aggiungi voce' }).click();
  await quote.getByRole('button', { name: '+ Aggiungi voce' }).click();
  await quote.getByLabel('Voce 1', { exact: true }).fill('Sito web');
  await quote.getByLabel('Prezzo voce 1').fill('400');
  await quote.getByLabel('Voce 2', { exact: true }).fill('Modulo contatti');
  await quote.getByLabel('Prezzo voce 2').fill('150');
  await quote.getByRole('button', { name: /Salva preventivo/ }).click();
  await expect(page.getByText(/Preventivo e scadenze di pagamento salvati/)).toBeVisible();
  await page.reload();
  await expect(page.locator('cf-quote-editor .financial-summary-bar .sum-item').first()).toContainText('550');
});
