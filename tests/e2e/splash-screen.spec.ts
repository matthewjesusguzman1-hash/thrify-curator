import { test, expect } from '@playwright/test';

test.describe('Splash Screen Tests', () => {
  test('splash screen displays with animated blobs and Thrifty Curator branding', async ({ page }) => {
    // Clear session storage to see splash screen
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => sessionStorage.removeItem('hasSeenSplash'));
    await page.reload({ waitUntil: 'domcontentloaded' });
    
    // Wait for splash screen to appear
    const splashScreen = page.getByTestId('splash-screen');
    await expect(splashScreen).toBeVisible();
    
    // Wait for animations to start
    await page.waitForTimeout(800);
    
    // Verify splash screen has the correct structure
    await expect(splashScreen).toHaveClass(/fixed/);
    await expect(splashScreen).toHaveClass(/inset-0/);
    await expect(splashScreen).toHaveClass(/bg-gradient-to-br/);
    
    // Verify Thrifty Curator branding text is visible WITHIN the splash screen
    const splashTitle = splashScreen.getByRole('heading', { name: 'Thrifty Curator' });
    await expect(splashTitle).toBeVisible();
    await expect(splashTitle).toHaveClass(/font-poppins/);
    
    // Verify tagline is visible within splash screen
    await expect(splashScreen.getByText('Curated Resale Finds')).toBeVisible();
    
    // Verify logo is visible within splash screen
    const logo = splashScreen.locator('img[alt="Thrifty Curator"]');
    await expect(logo).toBeVisible();
    
    // Verify loading dots are visible (animated elements)
    const loadingDots = splashScreen.locator('.rounded-full').first();
    await expect(loadingDots).toBeVisible();
    
    // Wait for splash screen to complete (3 seconds)
    await page.waitForTimeout(3000);
    
    // Splash screen should be gone
    await expect(splashScreen).not.toBeVisible();
  });

  test('splash screen does not show again after first visit', async ({ page }) => {
    // First visit - see splash screen
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => sessionStorage.removeItem('hasSeenSplash'));
    await page.reload({ waitUntil: 'domcontentloaded' });
    
    const splashScreen = page.getByTestId('splash-screen');
    await expect(splashScreen).toBeVisible();
    
    // Wait for splash to complete
    await page.waitForTimeout(3500);
    await expect(splashScreen).not.toBeVisible();
    
    // Verify session storage is set
    const hasSeenSplash = await page.evaluate(() => sessionStorage.getItem('hasSeenSplash'));
    expect(hasSeenSplash).toBe('true');
    
    // Reload page - splash should NOT appear
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    
    // Splash screen should not be visible
    await expect(splashScreen).not.toBeVisible();
  });
});
