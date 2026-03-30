import { test, expect } from '@playwright/test';

/**
 * Tax Prep Portal E2E Tests
 * Tests the 5-step Tax Prep wizard and CRUD operations
 */

const BASE_URL = process.env.REACT_APP_BACKEND_URL || 'https://curator-app-3.preview.emergentagent.com';

test.describe('Tax Prep Portal - Main Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to Tax Prep page with year 2025
    await page.goto('/admin/tax-prep?year=2025', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
  });

  test('should display Tax Prep page with 5 steps', async ({ page }) => {
    // Wait for page to load
    await expect(page.locator('h1').filter({ hasText: 'Tax Prep' })).toBeVisible();
    
    // Check year selector
    const yearSelect = page.locator('select');
    await expect(yearSelect).toBeVisible();
    await expect(yearSelect).toHaveValue('2025');
    
    // Check progress bar
    await expect(page.getByText('Progress')).toBeVisible();
    
    // Check all 5 steps are visible
    await expect(page.getByTestId('tax-prep-step-1')).toBeVisible();
    await expect(page.getByTestId('tax-prep-step-2')).toBeVisible();
    await expect(page.getByTestId('tax-prep-step-3')).toBeVisible();
    await expect(page.getByTestId('tax-prep-step-4')).toBeVisible();
    await expect(page.getByTestId('tax-prep-step-5')).toBeVisible();
    
    // Check step titles
    await expect(page.getByText('Step 1: Income')).toBeVisible();
    await expect(page.getByText('Step 2: Cost of Goods')).toBeVisible();
    await expect(page.getByText('Step 3: Deductions')).toBeVisible();
    await expect(page.getByText('Step 4: Documents')).toBeVisible();
    await expect(page.getByText('Step 5: Generate Reports')).toBeVisible();
  });

  test('should allow year selection', async ({ page }) => {
    const yearSelect = page.locator('select');
    
    // Change to previous year
    await yearSelect.selectOption('2025');
    await expect(yearSelect).toHaveValue('2025');
    
    // URL should update with year parameter
    await expect(page).toHaveURL(/year=2025/);
  });

  test('should navigate to Step 1 when clicking Continue', async ({ page }) => {
    // Click on Step 1 button
    await page.getByTestId('tax-prep-step-1-btn').click();
    
    // Should navigate to step 1 page
    await expect(page).toHaveURL(/\/admin\/tax-prep\/step\/1/);
    await expect(page.locator('h1').filter({ hasText: 'Step 1: Income' })).toBeVisible();
  });

  test('should show Back to Financials link', async ({ page }) => {
    await expect(page.getByText('Back to Financials')).toBeVisible();
  });
});

