import { test, expect } from '@playwright/test';
import { loginAsAdmin, dismissToasts, removeEmergentBadge } from '../fixtures/helpers';

const TEST_EMPLOYEE_ID = '6707c692-416d-4bd1-9596-2a9950419e2c';
const W9_DOC_ID = 'a0de9d4c-58d6-4c9c-9add-b66000604bc1';

test.describe('Edit Employee Modal W-9 Section', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await dismissToasts(page);
    await removeEmergentBadge(page);
  });

  test('should open Edit Employee modal', async ({ page }) => {
    // Click Edit Employee button
    const editBtn = page.getByTestId('edit-employee-btn');
    await expect(editBtn).toBeVisible();
    await editBtn.click();
    
    // Verify modal opens
    const modal = page.getByTestId('edit-employee-modal');
    await expect(modal).toBeVisible();
    
    // Verify Select Employee dropdown exists
    const selectTrigger = page.getByTestId('edit-employee-select');
    await expect(selectTrigger).toBeVisible();
  });

  test('should display W-9 section with dark theme after selecting employee', async ({ page }) => {
    // Open Edit Employee modal
    await page.getByTestId('edit-employee-btn').click();
    
    // Select employee from dropdown
    await page.getByTestId('edit-employee-select').click();
    
    // Select Test Employee from the list
    await page.getByText('Test Employee (testemployee@thriftycurator.com)').click();
    
    // Wait for employee data to load
    await expect(page.getByTestId('edit-employee-name')).toBeVisible();
    
    // Verify W-9 section exists with dark theme text
    const w9SectionHeading = page.getByText('W-9 Tax Documents', { exact: false });
    await expect(w9SectionHeading).toBeVisible();
    
    // Verify Get W-9 Form button is present
    const getW9Btn = page.getByTestId('edit-download-w9-form-btn');
    await expect(getW9Btn).toBeVisible();
  });

  test('should display W-9 documents with action buttons in Edit modal', async ({ page }) => {
    // Open Edit Employee modal and select test employee
    await page.getByTestId('edit-employee-btn').click();
    await page.getByTestId('edit-employee-select').click();
    await page.getByText('Test Employee (testemployee@thriftycurator.com)').click();
    
    // Wait for W-9 documents to load
    const previewBtn = page.getByTestId(`edit-preview-w9-${W9_DOC_ID}`);
    await expect(previewBtn).toBeVisible({ timeout: 15000 });
    
    // Verify Download button
    const downloadBtn = page.getByTestId(`edit-download-w9-${W9_DOC_ID}`);
    await expect(downloadBtn).toBeVisible();
    
    // Verify Delete button
    const deleteBtn = page.getByTestId(`edit-delete-w9-${W9_DOC_ID}`);
    await expect(deleteBtn).toBeVisible();
  });

  test('should open Preview modal when clicking Preview button in Edit modal', async ({ page }) => {
    // Open Edit Employee modal and select test employee
    await page.getByTestId('edit-employee-btn').click();
    await page.getByTestId('edit-employee-select').click();
    await page.getByText('Test Employee (testemployee@thriftycurator.com)').click();
    
    // Wait for and click Preview button
    const previewBtn = page.getByTestId(`edit-preview-w9-${W9_DOC_ID}`);
    await expect(previewBtn).toBeVisible({ timeout: 15000 });
    await previewBtn.click();
    
    // Verify preview modal opens with document title
    await expect(page.getByText('W-9 Document', { exact: false })).toBeVisible({ timeout: 10000 });
    
    // Verify close button is present
    const closeBtn = page.getByRole('button', { name: '✕' });
    await expect(closeBtn).toBeVisible();
  });

  test('should show document count badge in Edit modal W-9 section', async ({ page }) => {
    // Open Edit Employee modal and select test employee
    await page.getByTestId('edit-employee-btn').click();
    await page.getByTestId('edit-employee-select').click();
    await page.getByText('Test Employee (testemployee@thriftycurator.com)').click();
    
    // Wait for employee to load
    await expect(page.getByTestId('edit-employee-name')).toBeVisible();
    
    // Verify document count badge is present (e.g., "2 document(s)")
    const countBadge = page.locator('span:text-matches("\\d+ document\\(s\\)")');
    await expect(countBadge).toBeVisible({ timeout: 10000 });
  });

  test('should have dark theme gradient for W-9 section in Edit modal', async ({ page }) => {
    // Open Edit Employee modal and select test employee
    await page.getByTestId('edit-employee-btn').click();
    await page.getByTestId('edit-employee-select').click();
    await page.getByText('Test Employee (testemployee@thriftycurator.com)').click();
    
    // Wait for employee to load
    await expect(page.getByTestId('edit-employee-name')).toBeVisible();
    
    // Find the W-9 section container
    const w9Section = page.locator('div:has(> div > span:text("W-9 Tax Documents"))').locator('xpath=..');
    
    // Verify it has gradient styling (by checking class or computed style)
    const hasDarkTheme = await w9Section.evaluate(el => {
      const bg = window.getComputedStyle(el).background;
      return bg.includes('gradient') || el.className.includes('gradient');
    });
    
    expect(hasDarkTheme).toBeTruthy();
  });

  test('should close Edit Employee modal on Cancel', async ({ page }) => {
    // Open Edit Employee modal and select test employee
    await page.getByTestId('edit-employee-btn').click();
    await page.getByTestId('edit-employee-select').click();
    await page.getByText('Test Employee (testemployee@thriftycurator.com)').click();
    
    // Wait for form to load
    await expect(page.getByTestId('edit-employee-name')).toBeVisible();
    
    // Click Cancel button
    await page.getByRole('button', { name: 'Cancel' }).click();
    
    // Verify modal is closed
    await expect(page.getByTestId('edit-employee-modal')).not.toBeVisible();
  });

  test('should show Upload W-9 option in Edit modal', async ({ page }) => {
    // Open Edit Employee modal and select test employee
    await page.getByTestId('edit-employee-btn').click();
    await page.getByTestId('edit-employee-select').click();
    await page.getByText('Test Employee (testemployee@thriftycurator.com)').click();
    
    // Wait for form to load
    await expect(page.getByTestId('edit-employee-name')).toBeVisible();
    
    // Verify Upload section exists
    const uploadSection = page.getByText('Add Another W-9', { exact: false }).or(page.getByText('Upload W-9', { exact: false }));
    await expect(uploadSection).toBeVisible();
    
    // Verify Upload button is present
    const uploadBtn = page.getByRole('button', { name: 'Upload' });
    await expect(uploadBtn).toBeVisible();
  });
});
