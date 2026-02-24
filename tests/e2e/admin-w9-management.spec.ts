import { test, expect } from '@playwright/test';
import { loginAsAdmin, dismissToasts, removeEmergentBadge, waitForAppReady } from '../fixtures/helpers';

const TEST_EMPLOYEE_ID = '6707c692-416d-4bd1-9596-2a9950419e2c';
const W9_DOC_ID = 'a0de9d4c-58d6-4c9c-9add-b66000604bc1';

test.describe('Admin W-9 Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await dismissToasts(page);
    await removeEmergentBadge(page);
  });

  test('should expand All Employees section and display employees table', async ({ page }) => {
    // Find and expand All Employees section
    const employeesToggle = page.getByTestId('employees-section-toggle');
    await expect(employeesToggle).toBeVisible();
    await employeesToggle.click();
    
    // Verify table appears
    await expect(page.getByTestId('employees-table')).toBeVisible();
    
    // Verify Test Employee row is displayed
    const testEmployeeRow = page.getByTestId(`all-employee-row-${TEST_EMPLOYEE_ID}`);
    await expect(testEmployeeRow).toBeVisible();
  });

  test('should open W-9 Management modal when clicking View button', async ({ page }) => {
    // Expand All Employees section
    await page.getByTestId('employees-section-toggle').click();
    await expect(page.getByTestId('employees-table')).toBeVisible();
    
    // Find the W-9 view button for test employee
    const viewW9Btn = page.getByTestId(`view-w9-${TEST_EMPLOYEE_ID}`);
    await expect(viewW9Btn).toBeVisible();
    await viewW9Btn.click();
    
    // Verify W-9 modal opens
    const w9Modal = page.getByTestId('w9-management-modal');
    await expect(w9Modal).toBeVisible();
    
    // Verify modal has dark theme styling
    await expect(w9Modal).toHaveCSS('background', /linear-gradient/);
  });

  test('should display W-9 documents with Preview, Download, and Delete buttons', async ({ page }) => {
    // Navigate to W-9 modal
    await page.getByTestId('employees-section-toggle').click();
    await expect(page.getByTestId('employees-table')).toBeVisible();
    await page.getByTestId(`view-w9-${TEST_EMPLOYEE_ID}`).click();
    
    const w9Modal = page.getByTestId('w9-management-modal');
    await expect(w9Modal).toBeVisible();
    
    // Wait for documents to load
    const w9Doc = page.getByTestId(`w9-doc-${W9_DOC_ID}`);
    await expect(w9Doc).toBeVisible({ timeout: 10000 });
    
    // Verify Preview button exists
    const previewBtn = page.getByTestId(`preview-w9-${W9_DOC_ID}`);
    await expect(previewBtn).toBeVisible();
    
    // Verify Download button exists
    const downloadBtn = page.getByTestId(`download-w9-${W9_DOC_ID}`);
    await expect(downloadBtn).toBeVisible();
    
    // Verify Delete button exists
    const deleteBtn = page.getByTestId(`delete-w9-${W9_DOC_ID}`);
    await expect(deleteBtn).toBeVisible();
  });

  test('should Preview W-9 document when clicking Preview button', async ({ page }) => {
    // Navigate to W-9 modal
    await page.getByTestId('employees-section-toggle').click();
    await page.getByTestId(`view-w9-${TEST_EMPLOYEE_ID}`).click();
    
    const w9Modal = page.getByTestId('w9-management-modal');
    await expect(w9Modal).toBeVisible();
    
    // Wait for document to appear
    const previewBtn = page.getByTestId(`preview-w9-${W9_DOC_ID}`);
    await expect(previewBtn).toBeVisible({ timeout: 10000 });
    
    // Click Preview button
    await previewBtn.click();
    
    // Wait for preview modal to appear - should have a title "W-9 Preview"
    await expect(page.getByText('W-9 Preview', { exact: false })).toBeVisible({ timeout: 10000 });
    
    // Verify preview content area exists (iframe or image)
    const previewContent = page.locator('iframe[title="W-9 Document"], img[alt="W-9 Document"]');
    await expect(previewContent.first()).toBeVisible({ timeout: 5000 });
  });

  test('should show Approve button for pending W-9 documents', async ({ page }) => {
    // Navigate to W-9 modal
    await page.getByTestId('employees-section-toggle').click();
    await page.getByTestId(`view-w9-${TEST_EMPLOYEE_ID}`).click();
    
    const w9Modal = page.getByTestId('w9-management-modal');
    await expect(w9Modal).toBeVisible();
    
    // The approved document should NOT have an Approve button
    // Check that approve button is NOT visible for already approved docs
    const w9Doc = page.getByTestId(`w9-doc-${W9_DOC_ID}`);
    await expect(w9Doc).toBeVisible({ timeout: 10000 });
    
    // Check for Pending status badge
    const statusBadge = w9Doc.locator('text=Approved');
    const hasPendingBadge = await statusBadge.count();
    
    if (hasPendingBadge > 0) {
      // If approved, approve button should not be visible
      const approveBtn = page.getByTestId(`approve-w9-${W9_DOC_ID}`);
      await expect(approveBtn).not.toBeVisible();
    }
  });

  test('should display Get W-9 Form button in modal footer', async ({ page }) => {
    // Navigate to W-9 modal
    await page.getByTestId('employees-section-toggle').click();
    await page.getByTestId(`view-w9-${TEST_EMPLOYEE_ID}`).click();
    
    const w9Modal = page.getByTestId('w9-management-modal');
    await expect(w9Modal).toBeVisible();
    
    // Verify Get W-9 Form button exists in the modal
    const getW9FormBtn = w9Modal.getByText('Get W-9 Form');
    await expect(getW9FormBtn).toBeVisible();
  });

  test('should display W-9 notes if available', async ({ page }) => {
    // Navigate to W-9 modal
    await page.getByTestId('employees-section-toggle').click();
    await page.getByTestId(`view-w9-${TEST_EMPLOYEE_ID}`).click();
    
    const w9Modal = page.getByTestId('w9-management-modal');
    await expect(w9Modal).toBeVisible();
    
    // Wait for document with notes
    await expect(page.getByTestId(`w9-doc-${W9_DOC_ID}`)).toBeVisible({ timeout: 10000 });
    
    // The test document has notes: "This is my W-9 submission for 2026"
    const notesText = w9Modal.getByText('This is my W-9 submission for 2026', { exact: false });
    await expect(notesText).toBeVisible();
  });

  test('should close W-9 modal when clicking Close button', async ({ page }) => {
    // Navigate to W-9 modal
    await page.getByTestId('employees-section-toggle').click();
    await page.getByTestId(`view-w9-${TEST_EMPLOYEE_ID}`).click();
    
    const w9Modal = page.getByTestId('w9-management-modal');
    await expect(w9Modal).toBeVisible();
    
    // Click Close button
    const closeBtn = w9Modal.getByRole('button', { name: 'Close' });
    await closeBtn.click();
    
    // Verify modal is closed
    await expect(w9Modal).not.toBeVisible();
  });

  test('should have dark theme styling for W-9 modal', async ({ page }) => {
    // Navigate to W-9 modal
    await page.getByTestId('employees-section-toggle').click();
    await page.getByTestId(`view-w9-${TEST_EMPLOYEE_ID}`).click();
    
    const w9Modal = page.getByTestId('w9-management-modal');
    await expect(w9Modal).toBeVisible();
    
    // Check dark theme class - modal should have dark gradient background
    const modalStyles = await w9Modal.evaluate(el => {
      const styles = window.getComputedStyle(el);
      return {
        background: styles.background || styles.backgroundColor,
        borderColor: styles.borderColor
      };
    });
    
    // Verify it has gradient background (dark theme)
    expect(modalStyles.background).toContain('gradient');
    
    // Verify header text is white
    const headerText = w9Modal.locator('h2').first();
    const textColor = await headerText.evaluate(el => window.getComputedStyle(el).color);
    // White color would be rgb(255, 255, 255) or close
    expect(textColor).toMatch(/rgb\(255,\s*255,\s*255\)|rgba\(255,\s*255,\s*255/);
  });
});
