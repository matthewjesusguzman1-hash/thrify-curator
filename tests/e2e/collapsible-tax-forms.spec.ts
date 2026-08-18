import { test, expect } from '@playwright/test';

test.describe('Employee Dashboard - Collapsible Tax Forms', () => {
  test.beforeEach(async ({ page }) => {
    // Skip splash screen
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => sessionStorage.setItem('hasSeenSplash', 'true'));
  });

  test('W-9 section expands and collapses on click', async ({ page }) => {
    // Navigate to login page
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    
    // Enter employee email
    const emailInput = page.getByTestId('login-email');
    await expect(emailInput).toBeVisible();
    await emailInput.fill('testemployee@thriftycurator.com');
    
    // Click Find My Account button
    const submitBtn = page.getByTestId('login-submit-btn');
    await submitBtn.click();
    
    // Wait for dashboard to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    
    // Dismiss onboarding modal if present
    const onboardingModal = page.locator('.fixed.inset-0.z-\\[9999\\]');
    if (await onboardingModal.isVisible().catch(() => false)) {
      const xButton = onboardingModal.locator('button').first();
      await xButton.click({ force: true });
      await page.waitForTimeout(500);
    }
    
    // Check if we're on the employee dashboard
    const dashboard = page.getByTestId('employee-dashboard');
    await expect(dashboard).toBeVisible();
    
    // Scroll down to see W-9 section
    const w9Section = page.getByTestId('w9-section');
    await w9Section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    
    // Verify W-9 section is visible
    await expect(w9Section).toBeVisible();
    
    // Verify W-9 trigger is visible
    const w9Trigger = page.getByTestId('w9-collapse-trigger');
    await expect(w9Trigger).toBeVisible();
    
    // Verify W-9 content is initially hidden (collapsed)
    const submitW9Btn = page.getByTestId('submit-w9-btn');
    await expect(submitW9Btn).not.toBeVisible();
    
    // Click to expand W-9 section
    await w9Trigger.click();
    await page.waitForTimeout(300);
    
    // Verify W-9 content is now visible
    await expect(submitW9Btn).toBeVisible();
    
    // Verify Get W-9 Form button is visible
    const getW9FormBtn = page.getByTestId('get-w9-form-btn');
    await expect(getW9FormBtn).toBeVisible();
    
    // Click to collapse W-9 section
    await w9Trigger.click();
    await page.waitForTimeout(300);
    
    // Verify W-9 content is hidden again
    await expect(submitW9Btn).not.toBeVisible();
  });

  test('W-8BEN section expands and collapses on click', async ({ page }) => {
    // Navigate to login page
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    
    // Enter employee email
    const emailInput = page.getByTestId('login-email');
    await expect(emailInput).toBeVisible();
    await emailInput.fill('testemployee@thriftycurator.com');
    
    // Click Find My Account button
    const submitBtn = page.getByTestId('login-submit-btn');
    await submitBtn.click();
    
    // Wait for dashboard to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    
    // Dismiss onboarding modal if present
    const onboardingModal = page.locator('.fixed.inset-0.z-\\[9999\\]');
    if (await onboardingModal.isVisible().catch(() => false)) {
      const xButton = onboardingModal.locator('button').first();
      await xButton.click({ force: true });
      await page.waitForTimeout(500);
    }
    
    // Check if we're on the employee dashboard
    const dashboard = page.getByTestId('employee-dashboard');
    await expect(dashboard).toBeVisible();
    
    // Scroll down to see W-8BEN section
    const w8benSection = page.getByTestId('w8ben-section');
    await w8benSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    
    // Verify W-8BEN section is visible
    await expect(w8benSection).toBeVisible();
    
    // Verify W-8BEN trigger is visible
    const w8benTrigger = page.getByTestId('w8ben-collapse-trigger');
    await expect(w8benTrigger).toBeVisible();
    
    // Verify W-8BEN content is initially hidden (collapsed)
    const submitW8benBtn = page.getByTestId('submit-w8ben-btn');
    await expect(submitW8benBtn).not.toBeVisible();
    
    // Click to expand W-8BEN section
    await w8benTrigger.click();
    await page.waitForTimeout(300);
    
    // Verify W-8BEN content is now visible
    await expect(submitW8benBtn).toBeVisible();
    
    // Verify Get W-8BEN Form button is visible
    const getW8benFormBtn = page.getByTestId('get-w8ben-form-btn');
    await expect(getW8benFormBtn).toBeVisible();
    
    // Click to collapse W-8BEN section
    await w8benTrigger.click();
    await page.waitForTimeout(300);
    
    // Verify W-8BEN content is hidden again
    await expect(submitW8benBtn).not.toBeVisible();
  });

  test('chevron icon rotates when sections expand/collapse', async ({ page }) => {
    // Navigate to login page
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    
    // Enter employee email
    const emailInput = page.getByTestId('login-email');
    await expect(emailInput).toBeVisible();
    await emailInput.fill('testemployee@thriftycurator.com');
    
    // Click Find My Account button
    const submitBtn = page.getByTestId('login-submit-btn');
    await submitBtn.click();
    
    // Wait for dashboard to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    
    // Dismiss onboarding modal if present
    const onboardingModal = page.locator('.fixed.inset-0.z-\\[9999\\]');
    if (await onboardingModal.isVisible().catch(() => false)) {
      const xButton = onboardingModal.locator('button').first();
      await xButton.click({ force: true });
      await page.waitForTimeout(500);
    }
    
    // Scroll to W-9 section
    const w9Section = page.getByTestId('w9-section');
    await w9Section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    
    // Get W-9 trigger and chevron
    const w9Trigger = page.getByTestId('w9-collapse-trigger');
    const w9Chevron = w9Trigger.locator('svg').last();
    
    // Verify chevron is NOT rotated when collapsed
    await expect(w9Chevron).not.toHaveClass(/rotate-180/);
    
    // Click to expand
    await w9Trigger.click();
    await page.waitForTimeout(300);
    
    // Verify chevron IS rotated when expanded
    await expect(w9Chevron).toHaveClass(/rotate-180/);
    
    // Click to collapse
    await w9Trigger.click();
    await page.waitForTimeout(300);
    
    // Verify chevron is NOT rotated again
    await expect(w9Chevron).not.toHaveClass(/rotate-180/);
  });
});
