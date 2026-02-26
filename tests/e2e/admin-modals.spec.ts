import { test, expect } from '@playwright/test';
import { dismissToasts, removeEmergentBadge } from '../fixtures/helpers';

const BASE_URL = 'https://thrifty-curator-6.preview.emergentagent.com';

test.describe('Admin Modal Refactoring Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Skip splash screen
    await page.addInitScript(() => {
      sessionStorage.setItem('hasSeenSplash', 'true');
    });
    
    // Setup toast handler
    await dismissToasts(page);
    
    // Login as admin
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    await page.getByTestId('login-email').fill('4399');
    await page.getByTestId('login-submit-btn').click();
    await page.waitForURL('**/admin**', { timeout: 15000 });
    await expect(page.getByTestId('admin-dashboard')).toBeVisible({ timeout: 15000 });
    
    // Remove Emergent badge if present
    await removeEmergentBadge(page);
  });

  test('Employee Portal View Modal - opens correctly', async ({ page }) => {
    // Expand All Employees section
    await page.click('text=All Employees');
    await expect(page.getByTestId('employees-table')).toBeVisible({ timeout: 10000 });
    
    // Find an employee with View Portal button (not admin)
    // Click on the first View Portal button available
    const viewPortalButtons = page.locator('[data-testid^="view-portal-"]');
    const count = await viewPortalButtons.count();
    expect(count).toBeGreaterThan(0);
    
    // Click the first available View Portal button
    await viewPortalButtons.first().click();
    
    // Verify modal opens
    await expect(page.getByTestId('employee-portal-modal')).toBeVisible({ timeout: 10000 });
  });

  test('Employee Portal View Modal - shows employee data correctly', async ({ page }) => {
    // Expand All Employees section
    await page.click('text=All Employees');
    await expect(page.getByTestId('employees-table')).toBeVisible({ timeout: 10000 });
    
    // Click View Portal for first available employee
    const viewPortalButtons = page.locator('[data-testid^="view-portal-"]');
    await viewPortalButtons.first().click();
    
    // Verify modal opens
    await expect(page.getByTestId('employee-portal-modal')).toBeVisible({ timeout: 10000 });
    
    // Verify modal shows employee data (clock status, pay period summary)
    // Check for "Current Pay Period" section
    await expect(page.locator('text=Current Pay Period')).toBeVisible();
    
    // Check for Hours, Shifts, Est. Pay cards
    await expect(page.locator('text=Hours').first()).toBeVisible();
    await expect(page.locator('text=Shifts').first()).toBeVisible();
    await expect(page.locator('text=Est. Pay').first()).toBeVisible();
    
    // Check for clock in/out button
    await expect(page.getByTestId('admin-clock-btn')).toBeVisible();
  });

  test('Employee Portal View Modal - close button (X) works', async ({ page }) => {
    // Expand All Employees section
    await page.click('text=All Employees');
    await expect(page.getByTestId('employees-table')).toBeVisible({ timeout: 10000 });
    
    // Click View Portal for first available employee
    const viewPortalButtons = page.locator('[data-testid^="view-portal-"]');
    await viewPortalButtons.first().click();
    
    // Verify modal opens
    await expect(page.getByTestId('employee-portal-modal')).toBeVisible({ timeout: 10000 });
    
    // Click close X button in header
    await page.getByTestId('close-portal-x').click();
    
    // Verify modal is closed
    await expect(page.getByTestId('employee-portal-modal')).not.toBeVisible({ timeout: 5000 });
  });

  test('Employee Portal View Modal - close button (footer) works', async ({ page }) => {
    // Expand All Employees section
    await page.click('text=All Employees');
    await expect(page.getByTestId('employees-table')).toBeVisible({ timeout: 10000 });
    
    // Click View Portal for first available employee
    const viewPortalButtons = page.locator('[data-testid^="view-portal-"]');
    await viewPortalButtons.first().click();
    
    // Verify modal opens
    await expect(page.getByTestId('employee-portal-modal')).toBeVisible({ timeout: 10000 });
    
    // Click Close Employee Portal button in footer
    await page.getByTestId('close-portal-btn').click();
    
    // Verify modal is closed
    await expect(page.getByTestId('employee-portal-modal')).not.toBeVisible({ timeout: 5000 });
  });

  test('W9 Viewer Modal - opens from All Employees section', async ({ page }) => {
    // Expand All Employees section
    await page.click('text=All Employees');
    await expect(page.getByTestId('employees-table')).toBeVisible({ timeout: 10000 });
    
    // Find employee with W-9 document (has "View" in W-9 column)
    const w9ViewButtons = page.locator('[data-testid^="view-w9-"]');
    const count = await w9ViewButtons.count();
    
    if (count > 0) {
      // Find the button that has "View" text (meaning W-9 exists)
      for (let i = 0; i < count; i++) {
        const btn = w9ViewButtons.nth(i);
        const hasViewText = await btn.locator('text=View').count();
        if (hasViewText > 0) {
          await btn.click();
          
          // Verify W9 modal opens (AllEmployeesSection has its own W9 modal)
          await expect(page.getByTestId('w9-management-modal')).toBeVisible({ timeout: 10000 });
          return;
        }
      }
    }
    
    // If no employee has W-9, skip this test
    test.skip(true, 'No employees with W-9 documents found');
  });

  test('Portal W9 Modal - opens from within Employee Portal View', async ({ page }) => {
    // Expand All Employees section
    await page.click('text=All Employees');
    await expect(page.getByTestId('employees-table')).toBeVisible({ timeout: 10000 });
    
    // Find an employee who has a W-9 document
    // First, identify employees with W-9 by checking the View W-9 button text
    const rows = page.locator('[data-testid^="all-employee-row-"]');
    const rowCount = await rows.count();
    
    let employeeWithW9Found = false;
    
    for (let i = 0; i < rowCount; i++) {
      const row = rows.nth(i);
      const w9Btn = row.locator('[data-testid^="view-w9-"]');
      const hasViewText = await w9Btn.locator('text=View').count();
      
      if (hasViewText > 0) {
        // This employee has a W-9, click View Portal for them
        const viewPortalBtn = row.locator('[data-testid^="view-portal-"]');
        const isVisible = await viewPortalBtn.isVisible().catch(() => false);
        
        if (isVisible) {
          await viewPortalBtn.click();
          employeeWithW9Found = true;
          break;
        }
      }
    }
    
    if (!employeeWithW9Found) {
      test.skip(true, 'No employees with W-9 and View Portal option found');
      return;
    }
    
    // Verify Employee Portal modal opens
    await expect(page.getByTestId('employee-portal-modal')).toBeVisible({ timeout: 10000 });
    
    // Look for W-9 Tax Form section and View button inside the portal
    const w9Section = page.locator('text=W-9 Tax Form');
    await expect(w9Section).toBeVisible({ timeout: 5000 });
    
    // Click the View button next to W-9 document inside the portal
    const viewW9InPortal = page.locator('[data-testid="employee-portal-modal"]').getByRole('button', { name: 'View' });
    
    const viewBtnExists = await viewW9InPortal.isVisible().catch(() => false);
    if (!viewBtnExists) {
      test.skip(true, 'Employee in portal does not have W-9 view button');
      return;
    }
    
    await viewW9InPortal.click();
    
    // Verify Portal W9 Modal opens
    await expect(page.getByTestId('portal-w9-modal')).toBeVisible({ timeout: 10000 });
  });
});
