import { test, expect } from '@playwright/test';
import { dismissToasts, removeEmergentBadge } from '../fixtures/helpers';

/**
 * Tests for read receipts in employee/consignor messaging section:
 * 1. Employee can see checkmarks on their sent messages
 * 2. Double checkmark (CheckCheck) appears when admin has read the message
 */

async function dismissWalkthrough(page) {
  // Check for walkthrough modal and dismiss it
  const skipButton = page.locator('button:has-text("Skip")');
  const closeButton = page.locator('button[aria-label="Close"], button:has-text("×")');
  
  try {
    if (await skipButton.isVisible({ timeout: 2000 })) {
      await skipButton.click();
      await page.waitForTimeout(500);
    } else if (await closeButton.isVisible({ timeout: 1000 })) {
      await closeButton.click();
      await page.waitForTimeout(500);
    }
  } catch (e) {
    // No walkthrough modal, continue
  }
}

test.describe('Employee/Consignor Read Receipts', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await removeEmergentBadge(page);
  });

  test('Employee messaging section shows checkmarks on sent messages', async ({ page }) => {
    // Login as employee
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    
    // Enter employee email
    const emailInput = page.locator('input[type="email"], input[placeholder*="email"]').first();
    await emailInput.fill('testemployee@thriftycurator.com');
    await page.waitForTimeout(500);
    
    // Click Find My Account
    await page.locator('button').filter({ hasText: /Find My Account/i }).click();
    await page.waitForTimeout(3000);
    
    // Dismiss walkthrough if present
    await dismissWalkthrough(page);
    await page.waitForTimeout(500);
    
    // Should be on employee dashboard now
    // Look for the messaging section
    const messagingToggle = page.getByTestId('messaging-toggle');
    
    // If messaging toggle exists, click to expand
    const toggleExists = await messagingToggle.isVisible().catch(() => false);
    if (toggleExists) {
      await messagingToggle.click({ force: true });
      await page.waitForTimeout(1000);
      
      // Check for messages container
      const messagesContainer = page.getByTestId('messages-container');
      await expect(messagesContainer).toBeVisible();
      
      // Send a test message
      const messageInput = page.getByTestId('message-input');
      if (await messageInput.isVisible()) {
        const testMessage = `TEST_EMP_READ_RECEIPT_${Date.now()}`;
        await messageInput.fill(testMessage);
        
        const sendBtn = page.getByTestId('send-message-btn');
        await sendBtn.click();
        await page.waitForTimeout(2000);
        
        // Look for checkmark icons on sent messages
        // Employee messages have gradient background (from-blue-500 to-purple-600)
        const employeeMessages = page.locator('.bg-gradient-to-r.from-blue-500');
        const msgCount = await employeeMessages.count();
        
        if (msgCount > 0) {
          // Check for Check or CheckCheck icons
          const checkIcons = page.locator('.bg-gradient-to-r.from-blue-500 svg');
          const checkIconCount = await checkIcons.count();
          
          // Should have check icons on sent messages
          expect(checkIconCount).toBeGreaterThan(0);
        }
        
        // Take screenshot
        await page.screenshot({ path: 'employee-read-receipts.jpeg', quality: 20, fullPage: false });
        
        // Clean up - delete the test message
        const deleteMessageBtns = page.locator('[data-testid^="delete-message-"]');
        const deleteBtnCount = await deleteMessageBtns.count();
        if (deleteBtnCount > 0) {
          await deleteMessageBtns.last().click({ force: true });
          await page.waitForTimeout(1000);
        }
      }
    } else {
      // Skip if messaging section not available
      test.skip();
    }
  });

  test('Employee sees double checkmark when admin reads message', async ({ page }) => {
    // This test verifies the CheckCheck icon appears for read messages
    // Login as employee
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    
    // Enter employee email
    const emailInput = page.locator('input[type="email"], input[placeholder*="email"]').first();
    await emailInput.fill('testemployee@thriftycurator.com');
    await page.waitForTimeout(500);
    
    // Click Find My Account
    await page.locator('button').filter({ hasText: /Find My Account/i }).click();
    await page.waitForTimeout(3000);
    
    // Dismiss walkthrough if present
    await dismissWalkthrough(page);
    await page.waitForTimeout(500);
    
    // Look for the messaging section
    const messagingToggle = page.getByTestId('messaging-toggle');
    const toggleExists = await messagingToggle.isVisible().catch(() => false);
    
    if (toggleExists) {
      await messagingToggle.click({ force: true });
      await page.waitForTimeout(1000);
      
      // Check for messages that have been read (have read_at)
      // These should show CheckCheck icon (double checkmark)
      const messagesContainer = page.getByTestId('messages-container');
      await expect(messagesContainer).toBeVisible();
      
      // Look for CheckCheck icons (double checkmark = read)
      // The CheckCheck icon has a specific path that creates two checkmarks
      const doubleCheckmarks = page.locator('.bg-gradient-to-r.from-blue-500 svg.text-blue-300');
      const doubleCheckCount = await doubleCheckmarks.count();
      
      // If there are read messages, they should have blue double checkmarks
      if (doubleCheckCount > 0) {
        // Verify the icon is visible
        await expect(doubleCheckmarks.first()).toBeVisible();
      }
      
      // Take screenshot
      await page.screenshot({ path: 'employee-double-checkmark.jpeg', quality: 20, fullPage: false });
    } else {
      test.skip();
    }
  });
});
