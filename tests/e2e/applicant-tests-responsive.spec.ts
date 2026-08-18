import { test, expect } from '@playwright/test';

test.describe('Applicant Skills Tests - Responsive Layout', () => {
  test.beforeEach(async ({ page }) => {
    // Set session storage to skip splash screen
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      sessionStorage.setItem('hasSeenSplash', 'true');
      localStorage.setItem('hasSeenOnboarding', 'true');
    });
  });

  async function loginAsAdmin(page) {
    await page.goto('/admin', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    
    // Enter owner code directly
    await page.fill('input[type="email"], input[placeholder*="email"]', '4399');
    await page.click('button:has-text("Find My Account")');
    await page.waitForLoadState('networkidle');
    
    // Wait for admin dashboard to load
    await expect(page.getByText('Admin Dashboard')).toBeVisible();
  }

  async function navigateToApplicantTests(page) {
    // Click on Forms & Communications group
    const formsGroup = page.getByTestId('group-forms');
    await formsGroup.click();
    
    // Wait for the group to expand and scroll to Applicant Tests section
    const applicantTestsSection = page.getByTestId('applicant-tests-section');
    await applicantTestsSection.scrollIntoViewIfNeeded();
    await expect(applicantTestsSection).toBeVisible();
  }

  test('Applicant Tests buttons visible in portrait mode (390x844)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsAdmin(page);
    await navigateToApplicantTests(page);
    
    // Verify the Create Test button is visible
    const createTestBtn = page.getByTestId('create-test-btn');
    await expect(createTestBtn).toBeVisible();
    
    // Check if there are any test cards
    const viewBtn = page.getByTestId('test-card-view-btn').first();
    const inviteBtn = page.getByTestId('test-card-invite-btn').first();
    const deleteBtn = page.getByTestId('test-card-delete-btn').first();
    
    // If test cards exist, verify all buttons are visible
    if (await viewBtn.isVisible()) {
      await expect(viewBtn).toBeVisible();
      await expect(inviteBtn).toBeVisible();
      await expect(deleteBtn).toBeVisible();
      
      // Verify buttons are clickable (not cut off)
      const viewBtnBox = await viewBtn.boundingBox();
      const inviteBtnBox = await inviteBtn.boundingBox();
      const deleteBtnBox = await deleteBtn.boundingBox();
      
      expect(viewBtnBox).not.toBeNull();
      expect(inviteBtnBox).not.toBeNull();
      expect(deleteBtnBox).not.toBeNull();
      
      // Verify buttons are within viewport
      expect(viewBtnBox!.x + viewBtnBox!.width).toBeLessThanOrEqual(390);
      expect(inviteBtnBox!.x + inviteBtnBox!.width).toBeLessThanOrEqual(390);
      expect(deleteBtnBox!.x + deleteBtnBox!.width).toBeLessThanOrEqual(390);
    }
    
    await page.screenshot({ path: 'applicant-tests-portrait-390.jpeg', quality: 20 });
  });

  test('Applicant Tests buttons visible in narrow portrait mode (320x568)', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await loginAsAdmin(page);
    await navigateToApplicantTests(page);
    
    // Verify the Create Test button is visible
    const createTestBtn = page.getByTestId('create-test-btn');
    await expect(createTestBtn).toBeVisible();
    
    // Check if there are any test cards
    const viewBtn = page.getByTestId('test-card-view-btn').first();
    const inviteBtn = page.getByTestId('test-card-invite-btn').first();
    const deleteBtn = page.getByTestId('test-card-delete-btn').first();
    
    // If test cards exist, verify all buttons are visible
    if (await viewBtn.isVisible()) {
      await expect(viewBtn).toBeVisible();
      await expect(inviteBtn).toBeVisible();
      await expect(deleteBtn).toBeVisible();
      
      // Verify buttons are clickable (not cut off)
      const viewBtnBox = await viewBtn.boundingBox();
      const inviteBtnBox = await inviteBtn.boundingBox();
      const deleteBtnBox = await deleteBtn.boundingBox();
      
      expect(viewBtnBox).not.toBeNull();
      expect(inviteBtnBox).not.toBeNull();
      expect(deleteBtnBox).not.toBeNull();
      
      // Verify buttons are within viewport
      expect(viewBtnBox!.x + viewBtnBox!.width).toBeLessThanOrEqual(320);
      expect(inviteBtnBox!.x + inviteBtnBox!.width).toBeLessThanOrEqual(320);
      expect(deleteBtnBox!.x + deleteBtnBox!.width).toBeLessThanOrEqual(320);
    }
    
    await page.screenshot({ path: 'applicant-tests-portrait-320.jpeg', quality: 20 });
  });

  test('Applicant Tests header and Create Test button responsive', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsAdmin(page);
    await navigateToApplicantTests(page);
    
    // Verify the section header is visible
    const sectionHeader = page.locator('h2:has-text("Applicant Skills Tests")');
    await expect(sectionHeader).toBeVisible();
    
    // Verify the Create Test button is visible and full-width on mobile
    const createTestBtn = page.getByTestId('create-test-btn');
    await expect(createTestBtn).toBeVisible();
    
    // Check button width - should be full width on mobile (w-full sm:w-auto)
    const btnBox = await createTestBtn.boundingBox();
    expect(btnBox).not.toBeNull();
    
    // On mobile, the button should take significant width
    // The parent container has padding, so button won't be exactly 390px
    expect(btnBox!.width).toBeGreaterThan(200); // Should be reasonably wide on mobile
    
    await page.screenshot({ path: 'applicant-tests-header-responsive.jpeg', quality: 20 });
  });

  test('Test card buttons are clickable in portrait mode', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsAdmin(page);
    await navigateToApplicantTests(page);
    
    // Check if there are any test cards
    const viewBtn = page.getByTestId('test-card-view-btn').first();
    
    if (await viewBtn.isVisible()) {
      // Click View button - should open submissions modal
      await viewBtn.click();
      
      // Wait for modal to appear
      await expect(page.getByText('Submissions')).toBeVisible();
      
      // Close modal by clicking outside or X button
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
      
      // Click Invite button - should open invite modal
      const inviteBtn = page.getByTestId('test-card-invite-btn').first();
      await inviteBtn.click();
      
      // Wait for invite modal to appear
      await expect(page.getByText('Send Invite')).toBeVisible();
      
      // Close modal
      await page.keyboard.press('Escape');
      
      await page.screenshot({ path: 'applicant-tests-buttons-clickable.jpeg', quality: 20 });
    }
  });
});
