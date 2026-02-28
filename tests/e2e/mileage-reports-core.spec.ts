import { test, expect } from '@playwright/test';

const PAGE_URL = process.env.REACT_APP_BACKEND_URL || 'https://secondhand-shop-25.preview.emergentagent.com';
const ADMIN_CODE = '4399';

test.describe('Admin Login and Mileage Reports', () => {
  test.beforeEach(async ({ page }) => {
    // Skip splash screen
    await page.addInitScript(() => {
      sessionStorage.setItem('hasSeenSplash', 'true');
    });
    
    // Dismiss any overlays or badges
    await page.addLocatorHandler(
      page.locator('[data-sonner-toast], .Toastify__toast'),
      async () => {
        const close = page.locator('[data-sonner-toast] [data-close], .Toastify__close-button');
        await close.first().click({ timeout: 2000 }).catch(() => {});
      },
      { times: 10, noWaitAfter: true }
    );
  });

  test('Admin login with code 4399 works and accesses dashboard', async ({ page }) => {
    await page.goto(`${PAGE_URL}/login`);
    await page.waitForLoadState('networkidle');
    
    // Fill in the admin code
    const emailInput = page.getByTestId('login-email');
    await expect(emailInput).toBeVisible({ timeout: 10000 });
    await emailInput.fill(ADMIN_CODE);
    
    // Click login
    await page.getByTestId('login-submit-btn').click();
    
    // Should redirect to admin dashboard
    await page.waitForURL(/\/admin/, { timeout: 15000 });
    
    // Reports section should be visible
    const reportsSection = page.getByTestId('reports-section');
    await expect(reportsSection).toBeVisible({ timeout: 10000 });
    
    // Screenshot
    await page.screenshot({ path: 'admin-dashboard-loaded.jpeg', quality: 20, fullPage: false });
  });

  test('Reports section has Mileage Log Report option', async ({ page }) => {
    // Login
    await page.goto(`${PAGE_URL}/login`);
    await page.waitForLoadState('networkidle');
    await page.getByTestId('login-email').fill(ADMIN_CODE);
    await page.getByTestId('login-submit-btn').click();
    await page.waitForURL(/\/admin/, { timeout: 15000 });
    
    // Expand Reports section
    await page.getByTestId('reports-toggle').click();
    
    // Should see Mileage Log Report option
    await expect(page.getByText('Mileage Log Report')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Monthly mileage entries and tax deductions')).toBeVisible();
    
    // Screenshot
    await page.screenshot({ path: 'reports-section-expanded.jpeg', quality: 20, fullPage: false });
  });

  test('Mileage Log Report preview shows correct table columns', async ({ page }) => {
    // Login and navigate
    await page.goto(`${PAGE_URL}/login`);
    await page.waitForLoadState('networkidle');
    await page.getByTestId('login-email').fill(ADMIN_CODE);
    await page.getByTestId('login-submit-btn').click();
    await page.waitForURL(/\/admin/, { timeout: 15000 });
    
    // Expand Reports section
    await page.getByTestId('reports-toggle').click();
    
    // Select Mileage Log Report
    await page.getByText('Mileage Log Report').click();
    
    // Set filter to Year
    await page.getByTestId('report-filter-type').click();
    await page.getByRole('option', { name: 'Year' }).click();
    
    // Select 2025 year (where we have test data)
    await page.locator('button:has-text("2026")').click();
    await page.getByRole('option', { name: '2025' }).click();
    
    // Preview
    await page.getByTestId('preview-report-btn').click();
    
    // Wait for preview - look for summary text
    await expect(page.getByText('Mileage Log Summary')).toBeVisible({ timeout: 15000 });
    
    // Scroll to make table visible
    await page.evaluate(() => window.scrollBy(0, 400));
    
    // Wait for entries to load - check for Monthly Entries header
    await expect(page.getByText('Monthly Entries')).toBeVisible({ timeout: 5000 });
    
    // Verify table headers exist - use th elements
    const monthHeader = page.locator('th:has-text("Month")').first();
    const yearHeader = page.locator('th:has-text("Year")').first();
    const milesHeader = page.locator('th:has-text("Miles")').first();
    const deductionHeader = page.locator('th:has-text("Deduction")').first();
    const notesHeader = page.locator('th:has-text("Notes")').first();
    
    await expect(monthHeader).toBeVisible({ timeout: 5000 });
    await expect(yearHeader).toBeVisible();
    await expect(milesHeader).toBeVisible();
    await expect(deductionHeader).toBeVisible();
    await expect(notesHeader).toBeVisible();
    
    // Verify IRS rate note
    await expect(page.getByText(/IRS standard mileage rates/i)).toBeVisible();
    
    // Screenshot of preview
    await page.screenshot({ path: 'mileage-report-preview.jpeg', quality: 20, fullPage: false });
  });

  test('CSV and PDF download buttons are enabled', async ({ page }) => {
    // Login
    await page.goto(`${PAGE_URL}/login`);
    await page.waitForLoadState('networkidle');
    await page.getByTestId('login-email').fill(ADMIN_CODE);
    await page.getByTestId('login-submit-btn').click();
    await page.waitForURL(/\/admin/, { timeout: 15000 });
    
    // Expand Reports section and select mileage
    await page.getByTestId('reports-toggle').click();
    await page.getByText('Mileage Log Report').click();
    
    // CSV button
    const csvBtn = page.getByTestId('download-csv-btn');
    await expect(csvBtn).toBeVisible();
    await expect(csvBtn).toBeEnabled();
    
    // PDF button
    const pdfBtn = page.getByTestId('download-pdf-btn');
    await expect(pdfBtn).toBeVisible();
    await expect(pdfBtn).toBeEnabled();
  });
});

test.describe('Monthly Mileage Section', () => {
  test.beforeEach(async ({ page }) => {
    // Skip splash screen
    await page.addInitScript(() => {
      sessionStorage.setItem('hasSeenSplash', 'true');
    });
    
    // Login
    await page.goto(`${PAGE_URL}/login`);
    await page.waitForLoadState('networkidle');
    await page.getByTestId('login-email').fill(ADMIN_CODE);
    await page.getByTestId('login-submit-btn').click();
    await page.waitForURL(/\/admin/, { timeout: 15000 });
  });

  test('Mileage Log section is visible on dashboard', async ({ page }) => {
    // Find the Mileage Log section
    await expect(page.getByText('Mileage Log')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Monthly business mileage for tax deductions')).toBeVisible();
  });

  test('Mileage Log section can be expanded', async ({ page }) => {
    // Click to expand
    await page.getByText('Mileage Log').first().click();
    
    // Should see yearly summary stats
    await expect(page.getByText(/Total Miles/i).first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Est. Tax Deduction/i).first()).toBeVisible();
    await expect(page.getByText(/IRS Rate/i)).toBeVisible();
    
    // Screenshot
    await page.screenshot({ path: 'mileage-section-expanded.jpeg', quality: 20, fullPage: false });
  });
});
