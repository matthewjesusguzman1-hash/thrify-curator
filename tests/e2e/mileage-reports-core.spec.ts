import { test, expect } from '@playwright/test';

const PAGE_URL = process.env.REACT_APP_BACKEND_URL || 'https://secondhand-shop-25.preview.emergentagent.com';
const ADMIN_CODE = '4399';

test.describe('Admin Login and Reports Section', () => {
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
    await page.waitForLoadState('domcontentloaded');
    
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

  test('Reports section description shows "payroll/shift and W-9 reports" (no mileage)', async ({ page }) => {
    // Login
    await page.goto(`${PAGE_URL}/login`);
    await page.waitForLoadState('domcontentloaded');
    await page.getByTestId('login-email').fill(ADMIN_CODE);
    await page.getByTestId('login-submit-btn').click();
    await page.waitForURL(/\/admin/, { timeout: 15000 });
    
    // Verify Reports section description - mileage reference removed
    const reportsSection = page.getByTestId('reports-section');
    await expect(reportsSection).toBeVisible({ timeout: 10000 });
    await expect(reportsSection.getByText('Generate payroll/shift and W-9 reports')).toBeVisible();
  });

  test('Reports section only has Payroll/Shift and W-9 report options (no Mileage)', async ({ page }) => {
    // Login
    await page.goto(`${PAGE_URL}/login`);
    await page.waitForLoadState('domcontentloaded');
    await page.getByTestId('login-email').fill(ADMIN_CODE);
    await page.getByTestId('login-submit-btn').click();
    await page.waitForURL(/\/admin/, { timeout: 15000 });
    
    // Scroll to and expand Reports section
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.getByTestId('reports-toggle').click();
    
    // Should see Payroll/Shift Report option
    await expect(page.getByText('Payroll/Shift Report')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Clock in/out times, hours worked, and pay')).toBeVisible();
    
    // Should see W-9 Report option
    await expect(page.getByText('W-9 Report')).toBeVisible();
    await expect(page.getByText('Employee W-9 submission status')).toBeVisible();
    
    // Should NOT see Mileage Log Report option (removed)
    await expect(page.getByText('Mileage Log Report')).not.toBeVisible();
    
    // Screenshot
    await page.screenshot({ path: 'reports-section-options.jpeg', quality: 20, fullPage: false });
  });

  test('Year-to-Date Mileage Summary card appears in Reports section', async ({ page }) => {
    // Login
    await page.goto(`${PAGE_URL}/login`);
    await page.waitForLoadState('domcontentloaded');
    await page.getByTestId('login-email').fill(ADMIN_CODE);
    await page.getByTestId('login-submit-btn').click();
    await page.waitForURL(/\/admin/, { timeout: 15000 });
    
    // Scroll to Reports section
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    
    // Expand Reports section
    await page.getByTestId('reports-toggle').click();
    
    // YTD Mileage Summary card should be visible
    const ytdCard = page.getByTestId('mileage-ytd-card');
    await expect(ytdCard).toBeVisible({ timeout: 10000 });
    
    // Verify card title contains current year
    const currentYear = new Date().getFullYear();
    await expect(ytdCard.getByText(`${currentYear} Mileage Summary`)).toBeVisible();
    await expect(ytdCard.getByText('Year-to-Date for Tax Purposes')).toBeVisible();
    
    // Screenshot
    await page.screenshot({ path: 'ytd-mileage-card.jpeg', quality: 20, fullPage: false });
  });

  test('YTD Mileage Summary card shows Months Logged, Total Miles, and Est. Tax Deduction', async ({ page }) => {
    // Login
    await page.goto(`${PAGE_URL}/login`);
    await page.waitForLoadState('domcontentloaded');
    await page.getByTestId('login-email').fill(ADMIN_CODE);
    await page.getByTestId('login-submit-btn').click();
    await page.waitForURL(/\/admin/, { timeout: 15000 });
    
    // Scroll to Reports section
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    
    // Expand Reports section
    await page.getByTestId('reports-toggle').click();
    
    // Wait for YTD card to load
    const ytdCard = page.getByTestId('mileage-ytd-card');
    await expect(ytdCard).toBeVisible({ timeout: 10000 });
    
    // Verify the three metrics are displayed
    await expect(ytdCard.getByText('Months Logged')).toBeVisible();
    await expect(ytdCard.getByText('Total Miles')).toBeVisible();
    await expect(ytdCard.getByText('Est. Tax Deduction')).toBeVisible();
    
    // Verify IRS rate note is present
    await expect(ytdCard.getByText(/Using IRS rate/)).toBeVisible();
    await expect(ytdCard.getByText(/Log mileage in the "Mileage Log" section/)).toBeVisible();
  });

  test('CSV and PDF download buttons are enabled for Payroll/Shift Report', async ({ page }) => {
    // Login
    await page.goto(`${PAGE_URL}/login`);
    await page.waitForLoadState('domcontentloaded');
    await page.getByTestId('login-email').fill(ADMIN_CODE);
    await page.getByTestId('login-submit-btn').click();
    await page.waitForURL(/\/admin/, { timeout: 15000 });
    
    // Scroll to and expand Reports section
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.getByTestId('reports-toggle').click();
    
    // Payroll/Shift Report is selected by default
    await expect(page.getByText('Payroll/Shift Report')).toBeVisible({ timeout: 5000 });
    
    // CSV button should be visible and enabled
    const csvBtn = page.getByTestId('download-csv-btn');
    await expect(csvBtn).toBeVisible();
    await expect(csvBtn).toBeEnabled();
    
    // PDF button should be visible and enabled
    const pdfBtn = page.getByTestId('download-pdf-btn');
    await expect(pdfBtn).toBeVisible();
    await expect(pdfBtn).toBeEnabled();
  });
});

test.describe('Monthly Mileage Log Section', () => {
  test.beforeEach(async ({ page }) => {
    // Skip splash screen
    await page.addInitScript(() => {
      sessionStorage.setItem('hasSeenSplash', 'true');
    });
    
    // Login
    await page.goto(`${PAGE_URL}/login`);
    await page.waitForLoadState('domcontentloaded');
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
