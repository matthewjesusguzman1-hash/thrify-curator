import { test, expect } from '@playwright/test';

test.describe('AnyDesk Address Display Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to homepage and login as admin
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    
    // Login as admin
    await page.getByTestId('email-input').fill('matthewjesusguzman1@gmail.com');
    await page.getByTestId('find-account-btn').click();
    
    // Wait for admin code input
    await page.waitForSelector('[data-testid="admin-code-input"]');
    await page.getByTestId('admin-code-input').fill('4399');
    await page.getByTestId('sign-in-btn').click();
    
    // Wait for dashboard to load
    await page.waitForSelector('[data-testid="admin-dashboard"]');
  });

  test('AnyDesk address displays in All Employees section on desktop (HOURLY RATE column)', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });
    
    // Navigate to Team Management
    await page.getByTestId('nav-team-management').click();
    await page.waitForLoadState('networkidle');
    
    // Expand All Employees section
    await page.getByTestId('employees-section-toggle').click();
    await page.waitForSelector('[data-testid="employees-table"]');
    
    // Look for Test Employee's AnyDesk badge in the hourly rate column
    // The anydesk-address-{id} is in the hourly rate column for desktop
    const anydeskAddressBadge = page.locator('[data-testid^="anydesk-address-"]').first();
    await expect(anydeskAddressBadge).toBeVisible();
    
    // Verify the AnyDesk address is displayed
    const anydeskText = await anydeskAddressBadge.textContent();
    expect(anydeskText).toContain('987 654 321');
    
    await page.screenshot({ path: 'anydesk-desktop.jpeg', quality: 20, fullPage: false });
  });

  test('AnyDesk address displays in All Employees section on mobile (NAME column)', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Navigate to Team Management
    await page.getByTestId('nav-team-management').click();
    await page.waitForLoadState('networkidle');
    
    // Expand All Employees section
    await page.getByTestId('employees-section-toggle').click();
    await page.waitForSelector('[data-testid="employees-table"]');
    
    // Look for Test Employee's AnyDesk badge in the name column (mobile view)
    // The anydesk-badge-{id} is in the name column for mobile visibility
    const anydeskBadge = page.locator('[data-testid^="anydesk-badge-"]').first();
    await expect(anydeskBadge).toBeVisible();
    
    // Verify the AnyDesk address is displayed
    const anydeskText = await anydeskBadge.textContent();
    expect(anydeskText).toContain('987 654 321');
    
    await page.screenshot({ path: 'anydesk-mobile.jpeg', quality: 20, fullPage: false });
  });

  test('Click-to-copy functionality for AnyDesk address works', async ({ page }) => {
    // Navigate to Team Management
    await page.getByTestId('nav-team-management').click();
    await page.waitForLoadState('networkidle');
    
    // Expand All Employees section
    await page.getByTestId('employees-section-toggle').click();
    await page.waitForSelector('[data-testid="employees-table"]');
    
    // Click on the AnyDesk badge to copy
    const anydeskBadge = page.locator('[data-testid^="anydesk-badge-"]').first();
    await expect(anydeskBadge).toBeVisible();
    
    // Click to copy
    await anydeskBadge.click();
    
    // Wait for toast notification
    await expect(page.locator('text=AnyDesk address copied')).toBeVisible();
    
    await page.screenshot({ path: 'anydesk-copied.jpeg', quality: 20, fullPage: false });
  });
});
