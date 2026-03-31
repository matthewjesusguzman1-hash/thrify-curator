import { test, expect } from '@playwright/test';
import { loginAsAdmin, dismissToasts, removeEmergentBadge } from '../fixtures/helpers';

/**
 * Vendoo CSV Import E2E Tests
 * Tests the Vendoo import modal in the Financials section
 */

const BASE_URL = process.env.REACT_APP_BACKEND_URL || 'https://curator-app-3.preview.emergentagent.com';

test.describe('Vendoo CSV Import Feature', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await loginAsAdmin(page);
    await removeEmergentBadge(page);
    await page.waitForTimeout(1000);
    
    // Navigate to Financials section
    await page.getByText('Operations & Reports').click();
    await page.waitForTimeout(2000);
    
    // Scroll to see the Import CSV button
    await page.evaluate(() => window.scrollBy(0, 500));
    await page.waitForTimeout(500);
  });

  test('should display Import CSV button in Sales Data section', async ({ page }) => {
    // Verify the Import CSV button is visible
    await expect(page.getByTestId('import-vendoo-btn')).toBeVisible();
    await expect(page.getByTestId('import-vendoo-btn')).toHaveText(/Import CSV/);
  });

  test('should open Vendoo Import modal when clicking Import CSV', async ({ page }) => {
    // Click Import CSV button
    await page.getByTestId('import-vendoo-btn').click();
    await page.waitForTimeout(500);
    
    // Verify modal is open
    await expect(page.getByText('Import Vendoo CSV')).toBeVisible();
    await expect(page.getByText('Upload your Vendoo sales export')).toBeVisible();
  });

  test('should display import instructions in modal', async ({ page }) => {
    await page.getByTestId('import-vendoo-btn').click();
    await page.waitForTimeout(500);
    
    // Verify instructions are displayed
    await expect(page.getByText('How to export from Vendoo:')).toBeVisible();
    await expect(page.getByText('Go to Inventory in Vendoo')).toBeVisible();
    await expect(page.getByText('Export to CSV')).toBeVisible();
    await expect(page.getByText('Platform Sold, Sold Date, Price Sold')).toBeVisible();
  });

  test('should display file drop zone', async ({ page }) => {
    await page.getByTestId('import-vendoo-btn').click();
    await page.waitForTimeout(500);
    
    // Verify file drop zone
    await expect(page.getByText('Drop CSV file here or click to browse')).toBeVisible();
    await expect(page.getByText('Vendoo export format')).toBeVisible();
  });

  test('should display import options checkboxes', async ({ page }) => {
    await page.getByTestId('import-vendoo-btn').click();
    await page.waitForTimeout(500);
    
    // Verify checkboxes
    await expect(page.getByText('Also import Cost of Goods (if available in CSV)')).toBeVisible();
    await expect(page.getByText('Import marketplace fees as expenses')).toBeVisible();
    
    // Verify checkboxes are unchecked by default
    const cogsCheckbox = page.locator('input[type="checkbox"]').first();
    const feesCheckbox = page.locator('input[type="checkbox"]').nth(1);
    await expect(cogsCheckbox).not.toBeChecked();
    await expect(feesCheckbox).not.toBeChecked();
  });

  test('should display Cancel and Import buttons', async ({ page }) => {
    await page.getByTestId('import-vendoo-btn').click();
    await page.waitForTimeout(500);
    
    // Verify buttons - use exact match for Import button in modal
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Import', exact: true })).toBeVisible();
  });

  test('should close modal when clicking Cancel', async ({ page }) => {
    await page.getByTestId('import-vendoo-btn').click();
    await page.waitForTimeout(500);
    
    // Verify modal is open
    await expect(page.getByText('Import Vendoo CSV')).toBeVisible();
    
    // Click Cancel
    await page.getByRole('button', { name: 'Cancel' }).click();
    await page.waitForTimeout(500);
    
    // Verify modal is closed
    await expect(page.getByText('Import Vendoo CSV')).not.toBeVisible();
  });

  test('should toggle COGS checkbox', async ({ page }) => {
    await page.getByTestId('import-vendoo-btn').click();
    await page.waitForTimeout(500);
    
    // Find and click COGS checkbox
    const cogsCheckbox = page.locator('input[type="checkbox"]').first();
    await expect(cogsCheckbox).not.toBeChecked();
    
    await cogsCheckbox.click();
    await expect(cogsCheckbox).toBeChecked();
    
    await cogsCheckbox.click();
    await expect(cogsCheckbox).not.toBeChecked();
  });

  test('should toggle fees checkbox', async ({ page }) => {
    await page.getByTestId('import-vendoo-btn').click();
    await page.waitForTimeout(500);
    
    // Find and click fees checkbox
    const feesCheckbox = page.locator('input[type="checkbox"]').nth(1);
    await expect(feesCheckbox).not.toBeChecked();
    
    await feesCheckbox.click();
    await expect(feesCheckbox).toBeChecked();
    
    await feesCheckbox.click();
    await expect(feesCheckbox).not.toBeChecked();
  });

  test('should have Import button disabled when no file selected', async ({ page }) => {
    await page.getByTestId('import-vendoo-btn').click();
    await page.waitForTimeout(500);
    
    // Verify Import button is disabled when no file is selected
    const importButton = page.getByRole('button', { name: 'Import', exact: true });
    await expect(importButton).toBeVisible();
    await expect(importButton).toBeDisabled();
  });

  test('should display year in modal description', async ({ page }) => {
    await page.getByTestId('import-vendoo-btn').click();
    await page.waitForTimeout(500);
    
    // The modal should show the currently selected year (2026)
    await expect(page.getByText(/income data for 2026/)).toBeVisible();
  });
});

