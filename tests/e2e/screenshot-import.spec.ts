import { test, expect } from '@playwright/test';
import { loginAsAdmin, dismissToasts, removeEmergentBadge } from '../fixtures/helpers';

/**
 * Screenshot Import E2E Tests
 * Tests the AI-powered Screenshot Import feature in the Financials section
 * Feature: Scan screenshots of Vendoo Analytics or platform dashboards to extract financial data
 */

const BASE_URL = process.env.REACT_APP_BACKEND_URL || 'https://curator-app-3.preview.emergentagent.com';

test.describe('Screenshot Import Feature', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await loginAsAdmin(page);
    await removeEmergentBadge(page);
    await page.waitForTimeout(1000);
    
    // Navigate to Financials section via Operations & Reports
    await page.getByText('Operations & Reports').click();
    await page.waitForTimeout(2000);
    
    // Scroll to see the Financials section
    await page.evaluate(() => window.scrollBy(0, 300));
    await page.waitForTimeout(500);
  });

  test('should display Financials section in Operations & Reports', async ({ page }) => {
    // Verify Financials section is visible - use heading role for exact match
    await expect(page.getByRole('heading', { name: 'Financials' })).toBeVisible();
    await expect(page.getByTestId('financials-summary-cards')).toBeVisible();
    
    // Verify summary cards are displayed
    await expect(page.getByTestId('gross-sales-card')).toBeVisible();
    await expect(page.getByText('Gross Sales').first()).toBeVisible();
    await expect(page.getByText('COGS').first()).toBeVisible();
    await expect(page.getByText('Deductions').first()).toBeVisible();
    await expect(page.getByText('Net Profit').first()).toBeVisible();
  });

  test('should display Scan button in Sales Data section', async ({ page }) => {
    // Verify the Scan button is visible
    await expect(page.getByTestId('screenshot-import-btn')).toBeVisible();
    await expect(page.getByTestId('screenshot-import-btn')).toHaveText(/Scan/);
  });

  test('should display Add and Manage buttons in Sales Data section', async ({ page }) => {
    // Verify Add Income button
    await expect(page.getByTestId('add-income-btn')).toBeVisible();
    await expect(page.getByTestId('add-income-btn')).toHaveText(/Add/);
    
    // Verify Manage Data button
    await expect(page.getByTestId('manage-data-btn')).toBeVisible();
    await expect(page.getByTestId('manage-data-btn')).toHaveText(/Manage/);
  });

  test('should open Screenshot Import modal when clicking Scan button', async ({ page }) => {
    // Click Scan button
    await page.getByTestId('screenshot-import-btn').click();
    await page.waitForTimeout(500);
    
    // Verify modal is open
    await expect(page.getByText('Scan Screenshot')).toBeVisible();
    await expect(page.getByText('Scan your Vendoo Analytics or platform dashboard')).toBeVisible();
  });

  test('should display Take Photo and Choose File buttons in Screenshot Import modal', async ({ page }) => {
    // Click Scan button
    await page.getByTestId('screenshot-import-btn').click();
    await page.waitForTimeout(500);
    
    // Verify Take Photo button
    await expect(page.getByText('Take Photo')).toBeVisible();
    
    // Verify Choose File button
    await expect(page.getByText('Choose File')).toBeVisible();
  });

  test('should close Screenshot Import modal when clicking close button', async ({ page }) => {
    // Click Scan button
    await page.getByTestId('screenshot-import-btn').click();
    await page.waitForTimeout(500);
    
    // Verify modal is open
    await expect(page.getByText('Scan Screenshot')).toBeVisible();
    
    // Click close button (X)
    await page.locator('button:has-text("✕")').first().click();
    await page.waitForTimeout(500);
    
    // Verify modal is closed
    await expect(page.getByText('Scan Screenshot')).not.toBeVisible();
  });

  test('should close Screenshot Import modal when clicking Cancel button', async ({ page }) => {
    // Click Scan button
    await page.getByTestId('screenshot-import-btn').click();
    await page.waitForTimeout(500);
    
    // Verify modal is open
    await expect(page.getByText('Scan Screenshot')).toBeVisible();
    
    // Click Cancel button
    await page.getByRole('button', { name: 'Cancel' }).click();
    await page.waitForTimeout(500);
    
    // Verify modal is closed
    await expect(page.getByText('Scan Screenshot')).not.toBeVisible();
  });

  test('should open Add Income modal when clicking Add button', async ({ page }) => {
    // Click Add button
    await page.getByTestId('add-income-btn').click();
    await page.waitForTimeout(500);
    
    // Verify modal is open
    await expect(page.getByText('Add Sales Income')).toBeVisible();
    await expect(page.getByText('Enter your monthly sales total')).toBeVisible();
  });

  test('should display platform dropdown in Add Income modal', async ({ page }) => {
    // Click Add button
    await page.getByTestId('add-income-btn').click();
    await page.waitForTimeout(500);
    
    // Verify platform dropdown - use exact match
    await expect(page.getByText('Platform', { exact: true })).toBeVisible();
    
    // Check for platform options
    const platformSelect = page.locator('select').first();
    await expect(platformSelect).toBeVisible();
    
    // Verify some platform options exist
    await expect(page.locator('option:has-text("eBay")')).toBeAttached();
    await expect(page.locator('option:has-text("Poshmark")')).toBeAttached();
    await expect(page.locator('option:has-text("Mercari")')).toBeAttached();
  });

  test('should display month dropdown in Add Income modal', async ({ page }) => {
    // Click Add button
    await page.getByTestId('add-income-btn').click();
    await page.waitForTimeout(500);
    
    // Verify month dropdown - use exact match
    await expect(page.getByText('Month', { exact: true }).first()).toBeVisible();
    
    // Check for month options
    await expect(page.locator('option:has-text("January")')).toBeAttached();
    await expect(page.locator('option:has-text("December")')).toBeAttached();
  });

  test('should display amount input in Add Income modal', async ({ page }) => {
    // Click Add button
    await page.getByTestId('add-income-btn').click();
    await page.waitForTimeout(500);
    
    // Verify amount input
    await expect(page.getByText('Total Sales Amount')).toBeVisible();
    await expect(page.locator('input[type="number"]').first()).toBeVisible();
  });

  test('should display 1099 checkbox in Add Income modal', async ({ page }) => {
    // Click Add button
    await page.getByTestId('add-income-btn').click();
    await page.waitForTimeout(500);
    
    // Verify 1099 checkbox
    await expect(page.getByText('This is from a 1099 form')).toBeVisible();
    
    // Verify checkbox is unchecked by default
    const checkbox = page.locator('input[type="checkbox"]').first();
    await expect(checkbox).not.toBeChecked();
  });

  test('should close Add Income modal when clicking Cancel', async ({ page }) => {
    // Click Add button
    await page.getByTestId('add-income-btn').click();
    await page.waitForTimeout(500);
    
    // Verify modal is open
    await expect(page.getByText('Add Sales Income')).toBeVisible();
    
    // Click Cancel
    await page.getByRole('button', { name: 'Cancel' }).click();
    await page.waitForTimeout(500);
    
    // Verify modal is closed
    await expect(page.getByText('Add Sales Income')).not.toBeVisible();
  });

  test('should save income entry via Add Income modal', async ({ page }) => {
    // Click Add button
    await page.getByTestId('add-income-btn').click();
    await page.waitForTimeout(500);
    
    // Select month - use a test month
    const monthSelect = page.locator('select').nth(1);
    await monthSelect.selectOption('01'); // January
    
    // Enter amount
    const amountInput = page.locator('input[type="number"]').first();
    await amountInput.fill('1234.56');
    
    // Add notes
    const notesInput = page.locator('input[placeholder*="From Vendoo"]');
    await notesInput.fill('TEST_screenshot_import_spec');
    
    // Click Add Income button
    await page.getByRole('button', { name: 'Add Income' }).click();
    await page.waitForTimeout(2000);
    
    // Modal should close on success
    await expect(page.getByText('Add Sales Income')).not.toBeVisible();
  });

  test('should open Manage Data modal when clicking Manage button', async ({ page }) => {
    // Click Manage button
    await page.getByTestId('manage-data-btn').click();
    await page.waitForTimeout(500);
    
    // Verify modal is open
    await expect(page.getByText('Manage Data')).toBeVisible();
    
    // Verify tabs are displayed
    await expect(page.getByRole('button', { name: /Income/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /COGS/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Expenses/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Mileage/ })).toBeVisible();
  });

  test('should close Manage Data modal when clicking Done', async ({ page }) => {
    // Click Manage button
    await page.getByTestId('manage-data-btn').click();
    await page.waitForTimeout(500);
    
    // Verify modal is open
    await expect(page.getByText('Manage Data')).toBeVisible();
    
    // Click Done
    await page.getByRole('button', { name: 'Done' }).click();
    await page.waitForTimeout(500);
    
    // Verify modal is closed
    await expect(page.getByText('Manage Data')).not.toBeVisible();
  });

  test('should expand Sales Data section when clicked', async ({ page }) => {
    // Click on Sales Data section header
    await page.locator('button:has-text("Sales Data")').click();
    await page.waitForTimeout(500);
    
    // Verify expanded content is visible
    await expect(page.getByText('1099 Income')).toBeVisible();
    await expect(page.getByText('Other Income')).toBeVisible();
    await expect(page.getByText('Total Income')).toBeVisible();
  });

  test('should display Import from Vendoo CSV button in expanded Sales Data section', async ({ page }) => {
    // Click on Sales Data section header
    await page.locator('button:has-text("Sales Data")').click();
    await page.waitForTimeout(500);
    
    // Verify Vendoo CSV import button
    await expect(page.getByText('Import from Vendoo CSV (Advanced)')).toBeVisible();
  });
});

