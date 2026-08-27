import { test, expect } from '@playwright/test';

/**
 * AnyDesk Reversal from RustDesk - Verification Tests
 * 
 * These tests verify that all RustDesk references have been replaced with AnyDesk
 * and that the AnyDesk functionality works correctly for remote workers.
 */

test.describe('AnyDesk Reversal Verification', () => {
  
  test('Contractor agreement API returns AnyDesk references (not RustDesk)', async ({ request, baseURL }) => {
    const response = await request.get(`${baseURL}/api/contractor-agreement/text`);
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    const agreementText = data.agreement_text.toLowerCase();
    
    // Verify AnyDesk is mentioned
    expect(agreementText).toContain('anydesk');
    
    // Verify NO RustDesk references
    expect(agreementText).not.toContain('rustdesk');
    
    // Verify specific AnyDesk references in the agreement
    expect(data.agreement_text).toContain('AnyDesk remote desktop software');
    expect(data.agreement_text).toContain('authorized AnyDesk access channels');
    expect(data.agreement_text).toContain('AnyDesk addresses');
  });

  test('AnyDesk address update endpoint exists', async ({ request, baseURL }) => {
    // Try to call the AnyDesk endpoint without auth (should return 401 or 403, not 404)
    const response = await request.post(`${baseURL}/api/time/employees/me/anydesk`, {
      data: { anydesk_address: '123 456 789' }
    });
    
    // Should return 401 or 403 (not authenticated/forbidden) not 404 (not found)
    expect([401, 403]).toContain(response.status());
  });

  test('Admin dashboard has no RustDesk references', async ({ page }) => {
    // Login as admin
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    
    await page.getByTestId('login-email').fill('matthewjesusguzman1@gmail.com');
    await page.getByTestId('login-submit-btn').click();
    await page.waitForSelector('[data-testid="login-admin-code"]');
    await page.getByTestId('login-admin-code').fill('4399');
    await page.getByTestId('login-submit-btn').click();
    await page.waitForSelector('[data-testid="admin-dashboard"]');
    
    // Check main dashboard
    let pageContent = await page.content();
    expect(pageContent.toLowerCase()).not.toContain('rustdesk');
    
    // Expand Team Management
    await page.getByTestId('group-team-toggle').click();
    await page.waitForLoadState('networkidle');
    
    pageContent = await page.content();
    expect(pageContent.toLowerCase()).not.toContain('rustdesk');
    
    // Expand Hiring
    await page.getByTestId('group-hiring-toggle').click();
    await page.waitForLoadState('networkidle');
    
    pageContent = await page.content();
    expect(pageContent.toLowerCase()).not.toContain('rustdesk');
  });

  test('All Employees section shows AnyDesk badge (not RustDesk)', async ({ page }) => {
    // Login as admin
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    
    await page.getByTestId('login-email').fill('matthewjesusguzman1@gmail.com');
    await page.getByTestId('login-submit-btn').click();
    await page.waitForSelector('[data-testid="login-admin-code"]');
    await page.getByTestId('login-admin-code').fill('4399');
    await page.getByTestId('login-submit-btn').click();
    await page.waitForSelector('[data-testid="admin-dashboard"]');
    
    // Navigate to Team Management group
    await page.getByTestId('group-team-toggle').click();
    await page.waitForLoadState('networkidle');
    
    // Expand All Employees section
    await page.getByTestId('employees-section-toggle').click();
    await page.waitForSelector('[data-testid="employees-table"]');
    
    // Check page content for AnyDesk references and NO RustDesk
    const pageContent = await page.content();
    
    // Verify NO RustDesk text exists anywhere
    expect(pageContent.toLowerCase()).not.toContain('rustdesk');
    
    // Check if any employee has AnyDesk badge
    const anydeskBadge = page.locator('[data-testid^="anydesk-badge-"]').first();
    const hasAnydeskEmployee = await anydeskBadge.isVisible().catch(() => false);
    
    if (hasAnydeskEmployee) {
      // Verify the badge is visible and contains AnyDesk address
      await expect(anydeskBadge).toBeVisible();
      const badgeText = await anydeskBadge.textContent();
      expect(badgeText).toBeTruthy();
    }
  });

  test('Send Application Link section shows AnyDesk option (not RustDesk)', async ({ page }) => {
    // Login as admin
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    
    await page.getByTestId('login-email').fill('matthewjesusguzman1@gmail.com');
    await page.getByTestId('login-submit-btn').click();
    await page.waitForSelector('[data-testid="login-admin-code"]');
    await page.getByTestId('login-admin-code').fill('4399');
    await page.getByTestId('login-submit-btn').click();
    await page.waitForSelector('[data-testid="admin-dashboard"]');
    
    // Navigate to Hiring group
    await page.getByTestId('group-hiring-toggle').click();
    await page.waitForLoadState('networkidle');
    
    // Wait for the section to be visible
    await page.waitForSelector('[data-testid="send-application-link-section"]');
    
    // Find and expand the Onboarding & Applications section
    const onboardingSection = page.locator('[data-testid="send-application-link-section"]').first();
    await expect(onboardingSection).toBeVisible();
    
    // Click on the section header to expand it
    await onboardingSection.locator('button').first().click();
    await page.waitForLoadState('networkidle');
    
    // Click on Onboarding tab
    const onboardingTab = page.getByRole('button', { name: /Onboarding \(/ });
    await onboardingTab.click();
    await page.waitForLoadState('networkidle');
    
    // Look for "Send Onboarding Email" button
    const sendOnboardingBtn = page.locator('button:has-text("Send Onboarding Email")');
    const hasSendBtn = await sendOnboardingBtn.isVisible().catch(() => false);
    
    if (hasSendBtn) {
      await sendOnboardingBtn.click();
      await page.waitForLoadState('networkidle');
      
      // Check for AnyDesk checkbox option
      const anydeskCheckbox = page.locator('label:has-text("Include AnyDesk Instructions")');
      await expect(anydeskCheckbox).toBeVisible();
      
      // Verify NO RustDesk text exists
      const pageContent = await page.content();
      expect(pageContent.toLowerCase()).not.toContain('rustdesk');
    } else {
      // If no onboarding applications, check the section content
      const pageContent = await page.content();
      expect(pageContent.toLowerCase()).not.toContain('rustdesk');
    }
  });

  test('Remote worker dashboard shows AnyDesk section with quick-connect button', async ({ page }) => {
    // Login as remote worker
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    
    await page.getByTestId('login-email').fill('remote_worker@test.com');
    await page.getByTestId('login-submit-btn').click();
    
    // Wait for dashboard to load
    await page.waitForSelector('[data-testid="employee-dashboard"]');
    
    // Dismiss walkthrough modal if present
    const skipBtn = page.locator('button:has-text("Skip")');
    await skipBtn.click({ force: true }).catch(() => {});
    await page.waitForLoadState('networkidle');
    
    // Scroll down to find AnyDesk section
    const anydeskSection = page.getByTestId('anydesk-section');
    await anydeskSection.scrollIntoViewIfNeeded();
    
    // Verify AnyDesk section is visible
    await expect(anydeskSection).toBeVisible();
    
    // Verify quick-connect button exists and has correct href
    const quickConnectBtn = page.getByTestId('anydesk-quick-connect');
    await expect(quickConnectBtn).toBeVisible();
    
    const href = await quickConnectBtn.getAttribute('href');
    expect(href).toContain('anydesk:');
    expect(href).toContain('1396262135'); // Company AnyDesk ID without spaces
    
    // Verify button text
    await expect(quickConnectBtn).toContainText('Connect to Work Computer');
    
    // Verify page content has AnyDesk references and NO RustDesk
    const pageContent = await page.content();
    expect(pageContent).toContain('AnyDesk');
    expect(pageContent).toContain('AnyDesk Remote Desktop');
    expect(pageContent).toContain('Download AnyDesk');
    expect(pageContent).toContain('Manual Connection Details');
    expect(pageContent.toLowerCase()).not.toContain('rustdesk');
    
    // Verify NO password is displayed in the section
    // The password should not be stored or displayed per requirements
    expect(pageContent).not.toMatch(/Password:\s*\d/);
  });
});
