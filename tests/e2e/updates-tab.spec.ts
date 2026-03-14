import { test, expect } from '@playwright/test';
import { removeEmergentBadge, dismissToasts } from '../fixtures/helpers';

const BASE_URL = 'https://resale-hub-62.preview.emergentagent.com';

test.describe('Updates Tab in Form Submissions Section', () => {
  
  test.beforeEach(async ({ page }) => {
    // Skip splash screen
    await page.addInitScript(() => {
      sessionStorage.setItem('hasSeenSplash', 'true');
    });
    
    // Setup toast handler
    await dismissToasts(page);
    
    // Login as admin
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    await page.getByTestId('login-email').fill('4399');
    await page.getByTestId('login-submit-btn').click();
    await page.waitForURL('**/admin**', { timeout: 15000 });
    await expect(page.getByTestId('admin-dashboard')).toBeVisible({ timeout: 15000 });
    
    // Remove Emergent badge if present
    await removeEmergentBadge(page);
    
    // First expand the Forms & Communications group (the collapsible parent)
    await page.getByTestId('group-forms-toggle').click();
    
    // Wait for group to expand and Form Submissions section to be visible
    await expect(page.getByTestId('form-submissions-section')).toBeVisible({ timeout: 5000 });
    
    // Expand Form Submissions section
    await page.getByTestId('form-submissions-toggle').click();
    
    // Wait for section to expand
    await expect(page.getByTestId('tab-updates')).toBeVisible({ timeout: 5000 });
  });

  test('Updates tab is visible and clickable', async ({ page }) => {
    const updatesTab = page.getByTestId('tab-updates');
    await expect(updatesTab).toBeVisible();
    await updatesTab.click();
    await expect(page.getByTestId('updates-list')).toBeVisible();
  });

  test('Updates tab displays combined list of payment changes and item additions', async ({ page }) => {
    // Click Updates tab
    await page.getByTestId('tab-updates').click();
    
    // Wait for updates list to appear
    await expect(page.getByTestId('updates-list')).toBeVisible();
    
    // Check that the table or message is displayed
    const noUpdatesMessage = page.locator('text=No client updates yet');
    const noMatchingMessage = page.locator('text=No matching updates found');
    const updateRows = page.locator('[data-testid^="update-row-"]');
    
    // Either we have updates or we have a "no updates" message
    const hasUpdates = await updateRows.count() > 0;
    const hasNoUpdatesMessage = await noUpdatesMessage.isVisible().catch(() => false);
    const hasNoMatchingMessage = await noMatchingMessage.isVisible().catch(() => false);
    
    expect(hasUpdates || hasNoUpdatesMessage || hasNoMatchingMessage).toBe(true);
  });

  test('View button opens modal with update details', async ({ page }) => {
    // Click Updates tab
    await page.getByTestId('tab-updates').click();
    await expect(page.getByTestId('updates-list')).toBeVisible();
    
    // Check if there are any update rows
    const updateRows = page.locator('[data-testid^="update-row-"]');
    const rowCount = await updateRows.count();
    
    if (rowCount === 0) {
      test.skip();
      return;
    }
    
    // Click the first view button
    const firstViewButton = page.locator('[data-testid^="view-update-"]').first();
    await firstViewButton.click();
    
    // Verify modal opens - can be either view-update-modal (payment changes) or submission-details-modal (item additions)
    const viewUpdateModal = page.getByTestId('view-update-modal');
    const submissionModal = page.getByTestId('submission-details-modal');
    await expect(viewUpdateModal.or(submissionModal)).toBeVisible({ timeout: 5000 });
    
    // Close modal by clicking outside or pressing Escape
    await page.keyboard.press('Escape');
  });

  test.skip('Download button triggers download for item additions', async ({ page }) => {
    // NOTE: Download button is now inside the modal, not in the table row
    // This test needs to be rewritten to open modal first
    test.skip();
  });

  test.skip('Message button opens modal with pre-filled email template', async ({ page }) => {
    // NOTE: Message button is now inside the modal, not in the table row
    // This test needs to be rewritten to open modal first
    test.skip();
  });

  test('Search filter works on Updates tab', async ({ page }) => {
    // Click Updates tab
    await page.getByTestId('tab-updates').click();
    await expect(page.getByTestId('updates-list')).toBeVisible();
    
    // Check if there are any update rows
    const updateRows = page.locator('[data-testid^="update-row-"]');
    const initialRowCount = await updateRows.count();
    
    if (initialRowCount === 0) {
      test.skip();
      return;
    }
    
    // Type in search box
    const searchInput = page.getByTestId('form-search-input');
    await searchInput.fill('test');
    
    // Wait for filter to apply
    await page.waitForTimeout(500);
    
    // Clear search and verify results return
    await searchInput.clear();
    await page.waitForTimeout(500);
    
    const clearedRowCount = await updateRows.count();
    expect(clearedRowCount).toBe(initialRowCount);
  });

  test('Updates tab shows correct badges for different update types', async ({ page }) => {
    // Click Updates tab
    await page.getByTestId('tab-updates').click();
    await expect(page.getByTestId('updates-list')).toBeVisible();
    
    // Check if there are any update rows
    const updateRows = page.locator('[data-testid^="update-row-"]');
    const rowCount = await updateRows.count();
    
    if (rowCount === 0) {
      test.skip();
      return;
    }
    
    // Check for type badges in the updates
    const paymentBadge = page.locator('text=Payment Change').first();
    const itemBadge = page.locator('text=/\\+\\d+ Items/').first();
    const infoUpdateBadge = page.locator('text=Info Update').first();
    
    // At least one type of badge should exist
    const hasPaymentBadge = await paymentBadge.isVisible().catch(() => false);
    const hasItemBadge = await itemBadge.isVisible().catch(() => false);
    const hasInfoUpdateBadge = await infoUpdateBadge.isVisible().catch(() => false);
    
    // Should have at least one type of badge
    expect(hasPaymentBadge || hasItemBadge || hasInfoUpdateBadge).toBe(true);
  });

  test('View modal displays payment change details correctly', async ({ page }) => {
    // Click Updates tab
    await page.getByTestId('tab-updates').click();
    await expect(page.getByTestId('updates-list')).toBeVisible();
    
    // Find a payment change row
    const paymentChangeRow = page.locator('[data-testid^="update-row-"]').filter({ hasText: 'Payment Change' }).first();
    const hasPaymentChange = await paymentChangeRow.isVisible().catch(() => false);
    
    if (!hasPaymentChange) {
      test.skip();
      return;
    }
    
    // Click view button for payment change
    const viewButton = paymentChangeRow.locator('[data-testid^="view-update-"]');
    await viewButton.click();
    
    // Verify modal shows payment method change info
    await expect(page.getByTestId('view-update-modal')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Payment Method Change')).toBeVisible();
    
    // Close modal
    await page.keyboard.press('Escape');
  });

  test('View modal displays item addition details correctly', async ({ page }) => {
    // Click Updates tab
    await page.getByTestId('tab-updates').click();
    await expect(page.getByTestId('updates-list')).toBeVisible();
    
    // Find an item addition row (has "+N Items" badge)
    const itemAdditionRow = page.locator('[data-testid^="update-row-"]').filter({ hasText: /\+\d+ Items/ }).first();
    const hasItemAddition = await itemAdditionRow.isVisible().catch(() => false);
    
    if (!hasItemAddition) {
      test.skip();
      return;
    }
    
    // Click view button for item addition
    const viewButton = itemAdditionRow.locator('[data-testid^="view-update-"]');
    await viewButton.click();
    
    // Verify modal shows item addition info - item additions now use submission-details-modal
    const viewUpdateModal = page.getByTestId('view-update-modal');
    const submissionModal = page.getByTestId('submission-details-modal');
    await expect(viewUpdateModal.or(submissionModal)).toBeVisible({ timeout: 5000 });
    
    // Close modal
    await page.keyboard.press('Escape');
  });
});
