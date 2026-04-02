import { test, expect } from '@playwright/test';

/**
 * Issued 1099s Page E2E Tests
 * Tests the 1099-NEC email with PDF attachment feature
 */

const ADMIN_EMAIL = 'matthewjesusguzman1@gmail.com';
const ADMIN_CODE = '4399';
const TEST_YEAR = 2025;

test.describe('Issued 1099s Page - Email with PDF Attachment', () => {
  test.beforeEach(async ({ page }) => {
    // Skip splash screen
    await page.addInitScript(() => {
      sessionStorage.setItem('hasSeenSplash', 'true');
    });
    
    // Login as admin
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('input[placeholder="your@email.com"]');
    await page.fill('input[placeholder="your@email.com"]', ADMIN_EMAIL);
    await page.click('button:has-text("Find My Account")');
    await page.waitForSelector('input[placeholder="4-digit code"]');
    await page.fill('input[placeholder="4-digit code"]', ADMIN_CODE);
    await page.click('button:has-text("Sign In")');
    await page.waitForURL(/\/admin/);
  });

  test('should display Issued 1099s page with entries', async ({ page }) => {
    await page.goto(`/admin/tax-prep/issued-1099s?year=${TEST_YEAR}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    
    // Check page title - use heading role to be specific
    await expect(page.getByRole('heading', { name: /1099s Issued/i })).toBeVisible();
    
    // Check summary card
    await expect(page.getByText('Total Paid to Contractors')).toBeVisible();
    
    // Check Add button
    await expect(page.getByRole('button', { name: /Add 1099 Entry/i })).toBeVisible();
    
    // Check Back to Tax Prep link
    await expect(page.getByText('Back to Tax Prep')).toBeVisible();
  });

  test('should show Actions dropdown with Email button', async ({ page }) => {
    await page.goto(`/admin/tax-prep/issued-1099s?year=${TEST_YEAR}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    
    // Find first entry card with Actions
    const actionsButton = page.getByText('Actions').first();
    await expect(actionsButton).toBeVisible();
    
    // Click to expand
    await actionsButton.click();
    
    // Check action buttons are visible
    await expect(page.getByRole('button', { name: /Generate PDF/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Email/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Save to Portal/i }).first()).toBeVisible();
  });

  test('should open Email modal with correct fields', async ({ page }) => {
    await page.goto(`/admin/tax-prep/issued-1099s?year=${TEST_YEAR}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    
    // Expand Actions on first entry
    await page.getByText('Actions').first().click();
    
    // Click Email button
    await page.getByRole('button', { name: /Email/i }).first().click();
    await page.waitForTimeout(1000);
    
    // Check email modal content
    await expect(page.getByRole('heading', { name: 'Email 1099-NEC' })).toBeVisible();
    await expect(page.getByPlaceholder('Enter email address')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Send Email' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
    
    // Close modal
    await page.getByRole('button', { name: 'Cancel' }).click();
  });

  test('should show form type selection for filed entries', async ({ page }) => {
    await page.goto(`/admin/tax-prep/issued-1099s?year=${TEST_YEAR}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    
    // Find entry with "Filed" badge
    const filedEntry = page.locator('.bg-white.rounded-lg.border.border-gray-200.p-4').filter({ hasText: 'Filed' });
    
    if (await filedEntry.count() > 0) {
      // Expand Actions
      await filedEntry.first().getByText('Actions').click();
      
      // Click Email button
      await filedEntry.first().getByRole('button', { name: /Email/i }).click();
      await page.waitForTimeout(1000);
      
      // Check form type selection is visible for filed entries
      await expect(page.getByText('Which form to send?')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Draft 1099' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Filed 1099' })).toBeVisible();
      
      // Close modal
      await page.getByRole('button', { name: 'Cancel' }).click();
    }
  });

  test('should generate PDF for 1099 entry', async ({ page }) => {
    await page.goto(`/admin/tax-prep/issued-1099s?year=${TEST_YEAR}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    
    // Expand Actions on first entry
    await page.getByText('Actions').first().click();
    
    // Set up download listener
    const downloadPromise = page.waitForEvent('download');
    
    // Click Generate PDF button
    await page.getByRole('button', { name: /Generate PDF/i }).first().click();
    
    // Wait for download
    const download = await downloadPromise;
    
    // Verify download filename contains 1099
    expect(download.suggestedFilename()).toContain('1099');
  });
});
