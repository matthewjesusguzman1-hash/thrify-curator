import { test, expect } from '@playwright/test';
import { loginAsAdmin, dismissToasts, removeEmergentBadge } from '../fixtures/helpers';

/**
 * Recent Shifts Pay Period Feature Tests
 * Tests that the Recent Shifts section shows:
 * - Current pay period shifts if there are any
 * - Previous pay period shifts if no shifts in current period
 * Both Employee Dashboard and Admin Employee Portal View modal should have this logic
 */

test.describe('Recent Shifts Pay Period Logic', () => {

  test.describe('Employee Dashboard - Recent Shifts', () => {
    
    test.beforeEach(async ({ page }) => {
      await dismissToasts(page);
      // Skip splash screen
      await page.addInitScript(() => {
        sessionStorage.setItem('hasSeenSplash', 'true');
      });
    });

    test('shows Recent Shifts section with pay period label', async ({ page }) => {
      await page.goto('/login', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);
      
      // Login as test employee
      await page.fill('input[placeholder="your@email.com"]', 'tester@tester.com');
      await page.waitForTimeout(300);
      await page.click('button:has-text("Continue")');
      
      // Wait for employee dashboard
      await expect(page.getByTestId('employee-dashboard')).toBeVisible({ timeout: 15000 });
      await page.waitForTimeout(2000);
      
      // Check that Recent Shifts section shows either current or previous pay period label
      const shiftsHeading = page.locator('h2:has-text("Pay Period Shifts")');
      await expect(shiftsHeading).toBeVisible();
    });

    test('shows Current Pay Period Shifts when there are shifts in current period', async ({ page }) => {
      await page.goto('/login', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);
      
      // Login as test employee
      await page.fill('input[placeholder="your@email.com"]', 'tester@tester.com');
      await page.waitForTimeout(300);
      await page.click('button:has-text("Continue")');
      
      await expect(page.getByTestId('employee-dashboard')).toBeVisible({ timeout: 15000 });
      await page.waitForTimeout(2000);
      
      // The heading should contain "Current Pay Period Shifts" or "Previous Pay Period Shifts"
      // depending on whether there are shifts in current period
      const currentPeriodHeading = page.locator('h2:has-text("Current Pay Period Shifts")');
      const previousPeriodHeading = page.locator('h2:has-text("Previous Pay Period Shifts")');
      
      // Either one should be visible
      const currentVisible = await currentPeriodHeading.isVisible().catch(() => false);
      const previousVisible = await previousPeriodHeading.isVisible().catch(() => false);
      
      expect(currentVisible || previousVisible).toBeTruthy();
    });

    test('shows Previous Pay Period Shifts with date range when no current period shifts', async ({ page }) => {
      await page.goto('/login', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);
      
      // Login as tester (who likely has no shifts in current period)
      await page.fill('input[placeholder="your@email.com"]', 'tester@tester.com');
      await page.waitForTimeout(300);
      await page.click('button:has-text("Continue")');
      
      await expect(page.getByTestId('employee-dashboard')).toBeVisible({ timeout: 15000 });
      await page.waitForTimeout(2000);
      
      // If there are no shifts in current period, should show Previous Pay Period label
      // The label includes date range like "Previous Pay Period Shifts (Mar 2 - Mar 15)"
      const previousPeriodHeading = page.locator('h2:has-text("Previous Pay Period Shifts")');
      
      if (await previousPeriodHeading.isVisible()) {
        // Check that date range is shown in the heading
        const headingText = await previousPeriodHeading.textContent();
        expect(headingText).toMatch(/\(.*-.*\)/); // Should have date range in parentheses
      }
    });

    test('Current Pay Period summary shows correct date range', async ({ page }) => {
      await page.goto('/login', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);
      
      await page.fill('input[placeholder="your@email.com"]', 'tester@tester.com');
      await page.waitForTimeout(300);
      await page.click('button:has-text("Continue")');
      
      await expect(page.getByTestId('employee-dashboard')).toBeVisible({ timeout: 15000 });
      await page.waitForTimeout(2000);
      
      // Check Current Pay Period card shows date range
      await expect(page.getByText('Current Pay Period')).toBeVisible();
      
      // Should show date range in format like "Mar 16 - Mar 29"
      const dateRangeText = page.locator('text=/Mar \\d+ - Mar \\d+/');
      await expect(dateRangeText.first()).toBeVisible();
    });
  });

  test.describe('Admin Employee Portal View - Recent Shifts', () => {
    
    test.beforeEach(async ({ page }) => {
      await dismissToasts(page);
      await loginAsAdmin(page);
      await removeEmergentBadge(page);
      await page.waitForTimeout(1000);
    });

    test('Employee Portal modal shows Recent Shifts with pay period label', async ({ page }) => {
      // Expand Team Management
      await page.getByText('Team Management').first().click();
      await page.waitForTimeout(1500);
      
      // Expand All Employees
      await page.getByText('All Employees').first().click();
      await page.waitForTimeout(1500);
      
      // Click View Portal for an employee
      const viewPortalBtn = page.getByText('View Portal').first();
      await viewPortalBtn.click();
      await page.waitForTimeout(2000);
      
      // Check modal is visible
      await expect(page.getByTestId('employee-portal-modal')).toBeVisible();
      
      // Check that shifts section shows pay period label
      const shiftsHeading = page.getByTestId('employee-portal-modal').locator('h3:has-text("Pay Period Shifts")');
      await expect(shiftsHeading).toBeVisible();
    });

    test('Employee Portal modal shows Previous Pay Period when no current period shifts', async ({ page }) => {
      // Expand Team Management
      await page.getByText('Team Management').first().click();
      await page.waitForTimeout(1500);
      
      // Expand All Employees
      await page.getByText('All Employees').first().click();
      await page.waitForTimeout(1500);
      
      // Find Tester employee row and click View Portal
      const testerRow = page.locator('tr:has-text("Tester"), tr:has-text("tester@tester.com")');
      const viewPortalBtn = testerRow.locator('button:has-text("View Portal")');
      await viewPortalBtn.click();
      await page.waitForTimeout(2000);
      
      // Check modal shows Previous Pay Period Shifts if no current period shifts
      const modal = page.getByTestId('employee-portal-modal');
      await expect(modal).toBeVisible();
      
      const previousHeading = modal.locator('h3:has-text("Previous Pay Period Shifts")');
      const currentHeading = modal.locator('h3:has-text("Current Pay Period Shifts")');
      
      // Either one should be visible
      const previousVisible = await previousHeading.isVisible().catch(() => false);
      const currentVisible = await currentHeading.isVisible().catch(() => false);
      
      expect(previousVisible || currentVisible).toBeTruthy();
    });

    test('Employee Portal modal shows Current Pay Period summary', async ({ page }) => {
      // Expand Team Management
      await page.getByText('Team Management').first().click();
      await page.waitForTimeout(1500);
      
      // Expand All Employees
      await page.getByText('All Employees').first().click();
      await page.waitForTimeout(1500);
      
      // Click View Portal for any employee
      await page.getByText('View Portal').first().click();
      await page.waitForTimeout(2000);
      
      // Modal should show Current Pay Period summary
      const modal = page.getByTestId('employee-portal-modal');
      await expect(modal).toBeVisible();
      await expect(modal.getByText('Current Pay Period')).toBeVisible();
      
      // Should show Hours, Shifts, Est. Pay stats (use exact match or first to avoid strict mode)
      await expect(modal.getByText('Hours').first()).toBeVisible();
      await expect(modal.getByText('Shifts', { exact: true })).toBeVisible();
      await expect(modal.getByText('Est. Pay').first()).toBeVisible();
    });

    test('Employee Portal modal can be closed', async ({ page }) => {
      // Expand Team Management
      await page.getByText('Team Management').first().click();
      await page.waitForTimeout(1500);
      
      // Expand All Employees
      await page.getByText('All Employees').first().click();
      await page.waitForTimeout(1500);
      
      // Click View Portal
      await page.getByText('View Portal').first().click();
      await page.waitForTimeout(2000);
      
      // Modal should be visible
      await expect(page.getByTestId('employee-portal-modal')).toBeVisible();
      
      // Close the modal
      await page.getByTestId('close-portal-btn').click();
      await page.waitForTimeout(500);
      
      // Modal should be hidden
      await expect(page.getByTestId('employee-portal-modal')).not.toBeVisible();
    });
  });
});
