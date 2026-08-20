import { test, expect } from '@playwright/test';

/**
 * Test Interview Scheduling Features
 * Tests the new preselect/review workflow for interview scheduling:
 * 1. CT (Central Time) conversion displays when admin selects specific 30-min meeting time
 * 2. Schedule (Save Draft) button appears and works
 * 3. Review Scheduled view shows all scheduled interviews with both PHT and CT times
 * 4. Send individual scheduled interview confirmation
 * 5. Send All bulk send for multiple scheduled interviews
 */

test.describe('Interview Scheduling Workflow', () => {
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

  test('should display Interview Inbox button and open modal', async ({ page }) => {
    // Navigate to Hiring section (which contains Applicant Skills Tests)
    const hiringSection = page.getByText('Hiring').first();
    await expect(hiringSection).toBeVisible();
    await hiringSection.click();
    await page.waitForTimeout(1500);
    
    // Check for Interview Inbox button
    const inboxButton = page.getByTestId('interview-inbox-btn');
    await expect(inboxButton).toBeVisible();
    
    // Click to open modal
    await inboxButton.click();
    await page.waitForTimeout(1500);
    
    // Check modal is open
    const modalTitle = page.getByRole('heading', { name: /Interview Inbox/i });
    await expect(modalTitle).toBeVisible();
    
    await page.screenshot({ path: 'interview-inbox-modal-open.jpeg', quality: 20 });
  });

  test('should show Review Scheduled button when scheduled interviews exist', async ({ page }) => {
    // Navigate to Hiring section
    const hiringSection = page.getByText('Hiring').first();
    await hiringSection.click();
    await page.waitForTimeout(1500);
    
    // Open Interview Inbox
    const inboxButton = page.getByTestId('interview-inbox-btn');
    await inboxButton.click();
    await page.waitForTimeout(2000);
    
    // Look for Review Scheduled button - should be visible with count
    const reviewScheduledBtn = page.getByRole('button', { name: /Review Scheduled/i });
    await expect(reviewScheduledBtn).toBeVisible();
    
    // Verify it shows a count
    await expect(reviewScheduledBtn).toContainText(/\d+/);
    
    await page.screenshot({ path: 'review-scheduled-button.jpeg', quality: 20 });
  });

  test('should display scheduled status badge for scheduled interviews', async ({ page }) => {
    // Navigate to Hiring section
    const hiringSection = page.getByText('Hiring').first();
    await hiringSection.click();
    await page.waitForTimeout(1500);
    
    // Open Interview Inbox
    const inboxButton = page.getByTestId('interview-inbox-btn');
    await inboxButton.click();
    await page.waitForTimeout(2000);
    
    // Look for "Scheduled" status badge (purple)
    const scheduledBadge = page.locator('span').filter({ hasText: /^Scheduled$/ });
    await expect(scheduledBadge.first()).toBeVisible();
    
    await page.screenshot({ path: 'scheduled-status-badge.jpeg', quality: 20 });
  });

  test('should display responded status badge for responded interviews', async ({ page }) => {
    // Navigate to Hiring section
    const hiringSection = page.getByText('Hiring').first();
    await hiringSection.click();
    await page.waitForTimeout(1500);
    
    // Open Interview Inbox
    const inboxButton = page.getByTestId('interview-inbox-btn');
    await inboxButton.click();
    await page.waitForTimeout(2000);
    
    // Look for "Responded" status badge (green)
    const respondedBadge = page.locator('span').filter({ hasText: /^Responded$/ });
    await expect(respondedBadge.first()).toBeVisible();
    
    await page.screenshot({ path: 'responded-status-badge.jpeg', quality: 20 });
  });
});

test.describe('CT Time Conversion Display', () => {
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

  test('should show CT time in applicant available times section', async ({ page }) => {
    // Navigate to Hiring section
    const hiringSection = page.getByText('Hiring').first();
    await hiringSection.click();
    await page.waitForTimeout(1500);
    
    // Open Interview Inbox
    const inboxButton = page.getByTestId('interview-inbox-btn');
    await inboxButton.click();
    await page.waitForTimeout(2000);
    
    // Click on a responded interview to see details
    const respondedInterview = page.locator('text=Test Applicant 3').first();
    await respondedInterview.click();
    await page.waitForTimeout(1500);
    
    // Check for "Your Time (Central)" label in the details
    const ctLabel = page.getByText(/Your Time.*Central/i);
    await expect(ctLabel).toBeVisible();
    
    await page.screenshot({ path: 'ct-time-in-details.jpeg', quality: 20 });
  });

  test('should show CT time conversion when selecting specific meeting time', async ({ page }) => {
    // Navigate to Hiring section
    const hiringSection = page.getByText('Hiring').first();
    await hiringSection.click();
    await page.waitForTimeout(1500);
    
    // Open Interview Inbox
    const inboxButton = page.getByTestId('interview-inbox-btn');
    await inboxButton.click();
    await page.waitForTimeout(2000);
    
    // Click on a responded interview
    const respondedInterview = page.locator('text=Test Applicant 3').first();
    await respondedInterview.click();
    await page.waitForTimeout(1500);
    
    // Click Send Meeting Link button
    const sendMeetingLinkBtn = page.getByRole('button', { name: /Send Meeting Link/i });
    await sendMeetingLinkBtn.click();
    await page.waitForTimeout(1500);
    
    // Click on the available time slot to select it
    const timeSlot = page.locator('button').filter({ hasText: /Wednesday, Mar 4|Available:/ }).first();
    await timeSlot.click();
    await page.waitForTimeout(500);
    
    // Enter specific time in the time input
    const timeInput = page.locator('input[type="time"]');
    await timeInput.fill('14:30');
    await page.waitForTimeout(1000);
    
    // Check for CT time conversion display - use first() to avoid strict mode violation
    const ctTimeDisplay = page.getByText(/Your Time.*Central/i).first();
    await expect(ctTimeDisplay).toBeVisible();
    
    // Check for CT time value (should contain "CT" and time)
    const ctTimeValue = page.getByText(/\d+:\d+.*CT/);
    await expect(ctTimeValue.first()).toBeVisible();
    
    await page.screenshot({ path: 'ct-time-conversion-display.jpeg', quality: 20 });
  });

  test('should show Schedule (Review Later) button in meeting confirmation modal', async ({ page }) => {
    // Navigate to Hiring section
    const hiringSection = page.getByText('Hiring').first();
    await hiringSection.click();
    await page.waitForTimeout(1500);
    
    // Open Interview Inbox
    const inboxButton = page.getByTestId('interview-inbox-btn');
    await inboxButton.click();
    await page.waitForTimeout(2000);
    
    // Click on a responded interview
    const respondedInterview = page.locator('text=Test Applicant 3').first();
    await respondedInterview.click();
    await page.waitForTimeout(1500);
    
    // Click Send Meeting Link button
    const sendMeetingLinkBtn = page.getByRole('button', { name: /Send Meeting Link/i });
    await sendMeetingLinkBtn.click();
    await page.waitForTimeout(1500);
    
    // Look for "Schedule (Review Later)" button
    const scheduleBtn = page.getByRole('button', { name: /Schedule.*Review Later/i });
    await expect(scheduleBtn).toBeVisible();
    
    await page.screenshot({ path: 'schedule-review-later-button.jpeg', quality: 20 });
  });
});