test.describe('Screenshot Import API Tests', () => {
  test('should return proper structure from screenshot analyze endpoint', async ({ request }) => {
    // Test that the endpoint exists and returns proper error for missing file
    const response = await request.post(`${BASE_URL}/api/financials/screenshot/analyze`, {
      multipart: {}
    });
    
    // Should return 422 for missing file (validation error)
    expect(response.status()).toBe(422);
  });

  test('should reject non-image files', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/financials/screenshot/analyze`, {
      multipart: {
        file: {
          name: 'test.txt',
          mimeType: 'text/plain',
          buffer: Buffer.from('This is not an image')
        }
      }
    });
    
    expect(response.status()).toBe(400);
  });
});

test.describe('Income API Integration Tests', () => {
  const testYear = 2098; // Use a test year to avoid conflicts
  let createdIncomeId: string | null = null;

  test.afterEach(async ({ request }) => {
    // Cleanup created income entry
    if (createdIncomeId) {
      await request.delete(`${BASE_URL}/api/financials/income/${createdIncomeId}`);
      createdIncomeId = null;
    }
  });

  test('should create income entry via API', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/financials/income`, {
      data: {
        year: testYear,
        platform: 'ebay',
        amount: 999.99,
        is_1099: false,
        date_received: `${testYear}-01-15`,
        notes: 'TEST_playwright_income_entry'
      }
    });
    
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.message).toBe('Income entry created');
    expect(data.entry).toBeDefined();
    expect(data.entry.amount).toBe(999.99);
    expect(data.entry.platform).toBe('ebay');
    
    createdIncomeId = data.entry.id;
  });

  test('should get income entries for year via API', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/financials/income/${testYear}`);
    
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.entries).toBeDefined();
    expect(Array.isArray(data.entries)).toBe(true);
    expect(data.total_1099).toBeDefined();
    expect(data.total_other).toBeDefined();
    expect(data.total).toBeDefined();
  });

  test('should get financial summary for year via API', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/financials/summary/${testYear}`);
    
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.year).toBe(testYear);
    expect(data.income).toBeDefined();
    expect(data.cogs).toBeDefined();
    expect(data.gross_profit).toBeDefined();
    expect(data.deductions).toBeDefined();
    expect(data.net_profit).toBeDefined();
  });
});
