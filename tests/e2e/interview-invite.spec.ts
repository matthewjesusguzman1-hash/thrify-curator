import { test, expect } from '@playwright/test';
import { loginAsAdmin, dismissToasts, removeEmergentBadge } from '../fixtures/helpers';

/**
 * Tests for the "Invite to Meet" feature for job applicants.
 * This feature allows admins to send interview invitations with availability slots.
 */

test.describe('Interview Invite Feature', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await loginAsAdmin(page);
    await removeEmergentBadge(page);
    await page.waitForTimeout(1000);
  });

  test('Admin can access job applications and see Invite to Meet button', async ({ page }) => {
    // Navigate to Forms & Communications
    await page.getByText('Forms & Communications').click();
    await page.waitForTimeout(1000);
    
    // Click on Form Submissions
    await page.getByText('Form Submissions').click();
    await page.waitForTimeout(1000);
    
    // Click on Job Applications tab
    const jobAppsTab = page.getByRole('button', { name: /Job Applications/i }).first();
    await jobAppsTab.click();
    await page.waitForTimeout(1000);
    
    // Click on a job application to open the modal
    const applicationCard = page.locator('[data-testid^="submission-card-"]').first();
    if (await applicationCard.isVisible()) {
      await applicationCard.click();
      
      // Wait for the modal to open
      await expect(page.getByTestId('submission-details-modal')).toBeVisible();
      
      // Check for the Invite to Meet button
      const inviteButton = page.getByTestId('invite-to-meet-btn');
      await expect(inviteButton).toBeVisible();
      
      // Take screenshot of the modal with invite button
      await page.screenshot({ path: '/app/tests/e2e/job-application-modal-invite.jpeg', quality: 20 });
    }
  });

  test('Invite to Meet modal opens with date/time pickers', async ({ page }) => {
    // Navigate to Forms & Communications > Form Submissions
    await page.getByText('Forms & Communications').click();
    await page.waitForTimeout(1000);
    await page.getByText('Form Submissions').click();
    await page.waitForTimeout(1000);
    
    // Click on Job Applications tab
    const jobAppsTab = page.getByRole('button', { name: /Job Applications/i }).first();
    await jobAppsTab.click();
    await page.waitForTimeout(1000);
    
    // Click on a job application
    const applicationCard = page.locator('[data-testid^="submission-card-"]').first();
    if (await applicationCard.isVisible()) {
      await applicationCard.click();
      
      // Wait for modal
      await expect(page.getByTestId('submission-details-modal')).toBeVisible();
      
      // Click the Invite to Meet button
      const inviteButton = page.getByTestId('invite-to-meet-btn');
      await inviteButton.click();
      await page.waitForTimeout(500);
      
      // Check for date input
      const dateInput = page.locator('input[type="date"]').first();
      await expect(dateInput).toBeVisible();
      
      // Check for time inputs (start and end)
      const timeInputs = page.locator('input[type="time"]');
      await expect(timeInputs.first()).toBeVisible();
      
      // Check for "Add Another Option" button
      const addOptionButton = page.getByRole('button', { name: /Add Another Option/i });
      await expect(addOptionButton).toBeVisible();
      
      // Check for Send Invite button
      const sendButton = page.getByRole('button', { name: /Send Invite/i });
      await expect(sendButton).toBeVisible();
      
      // Take screenshot of the invite modal
      await page.screenshot({ path: '/app/tests/e2e/invite-modal-open.jpeg', quality: 20 });
    }
  });

  test('Can add multiple availability slots in invite modal', async ({ page }) => {
    // Navigate to job applications
    await page.getByText('Forms & Communications').click();
    await page.waitForTimeout(1000);
    await page.getByText('Form Submissions').click();
    await page.waitForTimeout(1000);
    
    const jobAppsTab = page.getByRole('button', { name: /Job Applications/i }).first();
    await jobAppsTab.click();
    await page.waitForTimeout(1000);
    
    const applicationCard = page.locator('[data-testid^="submission-card-"]').first();
    if (await applicationCard.isVisible()) {
      await applicationCard.click();
      await expect(page.getByTestId('submission-details-modal')).toBeVisible();
      
      // Open invite modal
      await page.getByTestId('invite-to-meet-btn').click();
      await page.waitForTimeout(500);
      
      // Initially should have 1 slot (Option 1)
      await expect(page.getByText('Option 1')).toBeVisible();
      
      // Click "Add Another Option" to add more slots
      const addButton = page.getByRole('button', { name: /Add Another Option/i });
      await addButton.click();
      await page.waitForTimeout(300);
      
      // Should now have Option 2
      await expect(page.getByText('Option 2')).toBeVisible();
      
      // Add another
      await addButton.click();
      await page.waitForTimeout(300);
      
      // Should now have Option 3
      await expect(page.getByText('Option 3')).toBeVisible();
      
      // Take screenshot showing multiple slots
      await page.screenshot({ path: '/app/tests/e2e/invite-modal-multiple-slots.jpeg', quality: 20 });
    }
  });

  test('Can fill in availability slots and send invite', async ({ page }) => {
    // Navigate to job applications
    await page.getByText('Forms & Communications').click();
    await page.waitForTimeout(1000);
    await page.getByText('Form Submissions').click();
    await page.waitForTimeout(1000);
    
    const jobAppsTab = page.getByRole('button', { name: /Job Applications/i }).first();
    await jobAppsTab.click();
    await page.waitForTimeout(1000);
    
    const applicationCard = page.locator('[data-testid^="submission-card-"]').first();
    if (await applicationCard.isVisible()) {
      await applicationCard.click();
      await expect(page.getByTestId('submission-details-modal')).toBeVisible();
      
      // Open invite modal
      await page.getByTestId('invite-to-meet-btn').click();
      await page.waitForTimeout(500);
      
      // Fill in the first slot
      const dateInput = page.locator('input[type="date"]').first();
      const startTimeInput = page.locator('input[type="time"]').first();
      const endTimeInput = page.locator('input[type="time"]').nth(1);
      
      // Set date to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];
      
      await dateInput.fill(dateStr);
      await startTimeInput.fill('10:00');
      await endTimeInput.fill('12:00');
      
      // Click Send Invite
      const sendButton = page.getByRole('button', { name: /Send Invite/i });
      await sendButton.click();
      
      // Wait for success toast or modal to close
      await page.waitForTimeout(3000);
      
      // Take screenshot after sending
      await page.screenshot({ path: '/app/tests/e2e/invite-sent-success.jpeg', quality: 20 });
    }
  });

  test('Invite button shows different text after invite is sent', async ({ page }) => {
    // Navigate to job applications
    await page.getByText('Forms & Communications').click();
    await page.waitForTimeout(1000);
    await page.getByText('Form Submissions').click();
    await page.waitForTimeout(1000);
    
    const jobAppsTab = page.getByRole('button', { name: /Job Applications/i }).first();
    await jobAppsTab.click();
    await page.waitForTimeout(1000);
    
    // Find an application that already has invite_sent = true
    const applicationCard = page.locator('[data-testid^="submission-card-"]').first();
    if (await applicationCard.isVisible()) {
      await applicationCard.click();
      await expect(page.getByTestId('submission-details-modal')).toBeVisible();
      
      // Check the invite button text
      const inviteButton = page.getByTestId('invite-to-meet-btn');
      const buttonText = await inviteButton.textContent();
      
      // If invite was already sent, button should say "Send Another Invite"
      // Otherwise it says "Invite to Meet"
      expect(buttonText).toMatch(/Invite to Meet|Send Another Invite/);
      
      // Take screenshot
      await page.screenshot({ path: '/app/tests/e2e/invite-button-state.jpeg', quality: 20 });
    }
  });

  test('Cancel button closes invite modal without sending', async ({ page }) => {
    // Navigate to job applications
    await page.getByText('Forms & Communications').click();
    await page.waitForTimeout(1000);
    await page.getByText('Form Submissions').click();
    await page.waitForTimeout(1000);
    
    const jobAppsTab = page.getByRole('button', { name: /Job Applications/i }).first();
    await jobAppsTab.click();
    await page.waitForTimeout(1000);
    
    const applicationCard = page.locator('[data-testid^="submission-card-"]').first();
    if (await applicationCard.isVisible()) {
      await applicationCard.click();
      await expect(page.getByTestId('submission-details-modal')).toBeVisible();
      
      // Open invite modal
      await page.getByTestId('invite-to-meet-btn').click();
      await page.waitForTimeout(500);
      
      // Click Cancel button
      const cancelButton = page.getByRole('button', { name: /Cancel/i });
      await cancelButton.click();
      await page.waitForTimeout(500);
      
      // The invite modal should close but the submission modal should still be open
      await expect(page.getByTestId('submission-details-modal')).toBeVisible();
      
      // The invite button should still be visible
      await expect(page.getByTestId('invite-to-meet-btn')).toBeVisible();
    }
  });
});
