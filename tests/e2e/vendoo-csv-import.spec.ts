import { test, expect } from '@playwright/test';

test.describe('Vendoo CSV Import and Sales Data Analytics', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to homepage and wait for splash screen
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);
    
    // Click on Employee Portal
    await page.locator('text=Employee Portal').click();
    await page.waitForTimeout(2000);
    
    // Enter admin email
    await page.locator('input[placeholder*="email" i]').fill('matthewjesusguzman1@gmail.com');
    await page.waitForTimeout(500);
    
    // Click Find My Account
    await page.locator('button:has-text("Find My Account")').click();
    await page.waitForTimeout(2000);
    
    // Enter admin access code
    await page.locator('input[placeholder*="4-digit" i]').fill('4399');
    await page.waitForTimeout(500);
    
    // Click Sign In
    await page.locator('button:has-text("Sign In")').click();
    await page.waitForTimeout(3000);
    
    // Verify we're on the admin dashboard
    await expect(page.locator('text=Admin Dashboard')).toBeVisible();
  });

  test('Sales Data section shows imported items count', async ({ page }) => {
    // Click on Reports & Operations
    await page.locator('text=Reports & Operations').click();
    await page.waitForTimeout(1000);
    
    // Verify Sales Data section shows items imported
    const salesDataSection = page.locator('text=13,224 items imported');
    await expect(salesDataSection).toBeVisible();
  });

  test('Sales Data section is accessible', async ({ page }) => {
    // Click on Reports & Operations
    await page.locator('text=Reports & Operations').click();
    await page.waitForTimeout(1000);
    
    // Verify Sales Data section exists
    const salesDataLabel = page.locator('text=Sales Data').first();
    await expect(salesDataLabel).toBeVisible();
  });

  test('Reports section is accessible', async ({ page }) => {
    // Click on Reports & Operations
    await page.locator('text=Reports & Operations').click();
    await page.waitForTimeout(1000);
    
    // Verify Reports section exists
    const reportsLabel = page.locator('text=Reports').first();
    await expect(reportsLabel).toBeVisible();
  });
});