test.describe('Review Scheduled Summary View', () => {
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

  test('should toggle Review Scheduled summary view', async ({ page }) => {
    // Navigate to Hiring section
    const hiringSection = page.getByText('Hiring').first();
    await hiringSection.click();
    await page.waitForTimeout(1500);
    
    // Open Interview Inbox
    const inboxButton = page.getByTestId('interview-inbox-btn');
    await inboxButton.click();
    await page.waitForTimeout(2000);
    
    // Click Review Scheduled button
    const reviewScheduledBtn = page.getByRole('button', { name: /Review Scheduled/i });
    await reviewScheduledBtn.click();
    await page.waitForTimeout(1000);
    
    // Should show the scheduled interviews summary
    const summaryTitle = page.getByText(/Scheduled Interviews.*Review Before Sending/i);
    await expect(summaryTitle).toBeVisible();
    
    await page.screenshot({ path: 'review-scheduled-summary-view.jpeg', quality: 20 });
  });

  test('should display Send All button in scheduled summary', async ({ page }) => {
    // Navigate to Hiring section
    const hiringSection = page.getByText('Hiring').first();
    await hiringSection.click();
    await page.waitForTimeout(1500);
    
    // Open Interview Inbox
    const inboxButton = page.getByTestId('interview-inbox-btn');
    await inboxButton.click();
    await page.waitForTimeout(2000);
    
    // Click Review Scheduled button
    const reviewScheduledBtn = page.getByRole('button', { name: /Review Scheduled/i });
    await reviewScheduledBtn.click();
    await page.waitForTimeout(1000);
    
    // Should show Send All button
    const sendAllBtn = page.getByRole('button', { name: /Send All/i });
    await expect(sendAllBtn).toBeVisible();
    
    await page.screenshot({ path: 'send-all-button.jpeg', quality: 20 });
  });

  test('should display both PHT and CT times in scheduled summary', async ({ page }) => {
    // Navigate to Hiring section
    const hiringSection = page.getByText('Hiring').first();
    await hiringSection.click();
    await page.waitForTimeout(1500);
    
    // Open Interview Inbox
    const inboxButton = page.getByTestId('interview-inbox-btn');
    await inboxButton.click();
    await page.waitForTimeout(2000);
    
    // Click Review Scheduled button
    const reviewScheduledBtn = page.getByRole('button', { name: /Review Scheduled/i });
    await reviewScheduledBtn.click();
    await page.waitForTimeout(1000);
    
    // Look for PHT time display
    const phtTime = page.getByText(/PHT/i);
    await expect(phtTime.first()).toBeVisible();
    
    // Look for CT time display (labeled as "Your time:")
    const ctTimeLabel = page.getByText(/Your time:/i);
    await expect(ctTimeLabel.first()).toBeVisible();
    
    await page.screenshot({ path: 'scheduled-times-pht-ct.jpeg', quality: 20 });
  });

  test('should have individual Send buttons for each scheduled interview', async ({ page }) => {
    // Navigate to Hiring section
    const hiringSection = page.getByText('Hiring').first();
    await hiringSection.click();
    await page.waitForTimeout(1500);
    
    // Open Interview Inbox
    const inboxButton = page.getByTestId('interview-inbox-btn');
    await inboxButton.click();
    await page.waitForTimeout(2000);
    
    // Click Review Scheduled button
    const reviewScheduledBtn = page.getByRole('button', { name: /Review Scheduled/i });
    await reviewScheduledBtn.click();
    await page.waitForTimeout(1000);
    
    // Look for individual Send buttons (not Send All)
    const sendButtons = page.getByRole('button', { name: /^Send$/i });
    await expect(sendButtons.first()).toBeVisible();
    
    await page.screenshot({ path: 'individual-send-buttons.jpeg', quality: 20 });
  });
});
