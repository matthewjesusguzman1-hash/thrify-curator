import { test, expect } from '@playwright/test';
import { removeEmergentBadge, dismissToasts } from '../fixtures/helpers';

/**
 * Password Reset E2E Tests
 * Tests for email-based password reset (magic link) for employees and consignors
 */

// Helper to wait for splash screen to pass
async function waitForSplash(page: any) {
  // Just wait for the app to load past splash
  await page.waitForLoadState('networkidle');
  // Give extra time for splash screen animation to complete
  await page.waitForTimeout(3000);
}

test.describe('Password Reset - Employee Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await waitForSplash(page);
    await dismissToasts(page);
    await removeEmergentBadge(page);
  });

  test('login page shows email input initially', async ({ page }) => {
    await expect(page.getByTestId('auth-page')).toBeVisible();
    await expect(page.getByTestId('login-email')).toBeVisible();
    await expect(page.getByTestId('login-submit-btn')).toBeVisible();
    // Forgot password link should not be visible before password field appears
    await expect(page.getByTestId('forgot-password-link')).not.toBeVisible();
  });

  test('entering employee email with password shows password field and forgot link', async ({ page }) => {
    // Fill employee email
    await page.getByTestId('login-email').fill('testemployee@thriftycurator.com');
    await page.getByTestId('login-submit-btn').click();
    
    // Wait for password field to appear
    await expect(page.getByTestId('login-password')).toBeVisible();
    
    // Forgot password link should now be visible
    await expect(page.getByTestId('forgot-password-link')).toBeVisible();
    await expect(page.getByTestId('forgot-password-link')).toHaveText(/forgot your password/i);
  });

  test('clicking forgot password opens reset modal', async ({ page }) => {
    // Navigate to password field state
    await page.getByTestId('login-email').fill('testemployee@thriftycurator.com');
    await page.getByTestId('login-submit-btn').click();
    await expect(page.getByTestId('login-password')).toBeVisible();
    
    // Click forgot password
    await page.getByTestId('forgot-password-link').click();
    
    // Modal should appear
    await expect(page.getByTestId('forgot-password-modal')).toBeVisible();
    
    // Modal should have pre-filled email
    await expect(page.getByTestId('forgot-email-input')).toHaveValue('testemployee@thriftycurator.com');
  });

  test('forgot password modal has correct UI elements', async ({ page }) => {
    // Navigate to forgot password modal
    await page.getByTestId('login-email').fill('testemployee@thriftycurator.com');
    await page.getByTestId('login-submit-btn').click();
    await expect(page.getByTestId('login-password')).toBeVisible();
    await page.getByTestId('forgot-password-link').click();
    await expect(page.getByTestId('forgot-password-modal')).toBeVisible();
    
    // Check modal elements
    await expect(page.getByRole('heading', { name: /reset password/i })).toBeVisible();
    await expect(page.getByTestId('forgot-email-input')).toBeVisible();
    await expect(page.getByTestId('send-reset-btn')).toBeVisible();
    await expect(page.getByRole('button', { name: /cancel/i })).toBeVisible();
    
    // Send button should be enabled when email is present
    await expect(page.getByTestId('send-reset-btn')).toBeEnabled();
  });

  test('can edit email in forgot password modal', async ({ page }) => {
    await page.getByTestId('login-email').fill('testemployee@thriftycurator.com');
    await page.getByTestId('login-submit-btn').click();
    await expect(page.getByTestId('login-password')).toBeVisible();
    await page.getByTestId('forgot-password-link').click();
    await expect(page.getByTestId('forgot-password-modal')).toBeVisible();
    
    // Edit email
    await page.getByTestId('forgot-email-input').clear();
    await page.getByTestId('forgot-email-input').fill('different@email.com');
    await expect(page.getByTestId('forgot-email-input')).toHaveValue('different@email.com');
  });

  test('sending reset email shows success message', async ({ page }) => {
    await page.getByTestId('login-email').fill('testemployee@thriftycurator.com');
    await page.getByTestId('login-submit-btn').click();
    await expect(page.getByTestId('login-password')).toBeVisible();
    await page.getByTestId('forgot-password-link').click();
    await expect(page.getByTestId('forgot-password-modal')).toBeVisible();
    
    // Send reset link
    await page.getByTestId('send-reset-btn').click();
    
    // Should show success state in modal
    await expect(page.getByText(/check your email/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /close/i })).toBeVisible();
  });

  test('cancel button closes forgot password modal', async ({ page }) => {
    await page.getByTestId('login-email').fill('testemployee@thriftycurator.com');
    await page.getByTestId('login-submit-btn').click();
    await expect(page.getByTestId('login-password')).toBeVisible();
    await page.getByTestId('forgot-password-link').click();
    await expect(page.getByTestId('forgot-password-modal')).toBeVisible();
    
    // Click cancel
    await page.getByRole('button', { name: /cancel/i }).click();
    
    // Modal should close
    await expect(page.getByTestId('forgot-password-modal')).not.toBeVisible();
  });
});

