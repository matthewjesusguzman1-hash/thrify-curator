import { test, expect } from '@playwright/test';

const PAGE_URL = process.env.REACT_APP_BACKEND_URL || 'https://resale-magic-link.preview.emergentagent.com';
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
  });

  test('Reports section description shows "payroll/shift and W-9 reports"', async ({ page }) => {
    // Login
    await page.goto(`${PAGE_URL}/login`);
    await page.waitForLoadState('domcontentloaded');
    await page.getByTestId('login-email').fill(ADMIN_CODE);
    await page.getByTestId('login-submit-btn').click();
    await page.waitForURL(/\/admin/, { timeout: 15000 });
    
    // Verify Reports section description
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
    
    // Should see W-9 Report option - use role button to be specific
    await expect(page.getByRole('button', { name: /W-9 Report/ })).toBeVisible();
    await expect(page.getByText('Employee W-9 submission status')).toBeVisible();
    
    // Should NOT see Mileage Log Report option (removed)
    await expect(page.getByText('Mileage Log Report')).not.toBeVisible();
  });

  test('Reports section no longer has YTD Mileage Summary card (moved to Mileage Log)', async ({ page }) => {
    // Login
    await page.goto(`${PAGE_URL}/login`);
    await page.waitForLoadState('domcontentloaded');
    await page.getByTestId('login-email').fill(ADMIN_CODE);
    await page.getByTestId('login-submit-btn').click();
    await page.waitForURL(/\/admin/, { timeout: 15000 });
    
    // Scroll to Reports section and expand
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.getByTestId('reports-toggle').click();
    
    // Wait for expansion
    await expect(page.getByText('Payroll/Shift Report')).toBeVisible({ timeout: 5000 });
    
    // Verify NO mileage-ytd-card exists in Reports section
    const reportsSection = page.getByTestId('reports-section');
    const ytdCardInReports = reportsSection.getByTestId('mileage-ytd-card');
    await expect(ytdCardInReports).not.toBeVisible();
    
    // Reports section should start with Report Type selector
    await expect(reportsSection.getByText('Report Type')).toBeVisible();
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

test.describe('Monthly Mileage Log Section - Blue Gradient Summary Card', () => {
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

  test('Mileage Log section expands to show blue gradient summary card', async ({ page }) => {
    // Scroll to and click to expand
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.getByText('Mileage Log').first().click();
    
    // Wait for the mileage-ytd-card to be visible
    const ytdCard = page.getByTestId('mileage-ytd-card');
    await expect(ytdCard).toBeVisible({ timeout: 10000 });
    
    // Verify the card title contains current year
    const currentYear = new Date().getFullYear();
    await expect(ytdCard.getByText(`${currentYear} Mileage Summary`)).toBeVisible();
    await expect(ytdCard.getByText('Year-to-Date for Tax Purposes')).toBeVisible();
  });

  test('Blue gradient summary card shows Months Logged, Total Miles, and Est. Tax Deduction', async ({ page }) => {
    // Scroll to and expand Mileage Log
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.getByText('Mileage Log').first().click();
    
    // Wait for YTD card
    const ytdCard = page.getByTestId('mileage-ytd-card');
    await expect(ytdCard).toBeVisible({ timeout: 10000 });
    
    // Verify the three metrics are displayed
    await expect(ytdCard.getByText('Months Logged')).toBeVisible();
    await expect(ytdCard.getByText('Total Miles')).toBeVisible();
    await expect(ytdCard.getByText('Est. Tax Deduction')).toBeVisible();
  });

  test('Blue gradient summary card shows IRS rate at bottom', async ({ page }) => {
    // Scroll to and expand Mileage Log
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.getByText('Mileage Log').first().click();
    
    // Wait for YTD card
    const ytdCard = page.getByTestId('mileage-ytd-card');
    await expect(ytdCard).toBeVisible({ timeout: 10000 });
    
    // Verify IRS rate note is present
    await expect(ytdCard.getByText(/Using IRS rate/)).toBeVisible();
  });

  test('Mileage Log section shows monthly entries grid', async ({ page }) => {
    // Scroll to and expand
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.getByText('Mileage Log').first().click();
    
    // Wait for section to expand
    const ytdCard = page.getByTestId('mileage-ytd-card');
    await expect(ytdCard).toBeVisible({ timeout: 10000 });
    
    // Verify monthly entries grid - should see month names
    await expect(page.getByText('January')).toBeVisible();
    await expect(page.getByText('February')).toBeVisible();
    await expect(page.getByText('March')).toBeVisible();
  });

  test('Add Entry button is visible and clickable in Mileage Log section', async ({ page }) => {
    // Scroll to and expand
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.getByText('Mileage Log').first().click();
    
    // Wait for section to expand
    const ytdCard = page.getByTestId('mileage-ytd-card');
    await expect(ytdCard).toBeVisible({ timeout: 10000 });
    
    // Find Add Entry button within the Mileage Log context (use .nth(1) as it's the second Add Entry on page)
    const addEntryBtn = page.getByRole('button', { name: /Add Entry/ }).nth(1);
    await expect(addEntryBtn).toBeVisible();
    
    // Click Add Entry button
    await addEntryBtn.click();
    
    // Modal should appear with "Add Monthly Mileage" title
    await expect(page.getByText('Add Monthly Mileage')).toBeVisible({ timeout: 5000 });
  });
});
