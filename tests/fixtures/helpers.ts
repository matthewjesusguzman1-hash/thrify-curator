import { Page, expect } from '@playwright/test';

export async function waitForAppReady(page: Page) {
  await page.waitForLoadState('domcontentloaded');
}

export async function dismissToasts(page: Page) {
  await page.addLocatorHandler(
    page.locator('[data-sonner-toast], .Toastify__toast, [role="status"].toast, .MuiSnackbar-root'),
    async () => {
      const close = page.locator('[data-sonner-toast] [data-close], [data-sonner-toast] button[aria-label="Close"], .Toastify__close-button, .MuiSnackbar-root button');
      await close.first().click({ timeout: 2000 }).catch(() => {});
    },
    { times: 10, noWaitAfter: true }
  );
}

export async function checkForErrors(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const errorElements = Array.from(
      document.querySelectorAll('.error, [class*="error"], [id*="error"]')
    );
    return errorElements.map(el => el.textContent || '').filter(Boolean);
  });
}

export async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');
  // Step 1: Enter email
  await page.fill('input[placeholder="your@email.com"]', 'matthewjesusguzman1@gmail.com');
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.waitForTimeout(2000);
  // Step 2: Enter access code
  await page.fill('input[placeholder="4-digit code"]', '4399');
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page.getByTestId('admin-dashboard')).toBeVisible({ timeout: 15000 });
}

export async function loginAsEmployee(page: Page, email: string, password?: string) {
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');
  // Step 1: Enter email
  await page.fill('input[placeholder="your@email.com"]', email);
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.waitForTimeout(2000);
  // Step 2: Enter password if provided
  if (password) {
    await page.fill('input[type="password"]', password);
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: 'Sign In' }).click();
  }
}

export async function logout(page: Page) {
  await page.getByTestId('logout-btn').click();
  await expect(page.getByTestId('auth-page')).toBeVisible({ timeout: 10000 });
}

export async function removeEmergentBadge(page: Page) {
  await page.evaluate(() => {
    const badge = document.querySelector('[class*="emergent"], [id*="emergent-badge"]');
    if (badge) badge.remove();
  });
}

export async function skipSplashScreen(page: Page) {
  await page.evaluate(() => {
    sessionStorage.setItem('hasSeenSplash', 'true');
  });
}
