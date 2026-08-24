# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: message-deletion.spec.ts >> Admin Message Deletion Features >> Conversations section is visible and expandable
- Location: e2e/message-deletion.spec.ts:20:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByTestId('conversations-section')
Expected: visible
Error: strict mode violation: getByTestId('conversations-section') resolved to 2 elements:
    1) <div x-component="div" x-dynamic="false" x-line-number="3724" x-id="AdminDashboard_3724" x-file-name="AdminDashboard" data-testid="conversations-section">…</div> aka getByTestId('conversations-section').first()
    2) <div x-component="div" x-dynamic="false" x-line-number="483" class="dashboard-card" x-id="ConversationsSection_483" x-file-name="ConversationsSection" data-testid="conversations-section">…</div> aka getByTestId('conversations-section').nth(1)

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByTestId('conversations-section')

```

# Page snapshot

```yaml
- generic [ref=f3e3]:
  - generic [ref=f3e5]:
    - banner [ref=f3e6]:
      - paragraph [ref=f3e12]: Matthew Guzman
      - generic [ref=f3e13]:
        - button "Refresh dashboard" [ref=f3e14] [cursor=pointer]
        - button "Alerts 6" [ref=f3e16] [cursor=pointer]:
          - generic [ref=f3e17]: Alerts
          - generic [ref=f3e18]: "6"
        - link [ref=f3e19] [cursor=pointer]:
          - /url: /
          - button "Home" [ref=f3e20]
        - link [ref=f3e22] [cursor=pointer]:
          - /url: /dashboard
          - button "My Dashboard" [ref=f3e23]
        - button "Messages" [ref=f3e25] [cursor=pointer]
        - button "Logout" [ref=f3e27] [cursor=pointer]
    - main [ref=f3e29]:
      - generic [ref=f3e31]:
        - generic [ref=f3e32]:
          - heading "Admin Dashboard" [level=1] [ref=f3e34]
          - generic [ref=f3e36]:
            - generic [ref=f3e37]:
              - button "Add Employee" [ref=f3e38] [cursor=pointer]
              - button "Edit Employee" [ref=f3e40] [cursor=pointer]
              - button "Remove" [ref=f3e42] [cursor=pointer]
            - button "Start Trip" [ref=f3e46] [cursor=pointer]
        - generic [ref=f3e48]:
          - button "Team Management 4 team members" [ref=f3e50] [cursor=pointer]:
            - generic [ref=f3e58]:
              - heading "Team Management" [level=2] [ref=f3e59]
              - generic [ref=f3e60]: 4 team members
          - button "Payroll & Payments Track earnings & payments" [ref=f3e66] [cursor=pointer]:
            - generic [ref=f3e71]:
              - heading "Payroll & Payments" [level=2] [ref=f3e72]
              - generic [ref=f3e73]: Track earnings & payments
          - generic [ref=f3e78]:
            - button "Forms & Communications 0 new submissions" [active] [ref=f3e79] [cursor=pointer]:
              - generic [ref=f3e84]:
                - heading "Forms & Communications" [level=2] [ref=f3e85]
                - generic [ref=f3e86]: 0 new submissions
            - generic [ref=f3e94]:
              - generic [ref=f3e103] [cursor=pointer]:
                - heading "Form Submissions" [level=2] [ref=f3e104]
                - paragraph [ref=f3e105]:
                  - text: 2 total submissions
                  - generic [ref=f3e106]: ( 2 new)
              - generic [ref=f3e112]:
                - generic [ref=f3e116] [cursor=pointer]:
                  - generic [ref=f3e117]: "2"
                  - generic [ref=f3e125]:
                    - heading "Conversations" [level=2] [ref=f3e126]
                    - paragraph [ref=f3e127]:
                      - generic [ref=f3e128]: 2 unread message s
                - generic [ref=f3e141] [cursor=pointer]:
                  - heading "Messages" [level=2] [ref=f3e142]
                  - paragraph [ref=f3e143]:
                    - generic [ref=f3e144]: 0 total message s
          - button "Hiring Applications & Interviews" [ref=f3e151] [cursor=pointer]:
            - generic [ref=f3e158]:
              - heading "Hiring" [level=2] [ref=f3e159]
              - generic [ref=f3e160]: Applications & Interviews
          - button "Reports & Operations Sales, reports & tax prep" [ref=f3e166] [cursor=pointer]:
            - generic [ref=f3e172]:
              - heading "Reports & Operations" [level=2] [ref=f3e173]
              - generic [ref=f3e174]: Sales, reports & tax prep
  - region "Notifications alt+T"
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | import { loginAsAdmin, dismissToasts, removeEmergentBadge } from '../fixtures/helpers';
  3   | 
  4   | /**
  5   |  * Tests for message deletion functionality in admin Conversations section:
  6   |  * 1. Swipe-to-delete gesture on conversation list items
  7   |  * 2. Delete confirmation dialog appears when swiping or clicking delete
  8   |  * 3. Thread deletion (soft-delete)
  9   |  * 4. Individual message deletion for admin's own messages
  10  |  */
  11  | 
  12  | test.describe('Admin Message Deletion Features', () => {
  13  |   test.beforeEach(async ({ page }) => {
  14  |     await dismissToasts(page);
  15  |     await loginAsAdmin(page);
  16  |     await removeEmergentBadge(page);
  17  |     await page.waitForTimeout(1000);
  18  |   });
  19  | 
  20  |   test('Conversations section is visible and expandable', async ({ page }) => {
  21  |     // Navigate to Forms & Communications group which contains Conversations
  22  |     await page.getByText('Forms & Communications').first().click();
  23  |     await page.waitForTimeout(1000);
  24  |     
  25  |     // Find and expand conversations section
  26  |     const conversationsSection = page.getByTestId('conversations-section');
> 27  |     await expect(conversationsSection).toBeVisible();
      |                                        ^ Error: expect(locator).toBeVisible() failed
  28  |     
  29  |     // Click to expand
  30  |     const toggle = page.getByTestId('conversations-section-toggle');
  31  |     await toggle.click();
  32  |     await page.waitForTimeout(1000);
  33  |     
  34  |     // Take screenshot
  35  |     await page.screenshot({ path: 'conversations-section-expanded.jpeg', quality: 20, fullPage: false });
  36  |   });
  37  | 
  38  |   test('Swipe hint is visible on conversation items', async ({ page }) => {
  39  |     // Navigate to Forms & Communications group
  40  |     await page.getByText('Forms & Communications').first().click();
  41  |     await page.waitForTimeout(1000);
  42  |     
  43  |     // Expand conversations section
  44  |     const toggle = page.getByTestId('conversations-section-toggle');
  45  |     await toggle.click();
  46  |     await page.waitForTimeout(1000);
  47  |     
  48  |     // Check for swipe instruction text
  49  |     const swipeInstruction = page.locator('text=← Swipe right to delete a thread');
  50  |     await expect(swipeInstruction).toBeVisible();
  51  |     
  52  |     // Check for swipe hint on conversation items
  53  |     const swipeHint = page.locator('text=← swipe').first();
  54  |     await expect(swipeHint).toBeVisible();
  55  |   });
  56  | 
  57  |   test('Conversation item has delete button in DOM', async ({ page }) => {
  58  |     // Navigate to Forms & Communications group
  59  |     await page.getByText('Forms & Communications').first().click();
  60  |     await page.waitForTimeout(1000);
  61  |     
  62  |     // Expand conversations section
  63  |     const toggle = page.getByTestId('conversations-section-toggle');
  64  |     await toggle.click();
  65  |     await page.waitForTimeout(1000);
  66  |     
  67  |     // Get first conversation item
  68  |     const conversationItems = page.locator('[data-testid^="conversation-item-"]');
  69  |     const count = await conversationItems.count();
  70  |     
  71  |     if (count === 0) {
  72  |       test.skip();
  73  |       return;
  74  |     }
  75  |     
  76  |     const firstItem = conversationItems.first();
  77  |     const itemId = await firstItem.getAttribute('data-testid');
  78  |     const convId = itemId?.replace('conversation-item-', '');
  79  |     
  80  |     // Check that delete button exists (it's hidden until swipe)
  81  |     const deleteBtn = page.getByTestId(`delete-thread-btn-${convId}`);
  82  |     
  83  |     // The delete button should exist in the DOM
  84  |     await expect(deleteBtn).toBeAttached();
  85  |   });
  86  | 
  87  |   test('Delete confirmation dialog appears when clicking delete button in header', async ({ page }) => {
  88  |     // Navigate to Forms & Communications group
  89  |     await page.getByText('Forms & Communications').first().click();
  90  |     await page.waitForTimeout(1000);
  91  |     
  92  |     // Expand conversations section
  93  |     const toggle = page.getByTestId('conversations-section-toggle');
  94  |     await toggle.click();
  95  |     await page.waitForTimeout(1000);
  96  |     
  97  |     // Click on a conversation to select it
  98  |     const conversationItems = page.locator('[data-testid^="conversation-item-"]');
  99  |     const count = await conversationItems.count();
  100 |     
  101 |     if (count === 0) {
  102 |       test.skip();
  103 |       return;
  104 |     }
  105 |     
  106 |     await conversationItems.first().click();
  107 |     await page.waitForTimeout(1000);
  108 |     
  109 |     // Click the delete button in the conversation header
  110 |     const deleteConversationBtn = page.getByTestId('delete-conversation-btn');
  111 |     await expect(deleteConversationBtn).toBeVisible();
  112 |     await deleteConversationBtn.click();
  113 |     
  114 |     // Verify confirmation dialog appears
  115 |     const confirmDialog = page.getByTestId('delete-confirmation-dialog');
  116 |     await expect(confirmDialog).toBeVisible();
  117 |     
  118 |     // Verify dialog content
  119 |     await expect(page.locator('text=Delete Conversation?')).toBeVisible();
  120 |     await expect(page.locator('text=This action can be undone by admin')).toBeVisible();
  121 |     
  122 |     // Verify cancel and confirm buttons
  123 |     const cancelBtn = page.getByTestId('cancel-delete-btn');
  124 |     const confirmBtn = page.getByTestId('confirm-delete-btn');
  125 |     await expect(cancelBtn).toBeVisible();
  126 |     await expect(confirmBtn).toBeVisible();
  127 |     
```