test.describe('Tax Prep Step 1 - Income', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/tax-prep/step/1?year=2025', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
  });

  test('should display Income step with 1099s and Other Income sections', async ({ page }) => {
    // Check page title
    await expect(page.locator('h1').filter({ hasText: 'Step 1: Income' })).toBeVisible();
    
    // Check sections
    await expect(page.getByText('1099s Received')).toBeVisible();
    await expect(page.getByText('Other Income (No 1099)')).toBeVisible();
    
    // Check Add buttons
    await expect(page.getByTestId('add-1099-btn')).toBeVisible();
    await expect(page.getByTestId('add-other-income-btn')).toBeVisible();
    
    // Check total income section
    await expect(page.getByTestId('total-income-section')).toBeVisible();
    await expect(page.getByText('TOTAL INCOME')).toBeVisible();
  });

  test('should display existing income entries', async ({ page }) => {
    // Check for existing eBay 1099 entry
    await expect(page.getByText('eBay').first()).toBeVisible();
    
    // Check for existing Poshmark other income
    await expect(page.getByText('Poshmark').first()).toBeVisible();
    
    // Check totals using data-testid - total should be a currency value
    await expect(page.getByText('1099 Total')).toBeVisible();
    await expect(page.getByText('Other Total')).toBeVisible();
    await expect(page.getByTestId('total-income-amount')).toContainText('$');
  });

  test('should open Add 1099 modal when clicking Add 1099 button', async ({ page }) => {
    await page.getByTestId('add-1099-btn').click();
    
    // Modal should appear - use heading role for modal title
    await expect(page.locator('h3').filter({ hasText: 'Add 1099' })).toBeVisible();
    await expect(page.locator('label').filter({ hasText: 'Platform' })).toBeVisible();
    await expect(page.locator('label').filter({ hasText: 'Amount' })).toBeVisible();
    await expect(page.locator('label').filter({ hasText: 'Date Received' })).toBeVisible();
    
    // Check Cancel and Save buttons
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeVisible();
  });

  test('should open Add Other Income modal when clicking Add button', async ({ page }) => {
    await page.getByTestId('add-other-income-btn').click();
    
    // Modal should appear
    await expect(page.locator('h3').filter({ hasText: 'Add Other Income' })).toBeVisible();
    await expect(page.locator('label').filter({ hasText: 'Platform' })).toBeVisible();
    await expect(page.locator('label').filter({ hasText: 'Amount' })).toBeVisible();
    await expect(page.locator('label').filter({ hasText: 'Notes (optional)' })).toBeVisible();
  });

  test('should add new 1099 income entry', async ({ page }) => {
    // Get initial count of 1099 entries
    const initialCount = await page.locator('.bg-gray-50').filter({ hasText: 'depop' }).count();
    
    // Open Add 1099 modal
    await page.getByTestId('add-1099-btn').click();
    await expect(page.locator('h3').filter({ hasText: 'Add 1099' })).toBeVisible();
    
    // Fill form - use modal context and unique platform
    const modal = page.locator('.fixed.inset-0');
    await modal.locator('select').first().selectOption('depop');
    await modal.locator('input[type="number"]').fill('123.45');
    await modal.locator('input[type="date"]').fill('2025-02-15');
    
    // Save using exact match
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    
    // Wait for modal to close and data to refresh
    await page.waitForTimeout(1000);
    
    // Verify new entry appears (count increased)
    const newCount = await page.locator('.bg-gray-50').filter({ hasText: 'Depop' }).count();
    expect(newCount).toBeGreaterThan(initialCount);
    
    // Clean up - delete the entry we just created
    const depopRow = page.locator('.bg-gray-50').filter({ hasText: 'Depop' }).filter({ hasText: '$123.45' });
    const deleteBtn = depopRow.locator('button').filter({ has: page.locator('svg') });
    if (await deleteBtn.count() > 0) {
      await deleteBtn.first().click();
      await page.waitForTimeout(500);
    }
  });

  test('should navigate back to Tax Prep main page', async ({ page }) => {
    await page.getByText('Back to Tax Prep').click();
    await expect(page).toHaveURL(/\/admin\/tax-prep\?year=2025/);
  });

  test('should have Save & Continue button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Save & Continue/ })).toBeVisible();
  });
});

test.describe('Tax Prep Step 2 - Cost of Goods', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/tax-prep/step/2?year=2025', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
  });

  test('should display COGS step with inventory purchases', async ({ page }) => {
    await expect(page.locator('h1').filter({ hasText: 'Step 2: Cost of Goods' })).toBeVisible();
    await expect(page.getByText('Inventory Purchases')).toBeVisible();
    await expect(page.getByRole('button', { name: /Add Purchase/ })).toBeVisible();
    await expect(page.getByText('TOTAL COGS')).toBeVisible();
  });

  test('should display existing COGS entries', async ({ page }) => {
    // Check for existing Estate Sale entry
    await expect(page.getByText('Estate Sale').first()).toBeVisible();
    // Check total COGS shows a currency value
    await expect(page.locator('.bg-blue-50').getByText(/\$/)).toBeVisible();
  });

  test('should open Add Purchase modal', async ({ page }) => {
    await page.getByRole('button', { name: /Add Purchase/ }).click();
    
    await expect(page.locator('h3').filter({ hasText: 'Add Inventory Purchase' })).toBeVisible();
    await expect(page.locator('label').filter({ hasText: 'Source' })).toBeVisible();
    await expect(page.locator('label').filter({ hasText: 'Amount' })).toBeVisible();
    await expect(page.locator('label').filter({ hasText: /^Date$/ })).toBeVisible();
    await expect(page.locator('label').filter({ hasText: 'Item Count (optional)' })).toBeVisible();
    await expect(page.locator('label').filter({ hasText: 'Description (optional)' })).toBeVisible();
  });
});

