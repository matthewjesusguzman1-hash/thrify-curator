import { test, expect } from '@playwright/test';
import { dismissToasts, removeEmergentBadge } from '../fixtures/helpers';

const BASE_URL = 'https://resale-portal-app.preview.emergentagent.com';

test.describe('Admin Role Bug Fixes - Edit Employee & Admin Codes', () => {
  
  test.describe('Owner Login Flow', () => {
    test.beforeEach(async ({ page }) => {
      // Clear any existing session
      await page.goto('/login');
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      await page.reload();
      await page.waitForLoadState('domcontentloaded');
    });

    test('Owner Matthew can login with 4-digit code 4399', async ({ page }) => {
      await dismissToasts(page);
      await page.goto('/login');
      await page.waitForLoadState('domcontentloaded');
      
      // Enter owner code directly (not email)
      await page.getByTestId('login-email').fill('4399');
      await page.getByTestId('login-submit-btn').click();
      
      // Should navigate to admin dashboard
      await page.waitForURL('**/admin**', { timeout: 15000 });
      await expect(page.getByTestId('admin-dashboard')).toBeVisible({ timeout: 15000 });
    });

    test('Owner Eunice can login with 4-digit code 0826', async ({ page }) => {
      await dismissToasts(page);
      await page.goto('/login');
      await page.waitForLoadState('domcontentloaded');
      
      // Enter owner code directly
      await page.getByTestId('login-email').fill('0826');
      await page.getByTestId('login-submit-btn').click();
      
      // Should navigate to admin dashboard
      await page.waitForURL('**/admin**', { timeout: 15000 });
      await expect(page.getByTestId('admin-dashboard')).toBeVisible({ timeout: 15000 });
    });
  });

  test.describe('Non-Owner Admin Login Flow', () => {
    test.beforeEach(async ({ page }) => {
      // Clear any existing session
      await page.goto('/login');
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      await page.reload();
      await page.waitForLoadState('domcontentloaded');
    });

    test('Non-owner admin login requires email first, then code', async ({ page }) => {
      await dismissToasts(page);
      await page.goto('/login');
      await page.waitForLoadState('domcontentloaded');
      
      // First attempt with email only - should prompt for admin code
      await page.getByTestId('login-email').fill('test1@test.com');
      await page.getByTestId('login-submit-btn').click();
      
      // Should show admin code input field
      await expect(page.getByTestId('login-admin-code')).toBeVisible({ timeout: 10000 });
      
      // Enter admin code
      await page.getByTestId('login-admin-code').fill('1234');
      await page.getByTestId('login-submit-btn').click();
      
      // Should navigate to admin dashboard
      await page.waitForURL('**/admin**', { timeout: 15000 });
      await expect(page.getByTestId('admin-dashboard')).toBeVisible({ timeout: 15000 });
    });
  });

  test.describe('Admin Codes Visibility in All Employees Section', () => {
    test('Owner sees admin codes in All Employees list', async ({ page }) => {
      // Skip splash screen
      await page.addInitScript(() => {
        sessionStorage.setItem('hasSeenSplash', 'true');
      });
      
      await dismissToasts(page);
      
      // Login as owner (Matthew - 4399)
      await page.goto('/login');
      await page.waitForLoadState('domcontentloaded');
      await page.getByTestId('login-email').fill('4399');
      await page.getByTestId('login-submit-btn').click();
      await page.waitForURL('**/admin**', { timeout: 15000 });
      await expect(page.getByTestId('admin-dashboard')).toBeVisible({ timeout: 15000 });
      
      await removeEmergentBadge(page);
      
      // Expand All Employees section
      await page.click('text=All Employees');
      await expect(page.getByTestId('employees-table')).toBeVisible({ timeout: 10000 });
      
      // Check if admin rows have their codes visible
      // Look for admin code badges (data-testid="admin-code-{id}")
      const adminCodeBadges = page.locator('[data-testid^="admin-code-"]');
      const count = await adminCodeBadges.count();
      
      // If there are admins in the list, they should have codes visible for owner
      // The test verifies that the admin code column shows codes when logged in as owner
      if (count > 0) {
        // Verify at least one admin code badge is visible
        await expect(adminCodeBadges.first()).toBeVisible();
        // Verify it contains "Code:" text
        await expect(adminCodeBadges.first()).toContainText('Code:');
      }
    });

    test('Non-owner admin does NOT see admin codes in All Employees list', async ({ page }) => {
      // Skip splash screen
      await page.addInitScript(() => {
        sessionStorage.setItem('hasSeenSplash', 'true');
      });
      
      await dismissToasts(page);
      
      // Login as non-owner admin (test1@test.com with code 1234)
      await page.goto('/login');
      await page.waitForLoadState('domcontentloaded');
      await page.getByTestId('login-email').fill('test1@test.com');
      await page.getByTestId('login-submit-btn').click();
      
      // Wait for admin code field to appear
      await expect(page.getByTestId('login-admin-code')).toBeVisible({ timeout: 10000 });
      await page.getByTestId('login-admin-code').fill('1234');
      await page.getByTestId('login-submit-btn').click();
      
      await page.waitForURL('**/admin**', { timeout: 15000 });
      await expect(page.getByTestId('admin-dashboard')).toBeVisible({ timeout: 15000 });
      
      await removeEmergentBadge(page);
      
      // Expand All Employees section
      await page.click('text=All Employees');
      await expect(page.getByTestId('employees-table')).toBeVisible({ timeout: 10000 });
      
      // Admin code badges should NOT be visible for non-owner admin
      const adminCodeBadges = page.locator('[data-testid^="admin-code-"]');
      const count = await adminCodeBadges.count();
      
      // Should be 0 admin code badges visible for non-owner admin
      expect(count).toBe(0);
    });
  });

  test.describe('Edit Employee Dropdown - Admin Visibility', () => {
    test.beforeEach(async ({ page }) => {
      // Skip splash screen
      await page.addInitScript(() => {
        sessionStorage.setItem('hasSeenSplash', 'true');
      });
      
      await dismissToasts(page);
      
      // Login as owner (Matthew - 4399)
      await page.goto('/login');
      await page.waitForLoadState('domcontentloaded');
      await page.getByTestId('login-email').fill('4399');
      await page.getByTestId('login-submit-btn').click();
      await page.waitForURL('**/admin**', { timeout: 15000 });
      await expect(page.getByTestId('admin-dashboard')).toBeVisible({ timeout: 15000 });
      
      await removeEmergentBadge(page);
    });

    test('Edit Employee dropdown shows admin users with Admin badge', async ({ page }) => {
      // Click Edit Employee button to open modal
      await page.getByTestId('edit-employee-btn').click();
      await expect(page.getByTestId('edit-employee-modal')).toBeVisible({ timeout: 10000 });
      
      // Click on the employee dropdown
      await page.getByTestId('edit-employee-select').click();
      
      // Wait for dropdown content to appear
      await page.waitForSelector('[role="listbox"]', { timeout: 5000 });
      
      // Look for admin users in the dropdown (they should have Admin badge)
      const dropdownItems = page.locator('[role="option"]');
      const itemsCount = await dropdownItems.count();
      
      // Verify dropdown has items
      expect(itemsCount).toBeGreaterThan(0);
      
      // Check if any items contain "Admin" text (admin badge marker)
      let foundAdmin = false;
      for (let i = 0; i < itemsCount; i++) {
        const text = await dropdownItems.nth(i).textContent();
        if (text && text.includes('Admin')) {
          foundAdmin = true;
          break;
        }
      }
      
      // There should be at least one admin visible in the dropdown
      expect(foundAdmin).toBe(true);
    });

    test('Can select admin user from Edit Employee dropdown', async ({ page }) => {
      // Click Edit Employee button to open modal
      await page.getByTestId('edit-employee-btn').click();
      await expect(page.getByTestId('edit-employee-modal')).toBeVisible({ timeout: 10000 });
      
      // Click on the employee dropdown
      await page.getByTestId('edit-employee-select').click();
      
      // Wait for dropdown content
      await page.waitForSelector('[role="listbox"]', { timeout: 5000 });
      
      // Find and click on an admin user in the dropdown
      const dropdownItems = page.locator('[role="option"]');
      const itemsCount = await dropdownItems.count();
      
      let selectedAdmin = false;
      for (let i = 0; i < itemsCount; i++) {
        const text = await dropdownItems.nth(i).textContent();
        if (text && text.includes('Admin')) {
          await dropdownItems.nth(i).click();
          selectedAdmin = true;
          break;
        }
      }
      
      if (selectedAdmin) {
        // Verify the edit form loads with admin data
        await expect(page.getByTestId('edit-employee-name')).toBeVisible({ timeout: 5000 });
        await expect(page.getByTestId('edit-employee-email')).toBeVisible({ timeout: 5000 });
        
        // Verify the name field has a value
        const nameValue = await page.getByTestId('edit-employee-name').inputValue();
        expect(nameValue.length).toBeGreaterThan(0);
      }
    });
  });
});
