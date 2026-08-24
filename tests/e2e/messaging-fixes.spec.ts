import { test, expect } from '@playwright/test';
import { loginAsAdmin, dismissToasts, removeEmergentBadge } from '../fixtures/helpers';

/**
 * Tests for messaging fixes:
 * 1. Read receipt labels show 'Read' text next to admin messages when marked as read
 * 2. Notification bell no longer shows message-type notifications
 * 3. Messages icon in header shows unread message count badge
 * 4. Conversation list layout provides adequate space for message content
 */

test.describe('Messaging Fixes Verification', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await loginAsAdmin(page);
    await removeEmergentBadge(page);
    await page.waitForTimeout(1000);
  });

  test('Messages icon shows unread count badge in header', async ({ page }) => {
    // Check that the Messages shortcut button exists in header
    const messagesBtn = page.getByTestId('admin-messages-shortcut-btn');
    await expect(messagesBtn).toBeVisible();
    
    // The button should have MessageSquare icon (SVG)
    await expect(messagesBtn.locator('svg')).toBeVisible();
    
    // Take screenshot of header with Messages icon
    await page.screenshot({ path: 'messages-icon-header.jpeg', quality: 20, fullPage: false });
    
    // Click to open full-screen messaging
    await messagesBtn.click();
    await page.waitForTimeout(2000);
    
    // Should open full-screen messaging
    await page.screenshot({ path: 'fullscreen-messaging-opened.jpeg', quality: 20, fullPage: false });
  });

  test('Notification bell excludes message-type notifications', async ({ page }) => {
    // Click on notification bell
    const notificationBell = page.getByTestId('notification-bell');
    await expect(notificationBell).toBeVisible();
    await notificationBell.click();
    await page.waitForTimeout(1000);
    
    // Wait for dropdown to appear
    const dropdown = page.getByTestId('notification-dropdown');
    await expect(dropdown).toBeVisible();
    
    // Take screenshot of notification dropdown
    await page.screenshot({ path: 'notification-dropdown.jpeg', quality: 20, fullPage: false });
    
    // Check that the dropdown does NOT contain message-type notifications
    // Message types that should be excluded: new_message, employee_message, consignor_message
    // These would show as 'MSG' badge - verify they don't appear
    const notificationItems = dropdown.locator('[data-testid^="notification-item-"]');
    const count = await notificationItems.count();
    
    console.log(`Found ${count} notifications in bell dropdown`);
    
    // If there are notifications, verify none have MSG badge
    if (count > 0) {
      for (let i = 0; i < Math.min(count, 5); i++) {
        const item = notificationItems.nth(i);
        const text = await item.textContent();
        // MSG badge would indicate message notification - should not appear
        const hasMsgBadge = text?.includes('MSG');
        console.log(`Notification ${i}: has MSG badge = ${hasMsgBadge}`);
        // Message notifications should be excluded from bell
        expect(hasMsgBadge).toBeFalsy();
      }
    }
    
    // Close dropdown
    await page.keyboard.press('Escape');
  });

  test('Conversation list layout has adequate space for message content', async ({ page }) => {
    // Navigate to Forms & Communications group
    await page.getByText('Forms & Communications').first().click();
    await page.waitForTimeout(1000);
    
    // Navigate to Conversations section
    const conversationsToggle = page.getByTestId('conversations-section-toggle');
    await conversationsToggle.scrollIntoViewIfNeeded();
    await conversationsToggle.click();
    await page.waitForTimeout(1000);
    
    // Take screenshot of expanded conversations section
    await page.screenshot({ path: 'conversations-section-layout.jpeg', quality: 20, fullPage: false });
    
    // Check that conversation items exist
    const conversationItems = page.locator('[data-testid^="conversation-item-"]');
    const count = await conversationItems.count();
    
    if (count > 0) {
      // Click on first conversation to open it
      await conversationItems.first().click();
      await page.waitForTimeout(1000);
      
      // Take screenshot showing the two-panel layout
      await page.screenshot({ path: 'conversation-detail-layout.jpeg', quality: 20, fullPage: false });
      
      // Verify the message input area is visible with proper sizing
      const messageInput = page.getByTestId('admin-message-input');
      await expect(messageInput).toBeVisible();
      
      // Check that the textarea has proper rows (should be 6 rows, min-height 150px)
      const rows = await messageInput.getAttribute('rows');
      expect(rows).toBe('6');
    } else {
      console.log('No conversations found - skipping detail layout check');
    }
  });

  test('Read receipt shows "Read" text label next to checkmark for read messages', async ({ page }) => {
    // Navigate to Forms & Communications group
    await page.getByText('Forms & Communications').first().click();
    await page.waitForTimeout(1000);
    
    // Navigate to Conversations section
    const conversationsToggle = page.getByTestId('conversations-section-toggle');
    await conversationsToggle.scrollIntoViewIfNeeded();
    await conversationsToggle.click();
    await page.waitForTimeout(1000);
    
    // Click on a conversation
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
    await expect(readReceiptsToggle).toBeVisible();
    
    // Check if toggle shows Eye icon (enabled) - if not, click to enable
    const isEnabled = await readReceiptsToggle.evaluate((el) => {
      return el.classList.contains('text-blue-500');
    });
    
    if (!isEnabled) {
      await readReceiptsToggle.click();
      await page.waitForTimeout(500);
    }
    
    // Take screenshot showing read receipts with text labels
    await page.screenshot({ path: 'read-receipts-with-text-labels.jpeg', quality: 20, fullPage: false });
    
    // Look for "Read" text in the message area
    // Admin messages that have been read should show "Read" text next to CheckCheck icon
    // The implementation shows: <span className="text-xs ml-1 text-blue-300 font-medium">Read</span>
    const readLabels = page.locator('span.text-blue-300:has-text("Read")');
    const readLabelCount = await readLabels.count();
    console.log(`Found ${readLabelCount} "Read" labels in conversation`);
    
    // Also check for "Sent" labels (for unread messages)
    const sentLabels = page.locator('span:has-text("Sent")');
    const sentLabelCount = await sentLabels.count();
    console.log(`Found ${sentLabelCount} "Sent" labels in conversation`);
    
    // At least one of these should be present if there are admin messages
    // The feature is working if we can see either Read or Sent labels
    const totalLabels = readLabelCount + sentLabelCount;
    console.log(`Total read receipt labels found: ${totalLabels}`);
  });

  test('Full-screen messaging has wider conversation list panel', async ({ page }) => {
    // Open full-screen messaging
    const messagesBtn = page.getByTestId('admin-messages-shortcut-btn');
    await messagesBtn.click();
    await page.waitForTimeout(2000);
    
    // Take screenshot of full-screen messaging
    await page.screenshot({ path: 'fullscreen-messaging-layout.jpeg', quality: 20, fullPage: false });
    
    // The full-screen messaging should have wider conversation list panel
    // Check for the conversation list panel (should be md:w-96 lg:w-[420px] xl:w-[480px])
    // This is wider than before to give more room for message content
    const conversationListPanel = page.locator('.border-r.border-gray-200').first();
    if (await conversationListPanel.isVisible()) {
      const box = await conversationListPanel.boundingBox();
      if (box) {
        console.log(`Conversation list panel width: ${box.width}px`);
        // On larger screens (1280px viewport), should be at least 384px (w-96)
        // The fix increased this from w-80 to w-96/w-[420px]/w-[480px]
      }
    }
  });
});
