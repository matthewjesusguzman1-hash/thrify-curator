import { test, expect } from '@playwright/test';

const PAGE_URL = process.env.REACT_APP_BACKEND_URL || 'https://secondhand-shop-25.preview.emergentagent.com';
const ADMIN_CODE = '4399';

test.describe('Admin Login and Reports Access', () => {
  test('Admin login with code 4399 works and accesses reports', async ({ page }) => {
    await page.goto(`${PAGE_URL}/auth`);
    await page.waitForLoadState('domcontentloaded');
    
    // Fill in the admin code
    const emailInput = page.getByTestId('login-email');
    await expect(emailInput).toBeVisible();
    await emailInput.fill(ADMIN_CODE);
    
    // Click login
    await page.getByTestId('login-submit-btn').click();
    
    // Should redirect to admin dashboard
    await page.waitForURL(/\/admin/, { timeout: 15000 });
    
    // Reports section should be visible
    const reportsSection = page.getByTestId('reports-section');
    await expect(reportsSection).toBeVisible({ timeout: 10000 });
    
    // Screenshot
    await page.screenshot({ path: 'admin-dashboard.jpeg', quality: 20, fullPage: false });
  });

  test('Mileage Log Report option shows correct table columns', async ({ page }) => {
    // Login
    await page.goto(`${PAGE_URL}/auth`);
    await page.waitForLoadState('domcontentloaded');
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
    
    // Preview
    await page.getByTestId('preview-report-btn').click();
    
    // Wait for preview
    await expect(page.getByText('Mileage Log Summary')).toBeVisible({ timeout: 15000 });
    
    // Verify columns
    const table = page.locator('table').first();
    await expect(table.getByRole('columnheader', { name: 'Month' })).toBeVisible();
    await expect(table.getByRole('columnheader', { name: 'Year' })).toBeVisible();
    await expect(table.getByRole('columnheader', { name: 'Miles' })).toBeVisible();
    
    // Screenshot of report
    await page.screenshot({ path: 'mileage-report-preview.jpeg', quality: 20, fullPage: false });
  });

  test('CSV and PDF download buttons are enabled for mileage reports', async ({ page }) => {
    // Login
    await page.goto(`${PAGE_URL}/auth`);
    await page.waitForLoadState('domcontentloaded');
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
