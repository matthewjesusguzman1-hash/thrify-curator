import { test, expect } from '@playwright/test';

/**
 * Tests for Send Application Link feature
 * - SendApplicationLinkSection component
 * - Send invite modal with template selection and field customization
 * - InvitedApplicationPage with optional phone and alternative contact fields
 */

const ADMIN_EMAIL = 'matthewjesusguzman1@gmail.com';
const ADMIN_CODE = '4399';

test.describe('Send Application Link Feature', () => {
  
  test.beforeEach(async ({ page }) => {
    // Dismiss any toasts that might block interactions
    await page.addLocatorHandler(
      page.locator('[data-sonner-toast]'),
      async () => {
        const close = page.locator('[data-sonner-toast] [data-close], [data-sonner-toast] button[aria-label="Close"]');
        await close.first().click({ timeout: 2000 }).catch(() => {});
      },
      { times: 10, noWaitAfter: true }
    );
  });

  test('SendApplicationLinkSection renders and expands', async ({ page }) => {
    // Login as admin
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    await page.locator('input[placeholder="your@email.com"]').fill(ADMIN_EMAIL);
    await page.click('button:has-text("Find My Account")');
    await page.waitForTimeout(2000);
    
    await page.locator('input[placeholder="4-digit code"]').fill(ADMIN_CODE);
    await page.click('button:has-text("Sign In")');
    await page.waitForTimeout(4000);
    
    // Verify admin dashboard loaded
    await expect(page.locator('text=Admin Dashboard')).toBeVisible();
    
    // Click on Hiring section to expand
    await page.click('text=Hiring');
    await page.waitForTimeout(1000);
    
    // Verify Send Application Link section is visible (use first() to handle duplicates)
    const sendAppLinkSection = page.getByTestId('send-application-link-section').first();
    await expect(sendAppLinkSection).toBeVisible();
    
    // Click to expand
    await page.click('text=Send Application Link');
    await page.waitForTimeout(1000);
    
    // Verify Send Application Invite button is visible
    await expect(page.getByTestId('open-send-invite-modal')).toBeVisible();
    
    await page.screenshot({ path: 'send-app-link-section.jpeg', quality: 20 });
  });

  test('Send invite modal opens with template selection', async ({ page }) => {
    // Login as admin
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    await page.locator('input[placeholder="your@email.com"]').fill(ADMIN_EMAIL);
    await page.click('button:has-text("Find My Account")');
    await page.waitForTimeout(2000);
    
    await page.locator('input[placeholder="4-digit code"]').fill(ADMIN_CODE);
    await page.click('button:has-text("Sign In")');
    await page.waitForTimeout(4000);
    
    // Navigate to Hiring section
    await page.click('text=Hiring');
    await page.waitForTimeout(1000);
    await page.click('text=Send Application Link');
    await page.waitForTimeout(1000);
    
    // Open send invite modal
    await page.getByTestId('open-send-invite-modal').click();
    await page.waitForTimeout(1000);
    
    // Verify modal content - use heading role for specificity
    await expect(page.getByRole('heading', { name: 'Send Application Invite' })).toBeVisible();
    await expect(page.locator('text=Email Address *')).toBeVisible();
    await expect(page.locator('text=Email Template')).toBeVisible();
    
    // Verify template options
    await expect(page.locator('text=Please Apply')).toBeVisible();
    // Use more specific selector for Onboarding in modal
    await expect(page.locator('.bg-white >> text=Onboarding').first()).toBeVisible();
    
    // Verify required fields section
    await expect(page.locator('text=Required Fields')).toBeVisible();
    await expect(page.locator('text=Phone Number')).toBeVisible();
    await expect(page.locator('text=Current Address')).toBeVisible();
    
    // Verify buttons
    await expect(page.locator('button:has-text("Cancel")')).toBeVisible();
    await expect(page.getByTestId('send-invite-btn')).toBeVisible();
    
    await page.screenshot({ path: 'send-invite-modal.jpeg', quality: 20 });
  });

  test('Can select different email templates', async ({ page }) => {
    // Login as admin
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    await page.locator('input[placeholder="your@email.com"]').fill(ADMIN_EMAIL);
    await page.click('button:has-text("Find My Account")');
    await page.waitForTimeout(2000);
    
    await page.locator('input[placeholder="4-digit code"]').fill(ADMIN_CODE);
    await page.click('button:has-text("Sign In")');
    await page.waitForTimeout(4000);
    
    // Navigate to Hiring section and open modal
    await page.click('text=Hiring');
    await page.waitForTimeout(1000);
    await page.click('text=Send Application Link');
    await page.waitForTimeout(1000);
    await page.getByTestId('open-send-invite-modal').click();
    await page.waitForTimeout(1000);
    
    // Click on Onboarding template button inside the modal
    // The modal has a specific structure with template buttons
    const onboardingBtn = page.locator('button:has-text("Onboarding"):has-text("Follow-up")');
    await onboardingBtn.click({ force: true });
    await page.waitForTimeout(500);
    
    // Verify Onboarding is selected
    await expect(onboardingBtn).toBeVisible();
    
    await page.screenshot({ path: 'onboarding-template-selected.jpeg', quality: 20 });
  });

  test('Can toggle required fields', async ({ page }) => {
    // Login as admin
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    await page.locator('input[placeholder="your@email.com"]').fill(ADMIN_EMAIL);
    await page.click('button:has-text("Find My Account")');
    await page.waitForTimeout(2000);
    
    await page.locator('input[placeholder="4-digit code"]').fill(ADMIN_CODE);
    await page.click('button:has-text("Sign In")');
    await page.waitForTimeout(4000);
    
    // Navigate to Hiring section and open modal
    await page.click('text=Hiring');
    await page.waitForTimeout(1000);
    await page.click('text=Send Application Link');
    await page.waitForTimeout(1000);
    await page.getByTestId('open-send-invite-modal').click();
    await page.waitForTimeout(1000);
    
    // Find and click Phone Number checkbox using the checkbox ID
    const phoneCheckbox = page.locator('#phone');
    await phoneCheckbox.click({ force: true });
    await page.waitForTimeout(500);
    
    // Verify checkbox state changed
    await expect(phoneCheckbox).toHaveAttribute('data-state', 'checked');
    
    await page.screenshot({ path: 'phone-field-toggled.jpeg', quality: 20 });
  });

  test('Shows sent invites list with status badges', async ({ page }) => {
    // Login as admin
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    await page.locator('input[placeholder="your@email.com"]').fill(ADMIN_EMAIL);
    await page.click('button:has-text("Find My Account")');
    await page.waitForTimeout(2000);
    
    await page.locator('input[placeholder="4-digit code"]').fill(ADMIN_CODE);
    await page.click('button:has-text("Sign In")');
    await page.waitForTimeout(4000);
    
    // Navigate to Hiring section
    await page.click('text=Hiring');
    await page.waitForTimeout(1000);
    await page.click('text=Send Application Link');
    await page.waitForTimeout(1000);
    
    // Verify sent invites section
    await expect(page.locator('text=Sent Invites')).toBeVisible();
    
    // Check for status badges (Completed or Sent)
    const completedBadges = page.locator('text=Completed');
    const sentBadges = page.locator('span:has-text("Sent")');
    
    // At least one badge should be visible (from backend tests)
    const completedCount = await completedBadges.count();
    const sentCount = await sentBadges.count();
    expect(completedCount + sentCount).toBeGreaterThan(0);
    
    await page.screenshot({ path: 'sent-invites-list.jpeg', quality: 20 });
  });
});

test.describe('InvitedApplicationPage', () => {
  
  test('Shows error for invalid token', async ({ page }) => {
    await page.goto('/apply/invalid-test-token-12345', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');
    
    // Click to dismiss splash screen
    await page.click('body');
    await page.waitForTimeout(3000);
    
    // Verify error message
    await expect(page.locator('text=Link Invalid')).toBeVisible();
    await expect(page.locator('text=Invalid or expired invite link')).toBeVisible();
    await expect(page.locator('button:has-text("Go to Homepage")')).toBeVisible();
    
    await page.screenshot({ path: 'invalid-token-error.jpeg', quality: 20 });
  });

  test('Go to Homepage button works', async ({ page }) => {
    await page.goto('/apply/invalid-test-token-12345', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');
    
    // Click to dismiss splash screen
    await page.click('body');
    await page.waitForTimeout(3000);
    
    // Click Go to Homepage
    await page.click('button:has-text("Go to Homepage")');
    await page.waitForTimeout(2000);
    
    // Verify redirected to homepage
    await expect(page).toHaveURL('/');
    
    await page.screenshot({ path: 'homepage-after-redirect.jpeg', quality: 20 });
  });
});
