import { test, expect } from '@playwright/test';
import { loginAsEmployee, dismissToasts, removeEmergentBadge } from '../fixtures/helpers';

const TEST_EMPLOYEE_EMAIL = 'testemployee@thriftycurator.com';

test.describe('Employee Dashboard W-9 Section', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsEmployee(page, TEST_EMPLOYEE_EMAIL);
    await dismissToasts(page);
    await removeEmergentBadge(page);
  });

  test('should display W-9 Tax Form section with dark theme', async ({ page }) => {
    // Scroll to W-9 section - look for heading with FileText icon and "W-9 Tax Form" text
    const w9Section = page.locator('text=W-9 Tax Form').first();
    await expect(w9Section).toBeVisible();
    
    // Verify dark theme on the section container
    const sectionContainer = page.locator('div:has(> h2:text("W-9 Tax Form"))').locator('xpath=ancestor::div[contains(@class, "rounded-xl")]').first();
    const bgStyle = await sectionContainer.evaluate(el => window.getComputedStyle(el).background);
    
    // Dark theme should have gradient background
    expect(bgStyle).toContain('gradient');
  });

  test('should show Get W-9 Form button', async ({ page }) => {
    const getW9FormBtn = page.getByTestId('get-w9-form-btn');
    await expect(getW9FormBtn).toBeVisible();
    await expect(getW9FormBtn).toHaveText(/Get W-9 Form/);
  });

  test('should show Submit W-9 to Admin button', async ({ page }) => {
    const submitW9Btn = page.getByTestId('submit-w9-btn');
    await expect(submitW9Btn).toBeVisible();
    await expect(submitW9Btn).toHaveText(/Submit W-9 to Admin/);
  });

  test('should display Your Submissions section with document count', async ({ page }) => {
    // Scroll down to W-9 section
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    
    // Look for "YOUR SUBMISSIONS" heading (uppercase as shown in UI)
    const submissionsHeading = page.getByText('YOUR SUBMISSIONS', { exact: false });
    await expect(submissionsHeading).toBeVisible();
    
    // There should be submission count badge (shows number in badge next to heading)
    // The badge contains the number 2 (or 1 depending on filter)
    const countBadge = submissionsHeading.locator('xpath=following-sibling::span | ../span');
    await expect(countBadge.first()).toBeVisible();
  });

  test('should show submission form when clicking Submit W-9 button', async ({ page }) => {
    // Click Submit W-9 button
    await page.getByTestId('submit-w9-btn').click();
    
    // Verify form appears with file upload area
    const fileUploadArea = page.getByText('Click to select W-9 file', { exact: false });
    await expect(fileUploadArea).toBeVisible();
    
    // Verify notes input is visible
    const notesInput = page.getByTestId('w9-notes-input');
    await expect(notesInput).toBeVisible();
    
    // Verify submit button is visible
    const submitFormBtn = page.getByTestId('submit-w9-form-btn');
    await expect(submitFormBtn).toBeVisible();
    await expect(submitFormBtn).toBeDisabled(); // Should be disabled without file
  });

  test('should close submission form when clicking X button', async ({ page }) => {
    // Open submission form
    await page.getByTestId('submit-w9-btn').click();
    await expect(page.getByTestId('w9-notes-input')).toBeVisible();
    
    // Find and click close button (X button in form header)
    const closeBtn = page.locator('button:has(> svg.lucide-x)').first();
    await closeBtn.click();
    
    // Verify form is closed and Submit W-9 button is visible again
    await expect(page.getByTestId('submit-w9-btn')).toBeVisible();
    await expect(page.getByTestId('w9-notes-input')).not.toBeVisible();
  });

  test('should display submitted W-9 documents with status badges', async ({ page }) => {
    // Scroll down to W-9 section
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    
    // Test employee has submitted W-9s - check for status badges
    // Status can be "Approved" or "Pending Review"
    const approvedBadge = page.locator('span:text("Approved")');
    const pendingBadge = page.locator('span:text("Pending Review")');
    
    // Wait for the W-9 section to load
    await expect(page.getByText('YOUR SUBMISSIONS', { exact: false })).toBeVisible();
    
    // At least one of these should be visible - give it time to render
    await expect(approvedBadge.or(pendingBadge).first()).toBeVisible({ timeout: 10000 });
  });

  test('should show View button for submitted W-9 documents', async ({ page }) => {
    // Look for View button (Eye icon) on W-9 submissions
    // The test employee has document with id a0de9d4c-58d6-4c9c-9add-b66000604bc1
    const viewBtn = page.getByTestId('view-w9-a0de9d4c-58d6-4c9c-9add-b66000604bc1');
    await expect(viewBtn).toBeVisible();
  });

  test('should open W-9 viewer modal when clicking View button', async ({ page }) => {
    // Click View button for the W-9 document
    const viewBtn = page.getByTestId('view-w9-a0de9d4c-58d6-4c9c-9add-b66000604bc1');
    await viewBtn.click();
    
    // Wait for viewer modal to appear
    await expect(page.getByText('W-9 Document', { exact: false })).toBeVisible({ timeout: 10000 });
    
    // Verify Close and Download buttons are present
    const closeBtn = page.getByRole('button', { name: 'Close' });
    const downloadBtn = page.getByRole('button', { name: /Download/ });
    
    await expect(closeBtn).toBeVisible();
    await expect(downloadBtn).toBeVisible();
  });

  test('should display W-9 notes on submitted documents', async ({ page }) => {
    // The test document has notes: "This is my W-9 submission for 2026"
    const notesText = page.getByText('This is my W-9 submission for 2026', { exact: false });
    await expect(notesText).toBeVisible();
  });

  test('should have dark theme styling for W-9 section', async ({ page }) => {
    // Scroll down to W-9 section
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    
    // Wait for W-9 section to appear
    const w9Heading = page.getByRole('heading', { name: 'W-9 Tax Form' });
    await expect(w9Heading).toBeVisible();
    
    // Verify the heading text is white (dark theme)
    const textColor = await w9Heading.evaluate(el => window.getComputedStyle(el).color);
    // White color would be rgb(255, 255, 255)
    expect(textColor).toMatch(/rgb\(255,\s*255,\s*255\)|rgba\(255,\s*255,\s*255/);
    
    // Verify the section has gradient background (dark theme)
    // Get the parent container that has the gradient
    const sectionContainer = w9Heading.locator('xpath=ancestor::div[contains(@class, "bg-gradient")]').first();
    await expect(sectionContainer).toBeVisible();
  });
});
