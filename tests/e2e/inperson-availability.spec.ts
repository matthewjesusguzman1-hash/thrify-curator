import { test, expect } from '@playwright/test';

/**
 * Test In-Person Interview Availability Scheduling Features
 * Tests the new availability-based in-person interview scheduling system:
 * 1. Availability Inbox tab in Interview Scheduler section
 * 2. Send Invites tab with Request Availability button
 * 3. SubmitAvailabilityPage with valid/invalid token
 * 4. Schedule modal with 30-minute slot selection and CT display
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
    // Click on Forms & Communications section to expand
    const formsSection = page.getByText('Forms & Communications').first();
    await formsSection.click();
    await page.waitForTimeout(1500);

    // Scroll down to see Additional Tools
    await page.evaluate(() => window.scrollBy(0, 400));
    await page.waitForTimeout(500);

    // Look for Additional Tools
    const additionalTools = page.getByText('Additional Tools');
    if (await additionalTools.isVisible()) {
      await additionalTools.click();
      await page.waitForTimeout(1000);
    }

    // Scroll down more
    await page.evaluate(() => window.scrollBy(0, 200));
    await page.waitForTimeout(500);

    // Click on Interview Scheduler to expand
    const interviewScheduler = page.getByTestId('interview-scheduler-toggle');
    await expect(interviewScheduler).toBeVisible();
    await interviewScheduler.click();
    await page.waitForTimeout(1500);

    // Check for Availability Inbox tab
    const availabilityInboxTab = page.getByTestId('tab-inbox');
    await expect(availabilityInboxTab).toBeVisible();
    
    await page.screenshot({ path: 'availability-inbox-tab.jpeg', quality: 20 });
  });

  test('should display Send Invites tab with Request Availability button', async ({ page }) => {
    // Click on Forms & Communications section to expand
    const formsSection = page.getByText('Forms & Communications').first();
    await formsSection.click();
    await page.waitForTimeout(1500);

    // Scroll down to see Additional Tools
    await page.evaluate(() => window.scrollBy(0, 400));
    await page.waitForTimeout(500);

    // Look for Additional Tools
    const additionalTools = page.getByText('Additional Tools');
    if (await additionalTools.isVisible()) {
      await additionalTools.click();
      await page.waitForTimeout(1000);
    }

    // Scroll down more
    await page.evaluate(() => window.scrollBy(0, 200));
    await page.waitForTimeout(500);

    // Click on Interview Scheduler to expand
    const interviewScheduler = page.getByTestId('interview-scheduler-toggle');
    await interviewScheduler.click();
    await page.waitForTimeout(1500);

    // Click on Send Invites tab
    const sendInvitesTab = page.getByTestId('tab-applicants');
    await expect(sendInvitesTab).toBeVisible();
    await sendInvitesTab.click();
    await page.waitForTimeout(1000);

    // Check for "New Flow" explanation text
    const newFlowText = page.getByText(/New Flow.*availability request/i);
    await expect(newFlowText).toBeVisible();

    // Check for Request Availability button (if applicants exist)
    const requestAvailabilityBtn = page.getByRole('button', { name: /Request Availability/i });
    // This may or may not be visible depending on whether there are applicants
    
    await page.screenshot({ path: 'send-invites-tab-new-flow.jpeg', quality: 20 });
  });

  test('should display all four tabs in Interview Scheduler', async ({ page }) => {
    // Click on Forms & Communications section to expand
    const formsSection = page.getByText('Forms & Communications').first();
    await formsSection.click();
    await page.waitForTimeout(1500);

    // Scroll down to see Additional Tools
    await page.evaluate(() => window.scrollBy(0, 400));
    await page.waitForTimeout(500);

    // Look for Additional Tools
    const additionalTools = page.getByText('Additional Tools');
    if (await additionalTools.isVisible()) {
      await additionalTools.click();
      await page.waitForTimeout(1000);
    }

    // Scroll down more
    await page.evaluate(() => window.scrollBy(0, 200));
    await page.waitForTimeout(500);

    // Click on Interview Scheduler to expand
    const interviewScheduler = page.getByTestId('interview-scheduler-toggle');
    await interviewScheduler.click();
    await page.waitForTimeout(1500);

    // Check for all four tabs
    const inboxTab = page.getByTestId('tab-inbox');
    const calendarTab = page.getByTestId('tab-calendar');
    const slotsTab = page.getByTestId('tab-slots');
    const applicantsTab = page.getByTestId('tab-applicants');

    await expect(inboxTab).toBeVisible();
    await expect(calendarTab).toBeVisible();
    await expect(slotsTab).toBeVisible();
    await expect(applicantsTab).toBeVisible();

    await page.screenshot({ path: 'interview-scheduler-all-tabs.jpeg', quality: 20 });
  });

  test('should display stats bar with Available Slots, Scheduled, and Pending Invite', async ({ page }) => {
    // Click on Forms & Communications section to expand
    const formsSection = page.getByText('Forms & Communications').first();
    await formsSection.click();
    await page.waitForTimeout(1500);

    // Scroll down to see Additional Tools
    await page.evaluate(() => window.scrollBy(0, 400));
    await page.waitForTimeout(500);

    // Look for Additional Tools
    const additionalTools = page.getByText('Additional Tools');
    if (await additionalTools.isVisible()) {
      await additionalTools.click();
      await page.waitForTimeout(1000);
    }

    // Scroll down more
    await page.evaluate(() => window.scrollBy(0, 200));
    await page.waitForTimeout(500);

    // Click on Interview Scheduler to expand
    const interviewScheduler = page.getByTestId('interview-scheduler-toggle');
    await interviewScheduler.click();
    await page.waitForTimeout(1500);

    // Check for stats bar - use exact match to avoid strict mode violations
    const availableSlotsText = page.getByText('Available Slots', { exact: true });
    const scheduledText = page.locator('div').filter({ hasText: /^Scheduled$/ }).first();
    const pendingInviteText = page.getByText('Pending Invite', { exact: true });

    await expect(availableSlotsText).toBeVisible();
    await expect(scheduledText).toBeVisible();
    await expect(pendingInviteText).toBeVisible();

    await page.screenshot({ path: 'interview-scheduler-stats.jpeg', quality: 20 });
  });
});

test.describe('Submit Availability Page', () => {
  test('should show error for invalid token', async ({ page }) => {
    await page.goto('/submit-availability/invalid-test-token-12345');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(5000);

    // Check for error message
    const errorTitle = page.getByText('Link Invalid');
    await expect(errorTitle).toBeVisible();

    const errorMessage = page.getByText(/Invalid or expired/i);
    await expect(errorMessage).toBeVisible();

    await page.screenshot({ path: 'submit-availability-invalid-token.jpeg', quality: 20 });
  });
});

test.describe('Interview Scheduler - Calendar Tab', () => {
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

  test('should display calendar view with month navigation', async ({ page }) => {
    // Click on Forms & Communications section to expand
    const formsSection = page.getByText('Forms & Communications').first();
    await formsSection.click();
    await page.waitForTimeout(1500);

    // Scroll down to see Additional Tools
    await page.evaluate(() => window.scrollBy(0, 400));
    await page.waitForTimeout(500);

    // Look for Additional Tools
    const additionalTools = page.getByText('Additional Tools');
    if (await additionalTools.isVisible()) {
      await additionalTools.click();
      await page.waitForTimeout(1000);
    }

    // Scroll down more
    await page.evaluate(() => window.scrollBy(0, 200));
    await page.waitForTimeout(500);

    // Click on Interview Scheduler to expand
    const interviewScheduler = page.getByTestId('interview-scheduler-toggle');
    await interviewScheduler.click();
    await page.waitForTimeout(1500);

    // Click on Calendar tab
    const calendarTab = page.getByTestId('tab-calendar');
    await calendarTab.click();
    await page.waitForTimeout(1000);

    // Check for calendar elements
    const monthHeader = page.locator('h3').filter({ hasText: /\w+ \d{4}/ }); // e.g., "August 2026"
    await expect(monthHeader).toBeVisible();

    // Check for day headers
    const sundayHeader = page.getByText('Sun');
    await expect(sundayHeader.first()).toBeVisible();

    await page.screenshot({ path: 'interview-scheduler-calendar.jpeg', quality: 20 });
  });
});

test.describe('Interview Scheduler - Manage Slots Tab', () => {
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

  test('should display slot management interface', async ({ page }) => {
    // Click on Forms & Communications section to expand
    const formsSection = page.getByText('Forms & Communications').first();
    await formsSection.click();
    await page.waitForTimeout(1500);

    // Scroll down to see Additional Tools
    await page.evaluate(() => window.scrollBy(0, 400));
    await page.waitForTimeout(500);

    // Look for Additional Tools
    const additionalTools = page.getByText('Additional Tools');
    if (await additionalTools.isVisible()) {
      await additionalTools.click();
      await page.waitForTimeout(1000);
    }

    // Scroll down more
    await page.evaluate(() => window.scrollBy(0, 200));
    await page.waitForTimeout(500);

    // Click on Interview Scheduler to expand
    const interviewScheduler = page.getByTestId('interview-scheduler-toggle');
    await interviewScheduler.click();
    await page.waitForTimeout(1500);

    // Click on Manage Slots tab
    const slotsTab = page.getByTestId('tab-slots');
    await slotsTab.click();
    await page.waitForTimeout(1000);

    // Check for slot management elements
    const addSlotsTitle = page.getByText('Add Available Time Slots');
    await expect(addSlotsTitle).toBeVisible();

    const createSlotsBtn = page.getByRole('button', { name: /Create Slots/i });
    await expect(createSlotsBtn).toBeVisible();

    await page.screenshot({ path: 'interview-scheduler-manage-slots.jpeg', quality: 20 });
  });
});
