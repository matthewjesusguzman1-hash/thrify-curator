import { test, expect } from '@playwright/test';

const BASE_URL = 'https://curator-app-3.preview.emergentagent.com';

test.describe('Bug Fix Verification Tests', () => {
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

  test('AnyDesk address displays in All Employees section for any employee with anydesk_address', async ({ page }) => {
    // Expand Team Management group
    await page.getByTestId('group-team-toggle').click();
    await page.waitForLoadState('networkidle');
    
    // Expand All Employees section
    await page.getByTestId('employees-section-toggle').click();
    await page.waitForSelector('[data-testid="employees-table"]');
    
    // Look for AnyDesk badge - should be visible for Test Employee who has anydesk_address
    // The anydesk-badge-{id} is in the name column for mobile visibility
    const anydeskBadge = page.locator('[data-testid^="anydesk-badge-"]').first();
    await expect(anydeskBadge).toBeVisible();
    
    // Verify the AnyDesk address is displayed
    const anydeskText = await anydeskBadge.textContent();
    expect(anydeskText).toContain('987 654 321');
    
    await page.screenshot({ path: 'anydesk-display-verified.jpeg', quality: 20, fullPage: false });
  });

  test('AnyDesk address click-to-copy functionality works', async ({ page }) => {
    // Expand Team Management group
    await page.getByTestId('group-team-toggle').click();
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
    
    await page.screenshot({ path: 'anydesk-copied-verified.jpeg', quality: 20, fullPage: false });
  });

  test('Email status badges (Sent/Opened) visible in Send Invites tab', async ({ page }) => {
    // Expand Hiring group
    await page.getByTestId('group-hiring-toggle').click();
    await page.waitForLoadState('networkidle');
    
    // Expand Send Application Link section - use first() to avoid strict mode violation
    await page.getByTestId('send-application-link-section').first().click();
    await page.waitForLoadState('networkidle');
    
    // Check for status badges in the invites list
    // Look for Sent, Opened, or Completed badges
    const sentBadge = page.locator('text=Sent').first();
    const openedBadge = page.locator('text=Opened').first();
    const completedBadge = page.locator('text=Completed').first();
    
    // At least one of these should be visible
    const hasSentBadge = await sentBadge.isVisible().catch(() => false);
    const hasOpenedBadge = await openedBadge.isVisible().catch(() => false);
    const hasCompletedBadge = await completedBadge.isVisible().catch(() => false);
    
    expect(hasSentBadge || hasOpenedBadge || hasCompletedBadge).toBeTruthy();
    
    await page.screenshot({ path: 'email-status-badges.jpeg', quality: 20, fullPage: false });
  });
});