test.describe('Password Reset Page - Invalid Token', () => {
  test('invalid token shows error state', async ({ page }) => {
    await page.goto('/reset-password/invalid-token-12345', { waitUntil: 'domcontentloaded' });
    await waitForSplash(page);
    await removeEmergentBadge(page);
    await dismissToasts(page);
    
    // Should show invalid reset link page
    await expect(page.getByTestId('reset-password-invalid')).toBeVisible();
    await expect(page.getByRole('heading', { name: /invalid reset link/i })).toBeVisible();
  });

  test('invalid token page has navigation buttons', async ({ page }) => {
    await page.goto('/reset-password/invalid-token-xyz', { waitUntil: 'domcontentloaded' });
    await waitForSplash(page);
    await removeEmergentBadge(page);
    
    await expect(page.getByTestId('reset-password-invalid')).toBeVisible();
    
    // Should have navigation buttons
    await expect(page.getByRole('button', { name: /back to employee login/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /back to consignment portal/i })).toBeVisible();
  });

  test('clicking back to employee login navigates correctly', async ({ page }) => {
    await page.goto('/reset-password/invalid-token-nav', { waitUntil: 'domcontentloaded' });
    await waitForSplash(page);
    await removeEmergentBadge(page);
    
    await expect(page.getByTestId('reset-password-invalid')).toBeVisible();
    
    // Click back to employee login
    await page.getByRole('button', { name: /back to employee login/i }).click();
    
    // Should navigate to login page
    await expect(page).toHaveURL(/\/login/);
  });

  test('clicking back to consignment portal navigates correctly', async ({ page }) => {
    await page.goto('/reset-password/invalid-token-consign', { waitUntil: 'domcontentloaded' });
    await waitForSplash(page);
    await removeEmergentBadge(page);
    
    await expect(page.getByTestId('reset-password-invalid')).toBeVisible();
    
    // Click back to consignment portal
    await page.getByRole('button', { name: /back to consignment portal/i }).click();
    
    // Should navigate to consignment page
    await expect(page).toHaveURL(/\/consignment-agreement/);
  });

  test('random secure token shows error', async ({ page }) => {
    const randomToken = Array.from({ length: 32 }, () => 
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 62)]
    ).join('');
    
    await page.goto(`/reset-password/${randomToken}`, { waitUntil: 'domcontentloaded' });
    await waitForSplash(page);
    await removeEmergentBadge(page);
    
    await expect(page.getByTestId('reset-password-invalid')).toBeVisible();
  });
});

test.describe('Password Reset - API Integration', () => {
  test('API returns correct error for invalid token validation', async ({ request }) => {
    const response = await request.get('/api/password-reset/validate/invalid-api-token');
    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.detail.toLowerCase()).toContain('invalid');
  });

  test('API returns correct error for invalid reset attempt', async ({ request }) => {
    const response = await request.post('/api/password-reset/reset', {
      data: {
        token: 'invalid-token-for-reset',
        new_password: 'newpassword123'
      }
    });
    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.detail.toLowerCase()).toContain('invalid');
  });

  test('API accepts employee password reset request', async ({ request }) => {
    const response = await request.post('/api/password-reset/request', {
      data: {
        email: 'testemployee@thriftycurator.com',
        user_type: 'employee'
      }
    });
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
  });

  test('API accepts consignor password reset request', async ({ request }) => {
    const response = await request.post('/api/password-reset/request', {
      data: {
        email: 'test@example.com',
        user_type: 'consignor'
      }
    });
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
  });
});