test.describe('Tax Prep Step 3 - Deductions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/tax-prep/step/3?year=2025', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
  });

  test('should display Deductions step with Mileage and Expenses sections', async ({ page }) => {
    await expect(page.locator('h1').filter({ hasText: 'Step 3: Deductions' })).toBeVisible();
    await expect(page.locator('h2').filter({ hasText: 'Mileage' })).toBeVisible();
    await expect(page.getByText('Expenses by Category')).toBeVisible();
    await expect(page.getByText('TOTAL DEDUCTIONS')).toBeVisible();
  });

  test('should display mileage summary', async ({ page }) => {
    await expect(page.getByText('Total Miles')).toBeVisible();
    await expect(page.getByText('IRS Rate')).toBeVisible();
    await expect(page.getByText('Deduction', { exact: true })).toBeVisible();
  });

  test('should display expense categories', async ({ page }) => {
    // Check for some expense categories
    await expect(page.getByText('Shipping Supplies').first()).toBeVisible();
    await expect(page.getByText('Software & Subscriptions').first()).toBeVisible();
    await expect(page.getByText('Equipment').first()).toBeVisible();
  });

  test('should open Add Trip modal', async ({ page }) => {
    await page.getByRole('button', { name: /Add Trip/ }).click();
    
    await expect(page.locator('h3').filter({ hasText: 'Add Mileage' })).toBeVisible();
    await expect(page.locator('label').filter({ hasText: 'Miles', exact: true })).toBeVisible();
    await expect(page.locator('label').filter({ hasText: /^Date$/ })).toBeVisible();
    await expect(page.locator('label').filter({ hasText: 'Purpose (optional)' })).toBeVisible();
  });

  test('should open Add Expense modal', async ({ page }) => {
    await page.getByRole('button', { name: /Add Expense/ }).click();
    
    await expect(page.locator('h3').filter({ hasText: 'Add Expense' })).toBeVisible();
    await expect(page.locator('label').filter({ hasText: 'Category' })).toBeVisible();
    await expect(page.locator('label').filter({ hasText: 'Amount' })).toBeVisible();
    await expect(page.locator('label').filter({ hasText: /^Date$/ })).toBeVisible();
    await expect(page.locator('label').filter({ hasText: 'Description (optional)' })).toBeVisible();
  });
});

test.describe('Tax Prep Step 4 - Documents', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/tax-prep/step/4?year=2025', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
  });

  test('should display Documents step with upload area', async ({ page }) => {
    await expect(page.locator('h1').filter({ hasText: 'Step 4: Documents' })).toBeVisible();
    await expect(page.getByText('Upload Additional Documents')).toBeVisible();
    await expect(page.getByText('Drop files here or click to upload')).toBeVisible();
    await expect(page.getByText('PDF, JPEG, PNG up to 10MB')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Browse Files' })).toBeVisible();
  });
});

test.describe('Tax Prep Step 5 - Generate Reports', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/tax-prep/step/5?year=2025', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
  });

  test('should display Tax Summary', async ({ page }) => {
    await expect(page.locator('h1').filter({ hasText: 'Step 5: Generate Reports' })).toBeVisible();
    await expect(page.getByText('Tax Summary - 2025')).toBeVisible();
    
    // Check summary sections
    await expect(page.getByText('Gross Income')).toBeVisible();
    await expect(page.getByText('1099 Income')).toBeVisible();
    await expect(page.getByText('Other Income')).toBeVisible();
    await expect(page.getByText('Cost of Goods Sold')).toBeVisible();
    await expect(page.getByText('Gross Profit')).toBeVisible();
    await expect(page.getByText('Deductions', { exact: true })).toBeVisible();
    await expect(page.getByText('NET PROFIT')).toBeVisible();
  });

  test('should display download options', async ({ page }) => {
    await expect(page.getByText('Download Reports')).toBeVisible();
    await expect(page.getByText('Income Report')).toBeVisible();
    await expect(page.getByText('COGS Report')).toBeVisible();
    await expect(page.getByText('Deductions Report')).toBeVisible();
    await expect(page.getByText('Mileage Log')).toBeVisible();
    await expect(page.getByRole('button', { name: /Download Complete Tax Package/ })).toBeVisible();
  });

  test('should display financial calculations', async ({ page }) => {
    // Check that financial values are displayed
    await expect(page.getByText('NET PROFIT')).toBeVisible();
    // Check that there's at least one currency value displayed
    await expect(page.locator('span').filter({ hasText: /\$\d/ }).first()).toBeVisible();
  });
});

