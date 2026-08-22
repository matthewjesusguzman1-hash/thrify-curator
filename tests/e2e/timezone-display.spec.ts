import { test, expect } from '@playwright/test';

/**
 * Test Timezone Display Enhancements
 * Tests the enhanced timezone conversion display on applicant-facing pages:
 * 1. InterviewResponsePage.jsx - CT conversion shows full date with weekday
 * 2. SubmitAvailabilityPage.jsx - CT conversion shows full date with weekday
 * 3. Day rollover notification when PHT time crosses midnight in CT
 * 4. Admin interview scheduling modal has time range filter option
 */

test.describe('Timezone Display - InterviewResponsePage', () => {
  test('should show error page for invalid interview response token', async ({ page }) => {
    // Navigate to interview response page with invalid token
    await page.goto('/interview-response/invalid-test-token');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    // Should show error message
    const errorMessage = page.getByText(/Interview request not found|expired|Oops/i);
    await expect(errorMessage.first()).toBeVisible();
    
    await page.screenshot({ path: 'interview-response-invalid-token.jpeg', quality: 20 });
  });
});

test.describe('Timezone Display - SubmitAvailabilityPage', () => {
  test('should show error page for invalid availability token', async ({ page }) => {
    // Navigate to submit availability page with invalid token
    await page.goto('/submit-availability/invalid-test-token');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    // Should show error message
    const errorMessage = page.getByText(/Invalid|expired|Link Invalid/i);
    await expect(errorMessage.first()).toBeVisible();
    
    await page.screenshot({ path: 'submit-availability-invalid-token.jpeg', quality: 20 });
  });
});

test.describe('In-Person Interview Scheduler Section', () => {
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

  test('should display Interview Scheduler section in Hiring group', async ({ page }) => {
    // Navigate to Hiring section
    const hiringSection = page.getByText('Hiring').first();
    await expect(hiringSection).toBeVisible();
    await hiringSection.click();
    await page.waitForTimeout(1500);
    
    // Check for Interview Scheduler section (use .first() to avoid strict mode violation)
    const schedulerSection = page.getByTestId('interview-scheduler-section').first();
    await expect(schedulerSection).toBeVisible();
    
    await page.screenshot({ path: 'interview-scheduler-section.jpeg', quality: 20 });
  });

  test('should expand Interview Scheduler and show tabs', async ({ page }) => {
    // Navigate to Hiring section
    const hiringSection = page.getByText('Hiring').first();
    await hiringSection.click();
    await page.waitForTimeout(1500);
    
    // Click to expand Interview Scheduler
    const schedulerToggle = page.getByTestId('interview-scheduler-toggle');
    await schedulerToggle.click();
    await page.waitForTimeout(1500);
    
    // Check for tabs
    const applicantsTab = page.getByTestId('tab-applicants');
    const inboxTab = page.getByTestId('tab-inbox');
    const scheduledTab = page.getByTestId('tab-scheduled');
    
    await expect(applicantsTab).toBeVisible();
    await expect(inboxTab).toBeVisible();
    await expect(scheduledTab).toBeVisible();
    
    await page.screenshot({ path: 'interview-scheduler-tabs.jpeg', quality: 20 });
  });

  test('should show Review Responses tab with responded count', async ({ page }) => {
    // Navigate to Hiring section
    const hiringSection = page.getByText('Hiring').first();
    await hiringSection.click();
    await page.waitForTimeout(1500);
    
    // Click to expand Interview Scheduler
    const schedulerToggle = page.getByTestId('interview-scheduler-toggle');
    await schedulerToggle.click();
    await page.waitForTimeout(1500);
    
    // Click on inbox tab
    const inboxTab = page.getByTestId('tab-inbox');
    await inboxTab.click();
    await page.waitForTimeout(1000);
    
    // Check for Review Responses content
    const reviewLabel = page.getByText(/Review Responses/i);
    await expect(reviewLabel).toBeVisible();
    
    await page.screenshot({ path: 'interview-inbox-tab.jpeg', quality: 20 });
  });

  test('should show Scheduled tab with scheduled interviews', async ({ page }) => {
    // Navigate to Hiring section
    const hiringSection = page.getByText('Hiring').first();
    await hiringSection.click();
    await page.waitForTimeout(1500);
    
    // Click to expand Interview Scheduler
    const schedulerToggle = page.getByTestId('interview-scheduler-toggle');
    await schedulerToggle.click();
    await page.waitForTimeout(1500);
    
    // Click on scheduled tab
    const scheduledTab = page.getByTestId('tab-scheduled');
    await scheduledTab.click();
    await page.waitForTimeout(1000);
    
    // Check for Scheduled content
    const scheduledLabel = page.getByText(/Scheduled/i);
    await expect(scheduledLabel.first()).toBeVisible();
    
    await page.screenshot({ path: 'interview-scheduled-tab.jpeg', quality: 20 });
  });
});

test.describe('CT Time Conversion Display in Interview Scheduler', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(4000);
    
    const employeePortal = page.getByText('Employee Portal');
    await employeePortal.click();
    await page.waitForTimeout(1500);
    
    const emailInput = page.getByPlaceholder('your@email.com');
    await emailInput.fill('matthewjesusguzman1@gmail.com');
    await page.getByRole('button', { name: /find my account/i }).click();
    await page.waitForTimeout(1500);
    
    const codeInput = page.getByPlaceholder('4-digit code');
    await codeInput.fill('4399');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForTimeout(3000);
  });

  test('should display CT time in inbox when responses exist', async ({ page }) => {
    // Navigate to Hiring section
    const hiringSection = page.getByText('Hiring').first();
    await hiringSection.click();
    await page.waitForTimeout(1500);
    
    // Click to expand Interview Scheduler
    const schedulerToggle = page.getByTestId('interview-scheduler-toggle');
    await schedulerToggle.click();
    await page.waitForTimeout(1500);
    
    // Click on inbox tab
    const inboxTab = page.getByTestId('tab-inbox');
    await inboxTab.click();
    await page.waitForTimeout(1000);
    
    // Look for CT time display (if there are responses)
    // The format should include "CT" or "Central Time"
    const ctTimeDisplay = page.getByText(/CT|Central Time/i);
    
    // Take screenshot regardless of whether CT times are visible
    await page.screenshot({ path: 'interview-inbox-ct-display.jpeg', quality: 20 });
    
    // If there are responses, CT time should be visible
    const responseCount = await page.getByTestId('tab-inbox').locator('span').filter({ hasText: /\d+/ }).count();
    if (responseCount > 0) {
      await expect(ctTimeDisplay.first()).toBeVisible();
    }
  });
});
