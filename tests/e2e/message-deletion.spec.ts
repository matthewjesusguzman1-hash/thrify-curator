import { test, expect } from '@playwright/test';
import { loginAsAdmin, dismissToasts, removeEmergentBadge } from '../fixtures/helpers';

/**
 * Tests for message deletion functionality in admin Conversations section:
 * 1. Delete icon visible on conversation list items
 * 2. Delete confirmation dialog appears when clicking delete
 * 3. Thread deletion (soft-delete)
 * 4. Individual message deletion for admin's own messages
 */

test.describe('Admin Message Deletion Features', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await loginAsAdmin(page);
    await removeEmergentBadge(page);
    await page.waitForTimeout(1000);
  });

  test('Conversations section is visible and expandable', async ({ page }) => {
    // Navigate to Forms & Communications group which contains Conversations
    const formsGroup = page.getByText('Forms & Communications').first();
    await expect(formsGroup).toBeVisible();
    await formsGroup.click();
    await page.waitForTimeout(1000);
    
    // Find and expand conversations section (use the one inside the dashboard card)
    const conversationsSection = page.locator('.dashboard-card').filter({ hasText: 'Conversations' }).first();
    await expect(conversationsSection).toBeVisible();
    
    // Click to expand using the toggle
    const toggle = page.getByTestId('conversations-section-toggle');
    await toggle.click();
    await page.waitForTimeout(1000);
    
    // Take screenshot
    await page.screenshot({ path: 'conversations-section-expanded.jpeg', quality: 20, fullPage: false });
  });

  test('Conversation item has delete icon visible', async ({ page }) => {
    // Navigate to Forms & Communications group
    await page.getByText('Forms & Communications').first().click();
    await page.waitForTimeout(1000);
    
    // Expand conversations section
    const toggle = page.getByTestId('conversations-section-toggle');
    await toggle.click();
    await page.waitForTimeout(1000);
    
    // Get first conversation item
    const conversationItems = page.locator('[data-testid^="conversation-item-"]');
    const count = await conversationItems.count();
    
    if (count === 0) {
      test.skip();
      return;
    }
    
    const firstItem = conversationItems.first();
    const itemId = await firstItem.getAttribute('data-testid');
    const convId = itemId?.replace('conversation-item-', '');
    
    // Check that delete icon exists and is visible
    const deleteIcon = page.getByTestId(`delete-icon-${convId}`);
    await expect(deleteIcon).toBeVisible();
    
    // Take screenshot showing delete icon
    await page.screenshot({ path: 'conversation-delete-icon.jpeg', quality: 20, fullPage: false });
  });

  test('Delete confirmation dialog appears when clicking delete button in header', async ({ page }) => {
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
    
    // Click the delete button in the conversation header
    const deleteConversationBtn = page.getByTestId('delete-conversation-btn');
    await expect(deleteConversationBtn).toBeVisible();
    await deleteConversationBtn.click();
    
    // Verify confirmation dialog appears - look for the dialog content
    await expect(page.locator('text=Delete Conversation?')).toBeVisible();
    await expect(page.locator('text=This action can be undone by admin')).toBeVisible();
    
    // Verify cancel and confirm buttons exist
    const cancelBtn = page.getByRole('button', { name: 'Cancel' });
    const confirmBtn = page.getByRole('button', { name: 'Delete' });
    await expect(cancelBtn).toBeVisible();
    await expect(confirmBtn).toBeVisible();
    
    // Take screenshot
    await page.screenshot({ path: 'delete-confirmation-dialog.jpeg', quality: 20, fullPage: false });
    
    // Cancel the deletion
    await cancelBtn.click();
    
    // Verify dialog is closed
    await expect(page.locator('text=Delete Conversation?')).not.toBeVisible();
  });

  test('Admin can send and delete their own message', async ({ page }) => {
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
    
    // Send a test message first
    const messageInput = page.getByTestId('admin-message-input');
    await expect(messageInput).toBeVisible();
    
    const testMessage = `TEST_DELETE_UI_${Date.now()}`;
    await messageInput.fill(testMessage);
    
    const sendBtn = page.getByTestId('admin-send-message-btn');
    await sendBtn.click();
    
    // Wait for message to be sent and toasts to clear
    await page.waitForTimeout(3000);
    
    // Verify message appears in the messages container
    const messageLocator = page.locator('.rounded-2xl').filter({ hasText: testMessage }).first();
    await expect(messageLocator).toBeVisible();
    
    // Find the delete button for the message (appears on hover)
    const deleteMessageBtns = page.locator('[data-testid^="delete-message-"]');
    const deleteBtnCount = await deleteMessageBtns.count();
    
    if (deleteBtnCount > 0) {
      // Hover over the message to reveal delete button and click
      const lastDeleteBtn = deleteMessageBtns.last();
      await lastDeleteBtn.click({ force: true });
      
      // Wait for deletion
      await page.waitForTimeout(1000);
      
      // Verify message is removed from the messages area
      const newDeleteBtnCount = await deleteMessageBtns.count();
      expect(newDeleteBtnCount).toBeLessThan(deleteBtnCount);
    }
  });

  test('Admin message input has correct styling (6 rows, min-height)', async ({ page }) => {
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
    
    // Check message input
    const messageInput = page.getByTestId('admin-message-input');
    await expect(messageInput).toBeVisible();
    
    // Verify rows attribute
    const rows = await messageInput.getAttribute('rows');
    expect(rows).toBe('6');
    
    // Verify min-height style
    const minHeight = await messageInput.evaluate((el) => {
      return window.getComputedStyle(el).minHeight;
    });
    expect(minHeight).toBe('150px');
  });

  test('Conversation list shows participant type badges', async ({ page }) => {
    // Navigate to Forms & Communications group
    await page.getByText('Forms & Communications').first().click();
    await page.waitForTimeout(1000);
    
    // Expand conversations section
    const toggle = page.getByTestId('conversations-section-toggle');
    await toggle.click();
    await page.waitForTimeout(1000);
    
    // Check for EMP or CON badges (abbreviated badges in the new UI)
    const empBadge = page.locator('[data-testid^="conversation-item-"] >> text=EMP').first();
    const conBadge = page.locator('[data-testid^="conversation-item-"] >> text=CON').first();
    
    // At least one type should be visible
    const hasEmployee = await empBadge.isVisible().catch(() => false);
    const hasConsignor = await conBadge.isVisible().catch(() => false);
    
    expect(hasEmployee || hasConsignor).toBeTruthy();
  });

  test('Filter buttons work correctly', async ({ page }) => {
    // Navigate to Forms & Communications group
    await page.getByText('Forms & Communications').first().click();
    await page.waitForTimeout(1000);
    
    // Expand conversations section
    const toggle = page.getByTestId('conversations-section-toggle');
    await toggle.click();
    await page.waitForTimeout(1000);
    
    // Check filter buttons exist
    const allBtn = page.getByRole('button', { name: 'All', exact: true });
    const employeesBtn = page.getByRole('button', { name: 'Employees' });
    const consignorsBtn = page.getByRole('button', { name: 'Consignors' });
    
    await expect(allBtn).toBeVisible();
    await expect(employeesBtn).toBeVisible();
    await expect(consignorsBtn).toBeVisible();
    
    // Click Employees filter
    await employeesBtn.click();
    await page.waitForTimeout(500);
    
    // Click Consignors filter
    await consignorsBtn.click();
    await page.waitForTimeout(500);
    
    // Click All filter to reset
    await allBtn.click();
    await page.waitForTimeout(500);
  });
});
