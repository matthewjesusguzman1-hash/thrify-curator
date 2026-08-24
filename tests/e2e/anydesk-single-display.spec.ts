import { test, expect } from '@playwright/test';

const BASE_URL = 'https://curator-app-3.preview.emergentagent.com';

test.describe('AnyDesk Single Display Bug Fix', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to auth page
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    
    // Login as admin
    await page.getByTestId('login-email').fill('matthewjesusguzman1@gmail.com');
    await page.getByTestId('login-submit-btn').click();
    
    // Wait for admin code input
    await page.waitForSelector('[data-testid="login-admin-code"]');
    await page.getByTestId('login-admin-code').fill('4399');
    await page.getByTestId('login-submit-btn').click();
    
    // Wait for dashboard to load
    await page.waitForSelector('[data-testid="admin-dashboard"]');
  });

  test('AnyDesk address shows only once in NAME column, not duplicated in HOURLY RATE column', async ({ page }) => {
    // Expand Team Management group
    await page.getByTestId('group-team-toggle').click();
    await page.waitForLoadState('networkidle');
    
    // Expand All Employees section
    await page.getByTestId('employees-section-toggle').click();
    await page.waitForSelector('[data-testid="employees-table"]');
    
    // Find an employee row with AnyDesk address
    const anydeskBadgeInName = page.locator('[data-testid^="anydesk-badge-"]').first();
    const hasAnydeskEmployee = await anydeskBadgeInName.isVisible().catch(() => false);
    
    if (hasAnydeskEmployee) {
      // Get the employee ID from the badge testid
      const badgeTestId = await anydeskBadgeInName.getAttribute('data-testid');
      const employeeId = badgeTestId?.replace('anydesk-badge-', '');
      
      // Count how many AnyDesk badges exist for this employee
      // There should be exactly 1 in the NAME column (anydesk-badge-{id})
      // The HOURLY RATE column badge was removed (anydesk-address-{id} should NOT exist)
      const nameColumnBadge = page.locator(`[data-testid="anydesk-badge-${employeeId}"]`);
      const hourlyRateColumnBadge = page.locator(`[data-testid="anydesk-address-${employeeId}"]`);
      
      // NAME column badge should be visible
      await expect(nameColumnBadge).toBeVisible();
      
      // HOURLY RATE column badge should NOT be visible (removed duplicate)
      const hourlyRateBadgeVisible = await hourlyRateColumnBadge.isVisible().catch(() => false);
      expect(hourlyRateBadgeVisible).toBe(false);
      
      // Verify the AnyDesk address text is correct
      const anydeskText = await nameColumnBadge.textContent();
      expect(anydeskText).toContain('987 654 321');
      
      await page.screenshot({ path: 'anydesk-single-display.jpeg', quality: 20, fullPage: false });
    } else {
      console.log('No employee with AnyDesk address found');
      test.skip();
    }
  });
});