test.describe('Vendoo Import API Integration', () => {
  test('should get Vendoo template information', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/financials/vendoo/template`);
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data.description).toBe('Vendoo CSV Export Format');
    expect(data.instructions).toBeDefined();
    expect(data.required_columns).toBeDefined();
    expect(data.supported_platforms).toContain('ebay');
    expect(data.supported_platforms).toContain('poshmark');
  });

  test('should reject non-CSV files', async ({ request }) => {
    const formData = new FormData();
    formData.append('file', new Blob(['not a csv'], { type: 'text/plain' }), 'test.txt');
    formData.append('year', '2098');
    formData.append('import_income', 'true');
    formData.append('import_cogs', 'false');
    formData.append('import_fees_as_expense', 'false');
    
    const response = await request.post(`${BASE_URL}/api/financials/vendoo/import`, {
      multipart: {
        file: {
          name: 'test.txt',
          mimeType: 'text/plain',
          buffer: Buffer.from('not a csv')
        },
        year: '2098',
        import_income: 'true',
        import_cogs: 'false',
        import_fees_as_expense: 'false'
      }
    });
    
    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.detail).toContain('CSV');
  });

  test('should import valid CSV with income only', async ({ request }) => {
    const csvContent = `Title,Platform Sold,Sold Date,Price Sold,Cost of Goods,Marketplace Fees
TEST_Item1,eBay,2090-01-15,100.00,20.00,10.00
TEST_Item2,Poshmark,2090-01-20,200.00,40.00,20.00`;
    
    const response = await request.post(`${BASE_URL}/api/financials/vendoo/import`, {
      multipart: {
        file: {
          name: 'test.csv',
          mimeType: 'text/csv',
          buffer: Buffer.from(csvContent)
        },
        year: '2090',
        import_income: 'true',
        import_cogs: 'false',
        import_fees_as_expense: 'false'
      }
    });
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.details.rows_processed).toBe(2);
    expect(data.details.income_entries_created).toBe(2);
    expect(data.details.cogs_entries_created).toBe(0);
    expect(data.details.fee_expenses_created).toBe(0);
    expect(data.details.total_sales).toBe(300);
    
    // Cleanup: Delete created income entries
    const incomeResponse = await request.get(`${BASE_URL}/api/financials/income/2090`);
    const incomeData = await incomeResponse.json();
    for (const entry of incomeData.entries) {
      await request.delete(`${BASE_URL}/api/financials/income/${entry.id}`);
    }
  });

  test('should import CSV with COGS', async ({ request }) => {
    const csvContent = `Title,Platform Sold,Sold Date,Price Sold,Cost of Goods,Marketplace Fees
TEST_Item1,eBay,2089-01-15,100.00,20.00,10.00
TEST_Item2,eBay,2089-01-20,200.00,40.00,20.00`;
    
    const response = await request.post(`${BASE_URL}/api/financials/vendoo/import`, {
      multipart: {
        file: {
          name: 'test.csv',
          mimeType: 'text/csv',
          buffer: Buffer.from(csvContent)
        },
        year: '2089',
        import_income: 'true',
        import_cogs: 'true',
        import_fees_as_expense: 'false'
      }
    });
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.details.cogs_entries_created).toBeGreaterThan(0);
    
    // Verify COGS was created
    const cogsResponse = await request.get(`${BASE_URL}/api/financials/cogs/2089`);
    const cogsData = await cogsResponse.json();
    expect(cogsData.total).toBe(60); // 20 + 40
    
    // Cleanup
    const incomeResponse = await request.get(`${BASE_URL}/api/financials/income/2089`);
    const incomeData = await incomeResponse.json();
    for (const entry of incomeData.entries) {
      await request.delete(`${BASE_URL}/api/financials/income/${entry.id}`);
    }
    for (const entry of cogsData.entries) {
      await request.delete(`${BASE_URL}/api/financials/cogs/${entry.id}`);
    }
  });

  test('should import CSV with fees as expenses', async ({ request }) => {
    const csvContent = `Title,Platform Sold,Sold Date,Price Sold,Cost of Goods,Marketplace Fees
TEST_Item1,eBay,2088-01-15,100.00,20.00,10.00
TEST_Item2,Poshmark,2088-01-20,200.00,40.00,25.00`;
    
    const response = await request.post(`${BASE_URL}/api/financials/vendoo/import`, {
      multipart: {
        file: {
          name: 'test.csv',
          mimeType: 'text/csv',
          buffer: Buffer.from(csvContent)
        },
        year: '2088',
        import_income: 'true',
        import_cogs: 'false',
        import_fees_as_expense: 'true'
      }
    });
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.details.fee_expenses_created).toBe(1);
    
    // Verify expense was created
    const expensesResponse = await request.get(`${BASE_URL}/api/financials/expenses/2088`);
    const expensesData = await expensesResponse.json();
    expect(expensesData.total).toBe(35); // 10 + 25
    
    // Cleanup
    const incomeResponse = await request.get(`${BASE_URL}/api/financials/income/2088`);
    const incomeData = await incomeResponse.json();
    for (const entry of incomeData.entries) {
      await request.delete(`${BASE_URL}/api/financials/income/${entry.id}`);
    }
    for (const entry of expensesData.entries) {
      await request.delete(`${BASE_URL}/api/financials/expenses/${entry.id}`);
    }
  });

  test('should filter by year correctly', async ({ request }) => {
    const csvContent = `Title,Platform Sold,Sold Date,Price Sold
TEST_Item1,eBay,2087-01-15,100.00
TEST_Item2,eBay,2086-01-20,200.00
TEST_Item3,eBay,2087-02-10,150.00`;
    
    const response = await request.post(`${BASE_URL}/api/financials/vendoo/import`, {
      multipart: {
        file: {
          name: 'test.csv',
          mimeType: 'text/csv',
          buffer: Buffer.from(csvContent)
        },
        year: '2087',
        import_income: 'true',
        import_cogs: 'false',
        import_fees_as_expense: 'false'
      }
    });
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.details.rows_processed).toBe(2); // Only 2087 rows
    expect(data.details.rows_skipped).toBe(1); // 2086 row skipped
    expect(data.details.total_sales).toBe(250); // 100 + 150
    
    // Cleanup
    const incomeResponse = await request.get(`${BASE_URL}/api/financials/income/2087`);
    const incomeData = await incomeResponse.json();
    for (const entry of incomeData.entries) {
      await request.delete(`${BASE_URL}/api/financials/income/${entry.id}`);
    }
  });
});
