import { test, expect } from '@playwright/test';

test.describe('Interview Response Page', () => {
  test('should display error for invalid token', async ({ page }) => {
    // Navigate to interview response page with invalid token
    await page.goto('/interview-response/invalid-token-test-123');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(4000);
    
    // Should show error message
    const errorIcon = page.locator('svg.text-red-400');
    await expect(errorIcon).toBeVisible();
    
    // Check for "Oops!" heading
    const oopsHeading = page.getByText('Oops!');
    await expect(oopsHeading).toBeVisible();
    
    // Check for error message about not found or expired
    const errorMessage = page.getByText(/not found|expired/i);
    await expect(errorMessage).toBeVisible();
    
    await page.screenshot({ path: 'interview-response-error.jpeg', quality: 20 });
  });
});

test.describe('Interview Inbox Button', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to homepage
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    // Wait for splash screen to finish
    await page.waitForTimeout(4000);
    
    // Click on Employee Portal
    const employeePortal = page.getByText('Employee Portal');
    await employeePortal.click();
    await page.waitForTimeout(1500);
    
    // Login as admin
    const emailInput = page.getByPlaceholder('your@email.com');
    await emailInput.fill('matthewjesusguzman1@gmail.com');
    
    await page.getByRole('button', { name: /find my account/i }).click();
    await page.waitForTimeout(1500);
    
    // Enter admin code
    const codeInput = page.getByPlaceholder('4-digit code');
    await codeInput.fill('4399');
    
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForTimeout(3000);
  });

  test('should display Interview Inbox button in Applicant Tests section', async ({ page }) => {
    // Navigate to Forms & Communications section
    const formsSection = page.getByText('Forms & Communications');
    await expect(formsSection).toBeVisible();
    await formsSection.click();
    await page.waitForTimeout(1500);
    
    // Look for Applicant Skills Tests section
    const applicantTestsSection = page.getByText('Applicant Skills Tests');
    await expect(applicantTestsSection).toBeVisible();
    
    // Check for Interview Inbox button
    const inboxButton = page.getByTestId('interview-inbox-btn');
    await expect(inboxButton).toBeVisible();
    
    // Check button text
    await expect(inboxButton).toContainText('Interview Inbox');
    
    await page.screenshot({ path: 'interview-inbox-button.jpeg', quality: 20 });
  });

  test('should open Interview Inbox modal when clicking button', async ({ page }) => {
    // Navigate to Forms & Communications section
    const formsSection = page.getByText('Forms & Communications');
    await formsSection.click();
    await page.waitForTimeout(1500);
    
    // Click Interview Inbox button
    const inboxButton = page.getByTestId('interview-inbox-btn');
    await inboxButton.click();
    await page.waitForTimeout(1000);
    
    // Check for modal - look for Interview Inbox title in modal
    const modalTitle = page.getByRole('heading', { name: /Interview Inbox/i });
    await expect(modalTitle).toBeVisible();
    
    await page.screenshot({ path: 'interview-inbox-modal.jpeg', quality: 20 });
  });
});
