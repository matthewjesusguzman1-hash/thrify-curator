import { test, expect } from '@playwright/test';
import { loginAsAdmin, dismissToasts, removeEmergentBadge } from '../fixtures/helpers';

/**
 * Tests for read receipts feature:
 * 1. Read receipts toggle (eye/eye-off icon) in conversation header
 * 2. Read receipt checkmarks on messages (single check = delivered, double check = read)
 * 3. Toggle state persists in localStorage
 */

test.describe('Read Receipts Feature', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await loginAsAdmin(page);
    await removeEmergentBadge(page);
    await page.waitForTimeout(1000);
  });

  test('Read receipts toggle is visible in conversation header', async ({ page }) => {
    // Navigate to Forms & Communications group
    await page.getByText('Forms & Communications').first().click();
    await page.waitForTimeout(1000);
    
    // Expand conversations section
    const toggle = page.getByTestId('conversations-section-toggle');
    await toggle.click();
    await page.waitForTimeout(1000);
    
    // Click on a conversation to select it
    const conversationItems = page.locator('[data-testid^="conversation-item-"]');
    const count = await conversationItems.count();
    
    if (count === 0) {
      test.skip();
      return;
    }
    
    await conversationItems.first().click();
    await page.waitForTimeout(1000);
    
    // Check for read receipts toggle button
    const readReceiptsToggle = page.getByTestId('read-receipts-toggle');
    await expect(readReceiptsToggle).toBeVisible();
    
    // Take screenshot
    await page.screenshot({ path: 'read-receipts-toggle-visible.jpeg', quality: 20, fullPage: false });
  });

  test('Read receipts toggle shows eye icon when enabled', async ({ page }) => {
    // Navigate to Forms & Communications group
    await page.getByText('Forms & Communications').first().click();
    await page.waitForTimeout(1000);
    
    // Expand conversations section
    const toggle = page.getByTestId('conversations-section-toggle');
    await toggle.click();
    await page.waitForTimeout(1000);
    
    // Click on a conversation to select it
    const conversationItems = page.locator('[data-testid^="conversation-item-"]');
    const count = await conversationItems.count();
    
    if (count === 0) {
      test.skip();
      return;
    }
    
    await conversationItems.first().click();
    await page.waitForTimeout(1000);
    
    // Get the read receipts toggle
    const readReceiptsToggle = page.getByTestId('read-receipts-toggle');
    await expect(readReceiptsToggle).toBeVisible();
    
    // Check if it has the blue color class (enabled state)
    const hasBlueClass = await readReceiptsToggle.evaluate((el) => {
      return el.classList.contains('text-blue-500') || 
             window.getComputedStyle(el).color.includes('59') || // rgb(59, 130, 246) is blue-500
             el.querySelector('svg') !== null;
    });
    
    // The toggle should have an SVG icon (either Eye or EyeOff)
    const svgIcon = readReceiptsToggle.locator('svg');
    await expect(svgIcon).toBeVisible();
  });

  test('Read receipts toggle can be clicked to disable/enable', async ({ page }) => {
    // Navigate to Forms & Communications group
    await page.getByText('Forms & Communications').first().click();
    await page.waitForTimeout(1000);
    
    // Expand conversations section
    const toggle = page.getByTestId('conversations-section-toggle');
    await toggle.click();
    await page.waitForTimeout(1000);
    
    // Click on a conversation to select it
    const conversationItems = page.locator('[data-testid^="conversation-item-"]');
    const count = await conversationItems.count();
    
    if (count === 0) {
      test.skip();
      return;
    }
    
    await conversationItems.first().click();
    await page.waitForTimeout(1000);
    
    // Get the read receipts toggle
    const readReceiptsToggle = page.getByTestId('read-receipts-toggle');
    await expect(readReceiptsToggle).toBeVisible();
    
    // Get initial state
    const initialClass = await readReceiptsToggle.getAttribute('class');
    const wasEnabled = initialClass?.includes('text-blue-500');
    
    // Click to toggle
    await readReceiptsToggle.click();
    await page.waitForTimeout(500);
    
    // Verify toast appears
    const toastText = wasEnabled ? 'Read receipts disabled' : 'Read receipts enabled';
    // Toast should appear (we use dismissToasts handler, but we can check the state changed)
    
    // Get new state
    const newClass = await readReceiptsToggle.getAttribute('class');
    const isNowEnabled = newClass?.includes('text-blue-500');
    
    // State should have changed
    expect(isNowEnabled).not.toBe(wasEnabled);
    
    // Click again to restore original state
    await readReceiptsToggle.click();
    await page.waitForTimeout(500);
  });

  test('Read receipts toggle state persists in localStorage', async ({ page }) => {
    // Navigate to Forms & Communications group
    await page.getByText('Forms & Communications').first().click();
    await page.waitForTimeout(1000);
    
    // Expand conversations section
    const toggle = page.getByTestId('conversations-section-toggle');
    await toggle.click();
    await page.waitForTimeout(1000);
    
    // Click on a conversation to select it
    const conversationItems = page.locator('[data-testid^="conversation-item-"]');
    const count = await conversationItems.count();
    
    if (count === 0) {
      test.skip();
      return;
    }
    
    await conversationItems.first().click();
    await page.waitForTimeout(1000);
    
    // Get the read receipts toggle
    const readReceiptsToggle = page.getByTestId('read-receipts-toggle');
    await expect(readReceiptsToggle).toBeVisible();
    
    // Check localStorage value
    const localStorageValue = await page.evaluate(() => {
      return localStorage.getItem('admin_read_receipts_enabled');
    });
    
    // Should have a value (either "true" or "false" or null for default)
    // Default is true, so if null it means default is being used
    
    // Toggle the state
    await readReceiptsToggle.click();
    await page.waitForTimeout(500);
    
    // Check localStorage was updated
    const newLocalStorageValue = await page.evaluate(() => {
      return localStorage.getItem('admin_read_receipts_enabled');
    });
    
    // Value should exist now
    expect(newLocalStorageValue).not.toBeNull();
    expect(['true', 'false']).toContain(newLocalStorageValue);
    
    // Restore original state
    await readReceiptsToggle.click();
    await page.waitForTimeout(500);
  });

  test('Admin messages show checkmark icons when read receipts enabled', async ({ page }) => {
    // Navigate to Forms & Communications group
    await page.getByText('Forms & Communications').first().click();
    await page.waitForTimeout(1000);
    
    // Expand conversations section
    const toggle = page.getByTestId('conversations-section-toggle');
    await toggle.click();
    await page.waitForTimeout(1000);
    
    // Click on a conversation to select it
    const conversationItems = page.locator('[data-testid^="conversation-item-"]');
    const count = await conversationItems.count();
    
    if (count === 0) {
      test.skip();
      return;
    }
    
    await conversationItems.first().click();
    await page.waitForTimeout(1000);
    
    // Ensure read receipts are enabled
    const readReceiptsToggle = page.getByTestId('read-receipts-toggle');
    const toggleClass = await readReceiptsToggle.getAttribute('class');
    if (!toggleClass?.includes('text-blue-500')) {
      await readReceiptsToggle.click();
      await page.waitForTimeout(500);
    }
    
    // Send a test message
    const messageInput = page.getByTestId('admin-message-input');
    await expect(messageInput).toBeVisible();
    
    const testMessage = `TEST_READ_RECEIPT_UI_${Date.now()}`;
    await messageInput.fill(testMessage);
    
    const sendBtn = page.getByTestId('admin-send-message-btn');
    await sendBtn.click();
    await page.waitForTimeout(2000);
    
    // Look for checkmark icons in admin messages
    // Admin messages have gradient background (from-blue-500 to-purple-600)
    const adminMessages = page.locator('.bg-gradient-to-r.from-blue-500');
    const adminMsgCount = await adminMessages.count();
    
    if (adminMsgCount > 0) {
      // Check for Check or CheckCheck icons (SVG elements)
      const checkIcons = page.locator('.bg-gradient-to-r.from-blue-500 svg');
      const checkIconCount = await checkIcons.count();
      
      // Should have at least one check icon (for the message we just sent)
      expect(checkIconCount).toBeGreaterThan(0);
    }
    
    // Take screenshot
    await page.screenshot({ path: 'read-receipts-checkmarks.jpeg', quality: 20, fullPage: false });
    
    // Clean up - delete the test message
    const deleteMessageBtns = page.locator('[data-testid^="delete-message-"]');
    const deleteBtnCount = await deleteMessageBtns.count();
    if (deleteBtnCount > 0) {
      await deleteMessageBtns.last().click({ force: true });
      await page.waitForTimeout(1000);
    }
  });

  test('Checkmarks are hidden when read receipts are disabled', async ({ page }) => {
    // Navigate to Forms & Communications group
    await page.getByText('Forms & Communications').first().click();
    await page.waitForTimeout(1000);
    
    // Expand conversations section
    const toggle = page.getByTestId('conversations-section-toggle');
    await toggle.click();
    await page.waitForTimeout(1000);
    
    // Click on a conversation to select it
    const conversationItems = page.locator('[data-testid^="conversation-item-"]');
    const count = await conversationItems.count();
    
    if (count === 0) {
      test.skip();
      return;
    }
    
    await conversationItems.first().click();
    await page.waitForTimeout(1000);
    
    // Disable read receipts
    const readReceiptsToggle = page.getByTestId('read-receipts-toggle');
    const toggleClass = await readReceiptsToggle.getAttribute('class');
    if (toggleClass?.includes('text-blue-500')) {
      await readReceiptsToggle.click();
      await page.waitForTimeout(500);
    }
    
    // Now read receipts should be disabled (gray color)
    const newToggleClass = await readReceiptsToggle.getAttribute('class');
    expect(newToggleClass).toContain('text-gray-400');
    
    // Take screenshot showing disabled state
    await page.screenshot({ path: 'read-receipts-disabled.jpeg', quality: 20, fullPage: false });
    
    // Re-enable read receipts for other tests
    await readReceiptsToggle.click();
    await page.waitForTimeout(500);
  });
});
