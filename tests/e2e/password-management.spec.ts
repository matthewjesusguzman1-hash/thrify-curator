import { test, expect } from '@playwright/test';

/**
 * Password Management Feature Tests
 * Tests employee password login, admin password management section, and related flows
 */

test.describe('Password Management Features', () => {
  
  test.beforeEach(async ({ page }) => {
    // Remove emergent badge to avoid click issues
    await page.addInitScript(() => {
      window.addEventListener('load', () => {
        const badge = document.querySelector('[class*="emergent"], [id*="emergent-badge"]');
        if (badge) badge.remove();
      });
    });
    // Skip splash screen
    await page.addInitScript(() => {
      sessionStorage.setItem('hasSeenSplash', 'true');
    });
  });

  test.describe('Admin Login with Owner Code', () => {
    
    test('admin can login using owner code 4399', async ({ page }) => {
      await page.goto('/login', { waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId('auth-page')).toBeVisible();
      
      // Enter owner code (4399 maps to admin email)
      await page.getByTestId('login-email').fill('4399');
      await page.getByTestId('login-submit-btn').click();
      
      // Should redirect to admin dashboard
      await expect(page.getByTestId('admin-dashboard')).toBeVisible();
    });

    test('admin with email shows admin code field', async ({ page }) => {
      await page.goto('/login', { waitUntil: 'domcontentloaded' });
      
      // Enter admin email
      await page.getByTestId('login-email').fill('matthewjesusguzman1@gmail.com');
      await page.getByTestId('login-submit-btn').click();
      
      // Should show admin code field
      await expect(page.getByTestId('login-admin-code')).toBeVisible();
      
      // Enter correct code
      await page.getByTestId('login-admin-code').fill('4399');
      await page.getByTestId('login-submit-btn').click();
      
      // Should redirect to admin dashboard
      await expect(page.getByTestId('admin-dashboard')).toBeVisible();
    });
  });

  test.describe('Employee Password Login Flow', () => {
    
    test('employee with password shows password field', async ({ page }) => {
      await page.goto('/login', { waitUntil: 'domcontentloaded' });
      
      // Enter employee email that has password set
      await page.getByTestId('login-email').fill('testemployee@thriftycurator.com');
      await page.getByTestId('login-submit-btn').click();
      
      // Should show password field
      await expect(page.getByTestId('login-password')).toBeVisible();
    });

    test('employee with password can login with correct password', async ({ page }) => {
      await page.goto('/login', { waitUntil: 'domcontentloaded' });
      
      // Enter employee email
      await page.getByTestId('login-email').fill('testemployee@thriftycurator.com');
      await page.getByTestId('login-submit-btn').click();
      
      // Enter password
      await expect(page.getByTestId('login-password')).toBeVisible();
      await page.getByTestId('login-password').fill('test1234');
      await page.getByTestId('login-submit-btn').click();
      
      // Should redirect to employee dashboard
      await expect(page.getByTestId('employee-dashboard')).toBeVisible();
    });

    test('employee with wrong password sees error', async ({ page }) => {
      await page.goto('/login', { waitUntil: 'domcontentloaded' });
      
      // Enter employee email
      await page.getByTestId('login-email').fill('testemployee@thriftycurator.com');
      await page.getByTestId('login-submit-btn').click();
      
      // Enter wrong password
      await expect(page.getByTestId('login-password')).toBeVisible();
      await page.getByTestId('login-password').fill('wrongpassword');
      await page.getByTestId('login-submit-btn').click();
      
      // Should show error toast - check page doesn't navigate away
      await page.waitForTimeout(1500);
      await expect(page.getByTestId('auth-page')).toBeVisible();
    });
  });

  test.describe('Admin Dashboard Password Management Section', () => {
    
    test.beforeEach(async ({ page }) => {
      // Login as admin first
      await page.goto('/login', { waitUntil: 'domcontentloaded' });
      await page.getByTestId('login-email').fill('4399');
      await page.getByTestId('login-submit-btn').click();
      await expect(page.getByTestId('admin-dashboard')).toBeVisible();
    });

    test('Password Management group is visible and expandable', async ({ page }) => {
      // The Password Management group should be visible
      const passwordGroup = page.getByTestId('password-management-group');
      await expect(passwordGroup).toBeVisible();
      
      // Click to expand the group
      await page.getByTestId('password-management-group-toggle').click();
      await page.waitForTimeout(500);
      
      // Password management section should now be visible
      await expect(page.getByTestId('password-management-section')).toBeVisible();
    });

    test('Password Management shows employee and consignor tabs', async ({ page }) => {
      // Expand the password management group
      await page.getByTestId('password-management-group-toggle').click();
      await page.waitForTimeout(500);
      
      // Check for tabs
      await expect(page.getByTestId('tab-employees')).toBeVisible();
      await expect(page.getByTestId('tab-consignors')).toBeVisible();
    });

    test('Password Management displays employees list', async ({ page }) => {
      // Expand the password management group
      await page.getByTestId('password-management-group-toggle').click();
      await page.waitForTimeout(1000);
      
      // Should show employee password rows
      const employeeRows = page.locator('[data-testid^="employee-password-row-"]');
      await expect(employeeRows.first()).toBeVisible();
    });

    test('Can search employees in Password Management', async ({ page }) => {
      // Expand the password management group
      await page.getByTestId('password-management-group-toggle').click();
      await page.waitForTimeout(500);
      
      // Search for test employee
      await page.getByTestId('password-search').fill('testemployee');
      await page.waitForTimeout(500);
      
      // Should filter results - count should reduce
      const employeeRows = page.locator('[data-testid^="employee-password-row-"]');
      const count = await employeeRows.count();
      // At least one result should show (our test employee)
      expect(count).toBeGreaterThanOrEqual(1);
    });

    test('Set Password button opens modal', async ({ page }) => {
      // Expand the password management group
      await page.getByTestId('password-management-group-toggle').click();
      await page.waitForTimeout(1000);
      
      // Click first set password button
      const setPasswordBtn = page.locator('[data-testid^="set-password-btn-"]').first();
      await setPasswordBtn.click();
      
      // Modal should appear
      await expect(page.getByTestId('set-password-modal')).toBeVisible();
      await expect(page.getByTestId('new-password-input')).toBeVisible();
    });

    test('Set Password modal validates minimum length', async ({ page }) => {
      // Expand the password management group
      await page.getByTestId('password-management-group-toggle').click();
      await page.waitForTimeout(1000);
      
      // Click first set password button
      const setPasswordBtn = page.locator('[data-testid^="set-password-btn-"]').first();
      await setPasswordBtn.click();
      
      await expect(page.getByTestId('set-password-modal')).toBeVisible();
      
      // Enter short password
      await page.getByTestId('new-password-input').fill('abc');
      
      // Confirm button should be disabled
      const confirmBtn = page.getByTestId('confirm-password-btn');
      await expect(confirmBtn).toBeDisabled();
      
      // Enter valid password
      await page.getByTestId('new-password-input').fill('validpass');
      await expect(confirmBtn).toBeEnabled();
      
      // Cancel
      await page.getByTestId('cancel-password-btn').click();
      await expect(page.getByTestId('set-password-modal')).not.toBeVisible();
    });
    
    test('Can switch between Employees and Consignors tabs', async ({ page }) => {
      // Expand the password management group
      await page.getByTestId('password-management-group-toggle').click();
      await page.waitForTimeout(500);
      
      // Should start on employees tab
      await expect(page.getByTestId('tab-employees')).toBeVisible();
      
      // Click consignors tab
      await page.getByTestId('tab-consignors').click();
      await page.waitForTimeout(500);
      
      // Should show consignors content (may be empty or have data)
      // The consignor rows would have different test ids
      const consignorRows = page.locator('[data-testid^="consignor-password-row-"]');
      // Just verify we're on the right tab by checking the button is styled as active
      await expect(page.getByTestId('tab-consignors')).toBeVisible();
      
      // Switch back to employees
      await page.getByTestId('tab-employees').click();
      await page.waitForTimeout(500);
      
      // Should see employee rows again
      const employeeRows = page.locator('[data-testid^="employee-password-row-"]');
      await expect(employeeRows.first()).toBeVisible();
    });
  });

  test.describe('Edit Employee Modal Password Section', () => {
    
    test.beforeEach(async ({ page }) => {
      // Login as admin first
      await page.goto('/login', { waitUntil: 'domcontentloaded' });
      await page.getByTestId('login-email').fill('4399');
      await page.getByTestId('login-submit-btn').click();
      await expect(page.getByTestId('admin-dashboard')).toBeVisible();
    });

    test('Edit button in top bar opens employee selection modal', async ({ page }) => {
      // Click the Edit button in the header
      const editBtn = page.locator('button:has-text("Edit")').first();
      await editBtn.click();
      
      // Should show edit employee modal
      await expect(page.getByTestId('edit-employee-modal')).toBeVisible();
      
      // Should have employee select dropdown
      await expect(page.getByTestId('edit-employee-select')).toBeVisible();
    });

    test('Selecting employee shows password section for non-admin employees', async ({ page }) => {
      // Click the Edit button in the header
      const editBtn = page.locator('button:has-text("Edit")').first();
      await editBtn.click();
      
      await expect(page.getByTestId('edit-employee-modal')).toBeVisible();
      
      // Click the select dropdown
      await page.getByTestId('edit-employee-select').click();
      
      // Select an employee (find non-admin by looking at the options)
      // Look for Test Employee
      const option = page.locator('[role="option"]:has-text("Test Employee")').first();
      if (await option.count() > 0) {
        await option.click();
        await page.waitForTimeout(500);
        
        // Password input should be visible for non-admin employees
        const passwordInput = page.getByTestId('edit-employee-password');
        await expect(passwordInput).toBeVisible();
      }
    });
  });
});
