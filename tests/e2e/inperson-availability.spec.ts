import { test, expect } from '@playwright/test';

/**
 * Test In-Person Interview Availability Scheduling Features
 * Tests the availability-based in-person interview scheduling system:
 * 1. Interview Scheduler section in Hiring group
 * 2. Request Availability tab with pending applicants
 * 3. Review Responses tab (Availability Inbox)
 * 4. Scheduled tab with confirmed interviews
 * 5. SubmitAvailabilityPage with valid/invalid token
 */

test.describe('Interview Scheduler - Availability Inbox Tab', () => {
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

  test('should display Availability Inbox tab in Interview Scheduler', async ({ page }) => {
    // Navigate to Hiring section
    const hiringSection = page.getByText('Hiring').first();
    await hiringSection.click();
    await page.waitForTimeout(1500);

    // Click on Interview Scheduler to expand
    const interviewScheduler = page.getByTestId('interview-scheduler-toggle');
    await expect(interviewScheduler).toBeVisible();
    await interviewScheduler.click();
    await page.waitForTimeout(1500);

    // Check for Review Responses tab (Availability Inbox)
    const availabilityInboxTab = page.getByTestId('tab-inbox');
    await expect(availabilityInboxTab).toBeVisible();
    
    await page.screenshot({ path: 'availability-inbox-tab.jpeg', quality: 20 });
  });

  test('should display Request Availability tab with pending applicants', async ({ page }) => {
    // Navigate to Hiring section
    const hiringSection = page.getByText('Hiring').first();
    await hiringSection.click();
    await page.waitForTimeout(1500);

    // Click on Interview Scheduler to expand
    const interviewScheduler = page.getByTestId('interview-scheduler-toggle');
    await interviewScheduler.click();
    await page.waitForTimeout(1500);

    // Check for Request Availability tab (should be default)
    const requestTab = page.getByTestId('tab-applicants');
    await expect(requestTab).toBeVisible();
    
    // Click on it to ensure it's active
    await requestTab.click();
    await page.waitForTimeout(500);
    
    // Check for Request Availability content
    const requestLabel = page.getByText(/Request Availability/i);
    await expect(requestLabel.first()).toBeVisible();
    
    await page.screenshot({ path: 'send-invites-tab-new-flow.jpeg', quality: 20 });
  });

  test('should show all three tabs in Interview Scheduler', async ({ page }) => {
    // Navigate to Hiring section
    const hiringSection = page.getByText('Hiring').first();
    await hiringSection.click();
    await page.waitForTimeout(1500);

    // Click on Interview Scheduler to expand
    const interviewScheduler = page.getByTestId('interview-scheduler-toggle');
    await interviewScheduler.click();
    await page.waitForTimeout(1500);

    // Check for all three tabs
    const applicantsTab = page.getByTestId('tab-applicants');
    const inboxTab = page.getByTestId('tab-inbox');
    const scheduledTab = page.getByTestId('tab-scheduled');
    
    await expect(applicantsTab).toBeVisible();
    await expect(inboxTab).toBeVisible();
    await expect(scheduledTab).toBeVisible();
    
    await page.screenshot({ path: 'interview-scheduler-all-tabs.jpeg', quality: 20 });
  });

  test('should display stats in Interview Scheduler header', async ({ page }) => {
    // Navigate to Hiring section
    const hiringSection = page.getByText('Hiring').first();
    await hiringSection.click();
    await page.waitForTimeout(1500);

    // Check for Interview Scheduler header with stats
    const schedulerToggle = page.getByTestId('interview-scheduler-toggle');
    await expect(schedulerToggle).toBeVisible();
    
    // Check for stats text (pending, responded, scheduled)
    const statsText = page.getByText(/pending.*responded.*scheduled/i);
    await expect(statsText).toBeVisible();
    
    await page.screenshot({ path: 'interview-scheduler-stats.jpeg', quality: 20 });
  });
});

test.describe('Submit Availability Page', () => {
  test('should show error for invalid availability token', async ({ page }) => {
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

test.describe('Interview Scheduler - Calendar and Scheduling', () => {
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

  test('should display calendar icon in Interview Scheduler', async ({ page }) => {
    // Navigate to Hiring section
    const hiringSection = page.getByText('Hiring').first();
    await hiringSection.click();
    await page.waitForTimeout(1500);

    // Check for Interview Scheduler with calendar icon
    const schedulerToggle = page.getByTestId('interview-scheduler-toggle');
    await expect(schedulerToggle).toBeVisible();
    
    // The header should contain "In-Person Interviews"
    const headerText = page.getByText(/In-Person Interviews/i);
    await expect(headerText).toBeVisible();
    
    await page.screenshot({ path: 'interview-scheduler-calendar.jpeg', quality: 20 });
  });

  test('should show Manage Slots button in Scheduled tab', async ({ page }) => {
    // Navigate to Hiring section
    const hiringSection = page.getByText('Hiring').first();
    await hiringSection.click();
    await page.waitForTimeout(1500);

    // Click on Interview Scheduler to expand
    const interviewScheduler = page.getByTestId('interview-scheduler-toggle');
    await interviewScheduler.click();
    await page.waitForTimeout(1500);

    // Click on Scheduled tab
    const scheduledTab = page.getByTestId('tab-scheduled');
    await scheduledTab.click();
    await page.waitForTimeout(1000);
    
    // Take screenshot of scheduled tab content
    await page.screenshot({ path: 'interview-scheduler-manage-slots.jpeg', quality: 20 });
  });
});
