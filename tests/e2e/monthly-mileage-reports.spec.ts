import { test, expect } from '@playwright/test';

const PAGE_URL = process.env.REACT_APP_BACKEND_URL || 'https://secondhand-shop-25.preview.emergentagent.com';
const ADMIN_CODE = '4399';

test.describe('Monthly Mileage Reports - Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Dismiss any overlays or badges
    await page.addLocatorHandler(
      page.locator('[data-sonner-toast], .Toastify__toast, [role="status"].toast, .MuiSnackbar-root'),
      async () => {
        const close = page.locator('[data-sonner-toast] [data-close], [data-sonner-toast] button[aria-label="Close"], .Toastify__close-button, .MuiSnackbar-root button');
        await close.first().click({ timeout: 2000 }).catch(() => {});
      },
      { times: 10, noWaitAfter: true }
    );
  });

  test('Admin login with code 4399 works correctly', async ({ page }) => {
    await page.goto(`${PAGE_URL}/auth`);
    await page.waitForLoadState('domcontentloaded');
    
    // Fill in the admin code
    const emailInput = page.getByTestId('login-email');
    await expect(emailInput).toBeVisible();
    await emailInput.fill(ADMIN_CODE);
    
    // Click login button
    const loginBtn = page.getByTestId('login-submit-btn');
    await loginBtn.click();
    
    // Should redirect to admin dashboard
    await page.waitForURL(/\/admin/, { timeout: 15000 });
    
    // Should see the dashboard
    await expect(page).toHaveURL(/\/admin/);
  });

  test('Reports section is visible and expandable', async ({ page }) => {
    // Login first
    await page.goto(`${PAGE_URL}/auth`);
    await page.waitForLoadState('domcontentloaded');
    await page.getByTestId('login-email').fill(ADMIN_CODE);
    await page.getByTestId('login-submit-btn').click();
    await page.waitForURL(/\/admin/, { timeout: 15000 });
    
    // Find the Reports section
    const reportsSection = page.getByTestId('reports-section');
    await expect(reportsSection).toBeVisible({ timeout: 10000 });
    
    // Expand the Reports section
    const reportsToggle = page.getByTestId('reports-toggle');
    await reportsToggle.click();
    
    // Should see report type options
    await expect(page.getByText('Payroll/Shift Report')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Mileage Log Report')).toBeVisible();
    await expect(page.getByText('W-9 Report')).toBeVisible();
  });

  test('Mileage Log Report option is selectable', async ({ page }) => {
    // Login and navigate
    await page.goto(`${PAGE_URL}/auth`);
    await page.waitForLoadState('domcontentloaded');
    await page.getByTestId('login-email').fill(ADMIN_CODE);
    await page.getByTestId('login-submit-btn').click();
    await page.waitForURL(/\/admin/, { timeout: 15000 });
    
    // Expand Reports section
    const reportsToggle = page.getByTestId('reports-toggle');
    await reportsToggle.click();
    await page.waitForLoadState('domcontentloaded');
    
    // Click on Mileage Log Report
    await page.getByText('Mileage Log Report').click();
    
    // Should see Mileage-related description
    await expect(page.getByText('Monthly mileage entries and tax deductions')).toBeVisible();
  });

  test('Mileage report preview shows correct columns', async ({ page }) => {
    // Login and navigate
    await page.goto(`${PAGE_URL}/auth`);
    await page.waitForLoadState('domcontentloaded');
    await page.getByTestId('login-email').fill(ADMIN_CODE);
    await page.getByTestId('login-submit-btn').click();
    await page.waitForURL(/\/admin/, { timeout: 15000 });
    
    // Expand Reports section and select mileage
    await page.getByTestId('reports-toggle').click();
    await page.getByText('Mileage Log Report').click();
    
    // Select Year filter
    await page.getByTestId('report-filter-type').click();
    await page.getByText('Year', { exact: true }).click();
    
    // Click Preview Report
    await page.getByTestId('preview-report-btn').click();
    
    // Wait for the preview to load - should see Mileage Log Summary
    await expect(page.getByText('Mileage Log Summary')).toBeVisible({ timeout: 10000 });
    
    // Verify the table has correct columns: Month, Year, Miles, Deduction, Notes
    await expect(page.getByRole('columnheader', { name: 'Month' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Year' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Miles' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Deduction' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Notes' })).toBeVisible();
  });

  test('Mileage report shows summary stats', async ({ page }) => {
    // Login and navigate
    await page.goto(`${PAGE_URL}/auth`);
    await page.waitForLoadState('domcontentloaded');
    await page.getByTestId('login-email').fill(ADMIN_CODE);
    await page.getByTestId('login-submit-btn').click();
    await page.waitForURL(/\/admin/, { timeout: 15000 });
    
    // Expand Reports section and select mileage
    await page.getByTestId('reports-toggle').click();
    await page.getByText('Mileage Log Report').click();
    
    // Set year filter
    await page.getByTestId('report-filter-type').click();
    await page.getByText('Year', { exact: true }).click();
    
    // Preview
    await page.getByTestId('preview-report-btn').click();
    
    // Wait for summary to load
    await expect(page.getByText('Mileage Log Summary')).toBeVisible({ timeout: 10000 });
    
    // Should show summary metrics
    await expect(page.getByText('Months Logged')).toBeVisible();
    await expect(page.getByText('Total Miles')).toBeVisible();
    await expect(page.getByText('Est. Tax Deduction')).toBeVisible();
  });

  test('CSV download button is available for mileage report', async ({ page }) => {
    // Login and navigate
    await page.goto(`${PAGE_URL}/auth`);
    await page.waitForLoadState('domcontentloaded');
    await page.getByTestId('login-email').fill(ADMIN_CODE);
    await page.getByTestId('login-submit-btn').click();
    await page.waitForURL(/\/admin/, { timeout: 15000 });
    
    // Expand Reports section and select mileage
    await page.getByTestId('reports-toggle').click();
    await page.getByText('Mileage Log Report').click();
    
    // CSV download button should be visible
    const csvBtn = page.getByTestId('download-csv-btn');
    await expect(csvBtn).toBeVisible();
    await expect(csvBtn).toBeEnabled();
  });

  test('PDF download button is available for mileage report', async ({ page }) => {
    // Login and navigate
    await page.goto(`${PAGE_URL}/auth`);
    await page.waitForLoadState('domcontentloaded');
    await page.getByTestId('login-email').fill(ADMIN_CODE);
    await page.getByTestId('login-submit-btn').click();
    await page.waitForURL(/\/admin/, { timeout: 15000 });
    
    // Expand Reports section and select mileage
    await page.getByTestId('reports-toggle').click();
    await page.getByText('Mileage Log Report').click();
    
    // PDF download button should be visible
    const pdfBtn = page.getByTestId('download-pdf-btn');
    await expect(pdfBtn).toBeVisible();
    await expect(pdfBtn).toBeEnabled();
  });

  test('IRS rate note is displayed in mileage report preview', async ({ page }) => {
    // Login and navigate
    await page.goto(`${PAGE_URL}/auth`);
    await page.waitForLoadState('domcontentloaded');
    await page.getByTestId('login-email').fill(ADMIN_CODE);
    await page.getByTestId('login-submit-btn').click();
    await page.waitForURL(/\/admin/, { timeout: 15000 });
    
    // Expand Reports section and select mileage
    await page.getByTestId('reports-toggle').click();
    await page.getByText('Mileage Log Report').click();
    
    // Set year filter
    await page.getByTestId('report-filter-type').click();
    await page.getByText('Year', { exact: true }).click();
    
    // Preview
    await page.getByTestId('preview-report-btn').click();
    
    // Wait for preview
    await expect(page.getByText('Mileage Log Summary')).toBeVisible({ timeout: 10000 });
    
    // Should show IRS rate note
    await expect(page.getByText(/IRS standard mileage rates/i)).toBeVisible();
  });
});