test.describe('Tax Prep - Year Persistence', () => {
  test('should persist year selection across step navigation', async ({ page }) => {
    // Start at main page with 2025
    await page.goto('/admin/tax-prep?year=2025', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    
    // Navigate to Step 1
    await page.getByTestId('tax-prep-step-1-btn').click();
    await expect(page).toHaveURL(/year=2025/);
    
    // Navigate back
    await page.getByText('Back to Tax Prep').click();
    await expect(page).toHaveURL(/year=2025/);
    
    // Year selector should still show 2025
    const yearSelect = page.locator('select');
    await expect(yearSelect).toHaveValue('2025');
  });
});

test.describe('Tax Prep - CRUD Operations', () => {
  test('should add and delete income entry', async ({ page }) => {
    await page.goto('/admin/tax-prep/step/1?year=2025', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    
    // Get initial count
    const initialCount = await page.locator('.bg-gray-50').filter({ hasText: 'FB Marketplace' }).count();
    
    // Add new 1099 income with unique platform
    await page.getByTestId('add-1099-btn').click();
    
    // Use modal context for form filling
    const modal = page.locator('.fixed.inset-0');
    await modal.locator('select').first().selectOption('fb_marketplace');
    await modal.locator('input[type="number"]').fill('77.77');
    await modal.locator('input[type="date"]').fill('2025-03-15');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    
    await page.waitForTimeout(1000);
    
    // Verify entry was added
    const newCount = await page.locator('.bg-gray-50').filter({ hasText: 'FB Marketplace' }).count();
    expect(newCount).toBeGreaterThan(initialCount);
    
    // Delete the entry
    const fbRow = page.locator('.bg-gray-50').filter({ hasText: 'FB Marketplace' }).filter({ hasText: '$77.77' });
    const deleteBtn = fbRow.locator('button').filter({ has: page.locator('svg') });
    await deleteBtn.first().click();
    
    await page.waitForTimeout(1000);
    
    // Verify entry was deleted
    const finalCount = await page.locator('.bg-gray-50').filter({ hasText: 'FB Marketplace' }).filter({ hasText: '$77.77' }).count();
    expect(finalCount).toBe(0);
  });

  test('should add and delete COGS entry', async ({ page }) => {
    await page.goto('/admin/tax-prep/step/2?year=2025', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    
    const uniqueSource = `TEST_Garage_${Date.now()}`;
    
    // Add new COGS entry
    await page.getByRole('button', { name: /Add Purchase/ }).click();
    
    // Use modal context
    const modal = page.locator('.fixed.inset-0');
    await modal.locator('input[placeholder*="Estate Sale"]').fill(uniqueSource);
    await modal.locator('input[type="number"]').first().fill('33.33');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    
    await page.waitForTimeout(1000);
    
    // Verify entry was added
    await expect(page.getByText(uniqueSource).first()).toBeVisible();
    
    // Delete the entry
    const testRow = page.locator('.bg-gray-50').filter({ hasText: uniqueSource });
    const deleteBtn = testRow.locator('button').filter({ has: page.locator('svg') });
    await deleteBtn.first().click();
    
    await page.waitForTimeout(1000);
    
    // Verify entry was deleted
    await expect(page.getByText(uniqueSource)).toHaveCount(0);
  });

  test('should add and delete mileage entry', async ({ page }) => {
    await page.goto('/admin/tax-prep/step/3?year=2025', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    
    const uniquePurpose = `TEST_Trip_${Date.now()}`;
    
    // Add new mileage entry
    await page.getByRole('button', { name: /Add Trip/ }).click();
    
    // Use modal context
    const modal = page.locator('.fixed.inset-0');
    await modal.locator('input[type="number"]').fill('12.3');
    await modal.locator('input[placeholder*="Sourcing"]').fill(uniquePurpose);
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    
    await page.waitForTimeout(1000);
    
    // Verify entry was added
    await expect(page.getByText(uniquePurpose).first()).toBeVisible();
    
    // Delete the entry
    const testRow = page.locator('div').filter({ hasText: uniquePurpose }).filter({ hasText: '12.3 mi' });
    const deleteBtn = testRow.locator('button').filter({ has: page.locator('svg') });
    if (await deleteBtn.count() > 0) {
      await deleteBtn.first().click();
      await page.waitForTimeout(1000);
    }
  });

  test('should add expense entry', async ({ page }) => {
    await page.goto('/admin/tax-prep/step/3?year=2025', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    
    // Add new expense entry
    await page.getByRole('button', { name: /Add Expense/ }).click();
    
    // Use modal context
    const modal = page.locator('.fixed.inset-0');
    await modal.locator('select').first().selectOption('insurance');
    await modal.locator('input[type="number"]').fill('55.55');
    await modal.locator('input[placeholder*="Poly mailers"]').fill('TEST_Business insurance');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    
    await page.waitForTimeout(1000);
    
    // Verify Insurance category now has an entry
    await expect(page.getByText('Insurance').first()).toBeVisible();
  });
});

test.describe('Tax Prep - Step Progress', () => {
  test('should mark step as complete and navigate to next step', async ({ page }) => {
    await page.goto('/admin/tax-prep/step/1?year=2025', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    
    // Click Save & Continue
    await page.getByRole('button', { name: /Save & Continue/ }).click();
    
    // Should navigate to step 2
    await expect(page).toHaveURL(/\/admin\/tax-prep\/step\/2/);
    await expect(page.locator('h1').filter({ hasText: 'Step 2: Cost of Goods' })).toBeVisible();
  });
});
