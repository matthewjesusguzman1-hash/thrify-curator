import { test, expect } from '@playwright/test';
import { removeEmergentBadge, dismissToasts } from '../fixtures/helpers';

const BASE_URL = 'https://resale-portal-2.preview.emergentagent.com';

test.describe('Approval Workflows - Bug Fix Verification', () => {
  
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
  });

  test('Can navigate to Form Submissions section', async ({ page }) => {
    // Expand the Forms & Communications group
    await page.getByTestId('group-forms-toggle').click();
    
    // Wait for group to expand and Form Submissions section to be visible
    await expect(page.getByTestId('form-submissions-section')).toBeVisible({ timeout: 5000 });
    
    // Expand Form Submissions section
    await page.getByTestId('form-submissions-toggle').click();
    
    // Verify tabs are visible
    await expect(page.getByTestId('tab-job-applications')).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('tab-consignment-inquiries')).toBeVisible();
    await expect(page.getByTestId('tab-consignment-agreements')).toBeVisible();
    await expect(page.getByTestId('tab-updates')).toBeVisible();
  });

  test('Item addition approval workflow - can view pending item additions', async ({ page }) => {
    // Navigate to Form Submissions > Updates tab
    await page.getByTestId('group-forms-toggle').click();
    await expect(page.getByTestId('form-submissions-section')).toBeVisible({ timeout: 5000 });
    await page.getByTestId('form-submissions-toggle').click();
    
    // Click Updates tab
    await page.getByTestId('tab-updates').click();
    await expect(page.getByTestId('updates-list')).toBeVisible();
    
    // Check if there are any item additions (rows with "+N Items" badge)
    const itemAdditionRows = page.locator('[data-testid^="update-row-"]').filter({ hasText: /\+\d+ Items/ });
    const rowCount = await itemAdditionRows.count();
    
    if (rowCount === 0) {
      // Skip test if no item additions exist
      test.skip();
      return;
    }
    
    // Verify the rows are visible and have correct structure
    const firstRow = itemAdditionRows.first();
    await expect(firstRow).toBeVisible();
    
    // Verify view button exists for item additions
    const viewButton = firstRow.locator('[data-testid^="view-update-"]');
    await expect(viewButton).toBeVisible();
  });

  test('Item addition approval - clicking View opens modal with approval form', async ({ page }) => {
    // Navigate to Form Submissions > Updates tab
    await page.getByTestId('group-forms-toggle').click();
    await expect(page.getByTestId('form-submissions-section')).toBeVisible({ timeout: 5000 });
    await page.getByTestId('form-submissions-toggle').click();
    
    // Click Updates tab
    await page.getByTestId('tab-updates').click();
    await expect(page.getByTestId('updates-list')).toBeVisible();
    
    // Find an item addition row
    const itemAdditionRows = page.locator('[data-testid^="update-row-"]').filter({ hasText: /\+\d+ Items/ });
    const rowCount = await itemAdditionRows.count();
    
    if (rowCount === 0) {
      test.skip();
      return;
    }
    
    // Click view button to open the modal (uses FormSubmissionModal)
    const viewButton = itemAdditionRows.first().locator('[data-testid^="view-update-"]');
    await viewButton.click();
    
    // The item additions route through FormSubmissionModal (not view-update-modal)
    // Wait for modal to appear (either format)
    const submissionModal = page.getByTestId('submission-details-modal');
    const updateModal = page.getByTestId('view-update-modal');
    
    // One of the modals should be visible
    try {
      await expect(submissionModal.or(updateModal)).toBeVisible({ timeout: 5000 });
    } catch {
      // If neither modal is visible, there's an issue
      throw new Error('Neither submission-details-modal nor view-update-modal became visible');
    }
    
    // Check for approval section elements
    const approvalSection = page.locator('text=Consignment Review');
    await expect(approvalSection).toBeVisible({ timeout: 5000 });
    
    // Close modal
    await page.keyboard.press('Escape');
  });

  test('Consignment agreement approval workflow - can view agreements', async ({ page }) => {
    // Navigate to Form Submissions > Agreements tab
    await page.getByTestId('group-forms-toggle').click();
    await expect(page.getByTestId('form-submissions-section')).toBeVisible({ timeout: 5000 });
    await page.getByTestId('form-submissions-toggle').click();
    
    // Click Agreements tab
    await page.getByTestId('tab-consignment-agreements').click();
    await expect(page.getByTestId('consignment-agreements-list')).toBeVisible({ timeout: 5000 });
    
    // Check if there are any agreements
    const agreementRows = page.locator('[data-testid^="agreement-row-"]');
    const rowCount = await agreementRows.count();
    
    if (rowCount === 0) {
      test.skip();
      return;
    }
    
    // Verify view button exists
    const viewButton = agreementRows.first().locator('[data-testid^="view-agreement-"]');
    await expect(viewButton).toBeVisible();
  });

  test('Consignment agreement approval - clicking View opens modal with approval form', async ({ page }) => {
    // Navigate to Form Submissions > Agreements tab
    await page.getByTestId('group-forms-toggle').click();
    await expect(page.getByTestId('form-submissions-section')).toBeVisible({ timeout: 5000 });
    await page.getByTestId('form-submissions-toggle').click();
    
    // Click Agreements tab
    await page.getByTestId('tab-consignment-agreements').click();
    await expect(page.getByTestId('consignment-agreements-list')).toBeVisible({ timeout: 5000 });
    
    // Check if there are any agreements
    const agreementRows = page.locator('[data-testid^="agreement-row-"]');
    const rowCount = await agreementRows.count();
    
    if (rowCount === 0) {
      test.skip();
      return;
    }
    
    // Click view button to open the modal
    const viewButton = agreementRows.first().locator('[data-testid^="view-agreement-"]');
    await viewButton.click();
    
    // Wait for modal to appear
    await expect(page.getByTestId('submission-details-modal')).toBeVisible({ timeout: 5000 });
    
    // Check for approval section
    const approvalSection = page.locator('text=Consignment Review');
    await expect(approvalSection).toBeVisible({ timeout: 5000 });
    
    // Close modal
    await page.keyboard.press('Escape');
  });

  test('Approval form - submit button triggers approval API call correctly', async ({ page }) => {
    // Navigate to Form Submissions > Agreements tab
    await page.getByTestId('group-forms-toggle').click();
    await expect(page.getByTestId('form-submissions-section')).toBeVisible({ timeout: 5000 });
    await page.getByTestId('form-submissions-toggle').click();
    
    // Click Agreements tab
    await page.getByTestId('tab-consignment-agreements').click();
    await expect(page.getByTestId('consignment-agreements-list')).toBeVisible({ timeout: 5000 });
    
    // Check if there are any agreements
    const agreementRows = page.locator('[data-testid^="agreement-row-"]');
    const rowCount = await agreementRows.count();
    
    if (rowCount === 0) {
      test.skip();
      return;
    }
    
    // Click view button to open the modal
    const viewButton = agreementRows.first().locator('[data-testid^="view-agreement-"]');
    await viewButton.click();
    
    // Wait for modal to appear
    await expect(page.getByTestId('submission-details-modal')).toBeVisible({ timeout: 5000 });
    
    // Check if this agreement is pending (has approval form) or already reviewed
    const submitButton = page.getByTestId('submit-approval-btn');
    const isPending = await submitButton.isVisible().catch(() => false);
    
    if (!isPending) {
      // This agreement was already approved/rejected, skip
      await page.keyboard.press('Escape');
      test.skip();
      return;
    }
    
    // Fill in the approval form
    const itemsAcceptedInput = page.getByTestId('items-accepted-input');
    await itemsAcceptedInput.fill('5');
    
    // Fill admin notes
    const adminNotesInput = page.getByTestId('admin-notes-input');
    await adminNotesInput.fill('Test approval from Playwright');
    
    // Listen for the API call to verify correct URL (no double /api)
    const responsePromise = page.waitForResponse(
      response => response.url().includes('/api/admin/forms/consignment-agreements/') && 
                  response.url().includes('/approve') &&
                  !response.url().includes('/api/api/'),
      { timeout: 10000 }
    );
    
    // Click submit button
    await submitButton.click();
    
    // Wait for API response
    const response = await responsePromise;
    
    // Verify the API call succeeded (200 OK)
    expect(response.status()).toBe(200);
    
    // Verify no error toast appeared
    const errorToast = page.locator('text=Failed to process approval');
    await expect(errorToast).not.toBeVisible({ timeout: 2000 });
  });

  test('Bug fix verification - no double /api in approval URL', async ({ page }) => {
    // Setup network monitoring for all requests
    const requests: string[] = [];
    page.on('request', request => {
      if (request.url().includes('/approve')) {
        requests.push(request.url());
      }
    });
    
    // Navigate to Form Submissions > Agreements tab directly (simpler test)
    await page.getByTestId('group-forms-toggle').click();
    await expect(page.getByTestId('form-submissions-section')).toBeVisible({ timeout: 5000 });
    await page.getByTestId('form-submissions-toggle').click();
    
    // Try Agreements tab (these use FormSubmissionModal which was the fixed code)
    await page.getByTestId('tab-consignment-agreements').click();
    await expect(page.getByTestId('consignment-agreements-list')).toBeVisible({ timeout: 5000 });
    
    const agreementRows = page.locator('[data-testid^="agreement-row-"]');
    const agreementRowCount = await agreementRows.count();
    
    if (agreementRowCount === 0) {
      console.log('No agreements found to test');
      test.skip();
      return;
    }
    
    // Click view button on first agreement
    const viewButton = agreementRows.first().locator('[data-testid^="view-agreement-"]');
    await viewButton.click();
    
    await expect(page.getByTestId('submission-details-modal')).toBeVisible({ timeout: 5000 });
    
    // Check if pending (has submit button)
    const submitButton = page.getByTestId('submit-approval-btn');
    const isPending = await submitButton.isVisible().catch(() => false);
    
    if (!isPending) {
      // This agreement was already approved/rejected, close and skip
      await page.keyboard.press('Escape');
      await expect(page.getByTestId('submission-details-modal')).not.toBeVisible({ timeout: 3000 });
      console.log('No pending approvals found');
      test.skip();
      return;
    }
    
    // Fill form and submit
    const itemsAcceptedInput = page.getByTestId('items-accepted-input');
    await itemsAcceptedInput.fill('3');
    
    const adminNotesInput = page.getByTestId('admin-notes-input');
    await adminNotesInput.fill('Bug fix verification test');
    
    await submitButton.click();
    
    // Wait for API call to complete
    await page.waitForTimeout(2000);
    
    // Verify no requests had double /api
    for (const url of requests) {
      expect(url).not.toContain('/api/api/');
    }
    
    // Verify the modal closed (indicating success)
    await expect(page.getByTestId('submission-details-modal')).not.toBeVisible({ timeout: 5000 });
  });
});