test.describe('Monthly Mileage Section - Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto(`${PAGE_URL}/auth`);
    await page.waitForLoadState('domcontentloaded');
    await page.getByTestId('login-email').fill(ADMIN_CODE);
    await page.getByTestId('login-submit-btn').click();
    await page.waitForURL(/\/admin/, { timeout: 15000 });
  });

  test('Mileage Log section is visible', async ({ page }) => {
    // Find the Mileage Log section
    await expect(page.getByText('Mileage Log')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Monthly business mileage for tax deductions')).toBeVisible();
  });

  test('Mileage Log section can be expanded', async ({ page }) => {
    // Click to expand
    await page.getByText('Mileage Log').first().click();
    
    // Should see yearly summary cards
    await expect(page.getByText(/Total Miles/i).first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Est. Tax Deduction/i).first()).toBeVisible();
    await expect(page.getByText(/IRS Rate/i)).toBeVisible();
  });

  test('Mileage Log shows monthly grid', async ({ page }) => {
    // Expand section
    await page.getByText('Mileage Log').first().click();
    
    // Should see month names in the grid
    await expect(page.getByText('January').first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('February').first()).toBeVisible();
    await expect(page.getByText('March').first()).toBeVisible();
  });

  test('Add Entry button opens modal', async ({ page }) => {
    // Expand section
    await page.getByText('Mileage Log').first().click();
    
    // Click Add Entry
    await page.getByRole('button', { name: /Add Entry/i }).click();
    
    // Modal should be visible with form fields
    await expect(page.getByText(/Monthly Mileage/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Total Miles')).toBeVisible();
    await expect(page.getByText('Notes (optional)')).toBeVisible();
  });
});
