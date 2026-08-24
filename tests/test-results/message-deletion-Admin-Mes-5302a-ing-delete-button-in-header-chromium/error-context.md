# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: message-deletion.spec.ts >> Admin Message Deletion Features >> Delete confirmation dialog appears when clicking delete button in header
- Location: e2e/message-deletion.spec.ts:71:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('button', { name: 'Delete' })
Expected: visible
Error: strict mode violation: getByRole('button', { name: 'Delete' }) resolved to 10 elements:
    1) <button x-dynamic="false" x-line-number="83" x-component="button" title="Delete thread" x-id="ConversationsSection_83" x-file-name="ConversationsSection" data-testid="delete-icon-fe8b7f37-284e-4753-beca-2f6d2fa8bc53" class="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">…</button> aka getByTestId('delete-icon-fe8b7f37-284e-4753-beca-2f6d2fa8bc53')
    2) <button x-dynamic="false" x-line-number="83" x-component="button" title="Delete thread" x-id="ConversationsSection_83" x-file-name="ConversationsSection" data-testid="delete-icon-6f40d1f6-1785-48a5-af00-14b0646a24a6" class="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">…</button> aka getByTestId('delete-icon-6f40d1f6-1785-48a5-af00-14b0646a24a6')
    3) <button x-dynamic="false" x-line-number="83" x-component="button" title="Delete thread" x-id="ConversationsSection_83" x-file-name="ConversationsSection" data-testid="delete-icon-68c747d6-6411-46ac-ae91-fde51c3d01e6" class="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">…</button> aka getByTestId('delete-icon-68c747d6-6411-46ac-ae91-fde51c3d01e6')
    4) <button x-dynamic="false" x-line-number="641" x-component="button" title="Delete conversation" x-id="ConversationsSection_641" x-file-name="ConversationsSection" data-testid="delete-conversation-btn" class="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">…</button> aka getByTestId('delete-conversation-btn')
    5) <button x-dynamic="true" x-line-number="726" x-component="button" title="Delete message" x-source-type="external" x-array-item-param="msg" x-source-editable="false" x-id="ConversationsSection_726" x-file-name="ConversationsSection" x-array-var="selectedConversation" x-source-var="selectedConversation" data-testid="delete-message-de1a4200-3ac9-4494-bd70-695b67cd2ac5" class="absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1.5 bg-red-100 hover:bg-red-200 text-red-500 rounded…>…</button> aka getByTestId('delete-message-de1a4200-3ac9-4494-bd70-695b67cd2ac5')
    6) <button x-dynamic="true" x-line-number="726" x-component="button" title="Delete message" x-source-type="external" x-array-item-param="msg" x-source-editable="false" x-id="ConversationsSection_726" x-file-name="ConversationsSection" x-array-var="selectedConversation" x-source-var="selectedConversation" data-testid="delete-message-ebfd51ac-d058-4140-a58b-33ae2bab77ab" class="absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1.5 bg-red-100 hover:bg-red-200 text-red-500 rounded…>…</button> aka getByTestId('delete-message-ebfd51ac-d058-4140-a58b-33ae2bab77ab')
    7) <button x-dynamic="true" x-line-number="726" x-component="button" title="Delete message" x-source-type="external" x-array-item-param="msg" x-source-editable="false" x-id="ConversationsSection_726" x-file-name="ConversationsSection" x-array-var="selectedConversation" x-source-var="selectedConversation" data-testid="delete-message-618ca056-058c-4256-a4a8-8be72a5cfbdb" class="absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1.5 bg-red-100 hover:bg-red-200 text-red-500 rounded…>…</button> aka getByTestId('delete-message-618ca056-058c-4256-a4a8-8be72a5cfbdb')
    8) <button x-dynamic="true" x-line-number="726" x-component="button" title="Delete message" x-source-type="external" x-array-item-param="msg" x-source-editable="false" x-id="ConversationsSection_726" x-file-name="ConversationsSection" x-array-var="selectedConversation" x-source-var="selectedConversation" data-testid="delete-message-015522b2-8498-41b5-991e-b45d345cf631" class="absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1.5 bg-red-100 hover:bg-red-200 text-red-500 rounded…>…</button> aka getByTestId('delete-message-015522b2-8498-41b5-991e-b45d345cf631')
    9) <button x-dynamic="true" x-line-number="726" x-component="button" title="Delete message" x-source-type="external" x-array-item-param="msg" x-source-editable="false" x-id="ConversationsSection_726" x-file-name="ConversationsSection" x-array-var="selectedConversation" x-source-var="selectedConversation" data-testid="delete-message-d2377452-6031-4d4b-8365-aa7214c8037c" class="absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1.5 bg-red-100 hover:bg-red-200 text-red-500 rounded…>…</button> aka getByTestId('delete-message-d2377452-6031-4d4b-8365-aa7214c8037c')
    10) <button x-dynamic="false" x-line-number="833" x-component="Button" x-id="ConversationsSection_833" data-testid="confirm-delete-btn" x-file-name="ConversationsSection" class="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 text-destructive-foreground shadow-sm …>…</button> aka getByTestId('confirm-delete-btn')

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('button', { name: 'Delete' })

```

# Page snapshot

```yaml
- generic [ref=f3e3]:
  - generic [ref=f3e5]:
    - banner [ref=f3e6]:
      - generic [ref=f3e7]:
        - paragraph [ref=f3e12]: Matthew Guzman
        - button "Refresh dashboard" [ref=f3e13] [cursor=pointer]
        - button "Alerts" [ref=f3e15] [cursor=pointer]
      - generic [ref=f3e17]:
        - link [ref=f3e18] [cursor=pointer]:
          - /url: /
          - button "Home" [ref=f3e19]
        - link [ref=f3e21] [cursor=pointer]:
          - /url: /dashboard
          - button "My Dashboard" [ref=f3e22]
        - button "Messages" [ref=f3e24] [cursor=pointer]
        - button "Logout" [ref=f3e26] [cursor=pointer]
    - main [ref=f3e28]:
      - generic [ref=f3e30]:
        - generic [ref=f3e31]:
          - heading "Admin Dashboard" [level=1] [ref=f3e33]
          - generic [ref=f3e35]:
            - generic [ref=f3e36]:
              - button "Add Employee" [ref=f3e37] [cursor=pointer]
              - button "Edit Employee" [ref=f3e39] [cursor=pointer]
              - button "Remove" [ref=f3e41] [cursor=pointer]
            - button "Start Trip" [ref=f3e45] [cursor=pointer]
        - generic [ref=f3e47]:
          - button "Team Management 4 team members" [ref=f3e49] [cursor=pointer]:
            - generic [ref=f3e57]:
              - heading "Team Management" [level=2] [ref=f3e58]
              - generic [ref=f3e59]: 4 team members
          - button "Payroll & Payments Track earnings & payments" [ref=f3e65] [cursor=pointer]:
            - generic [ref=f3e70]:
              - heading "Payroll & Payments" [level=2] [ref=f3e71]
              - generic [ref=f3e72]: Track earnings & payments
          - generic [ref=f3e77]:
            - button "Forms & Communications 0 new submissions" [ref=f3e78] [cursor=pointer]:
              - generic [ref=f3e83]:
                - heading "Forms & Communications" [level=2] [ref=f3e84]
                - generic [ref=f3e85]: 0 new submissions
            - generic [ref=f3e93]:
              - generic [ref=f3e102] [cursor=pointer]:
                - heading "Form Submissions" [level=2] [ref=f3e103]
                - paragraph [ref=f3e104]:
                  - text: 2 total submissions
                  - generic [ref=f3e105]: ( 2 new)
              - generic [ref=f3e111]:
                - generic [ref=f3e113]:
                  - generic [ref=f3e122] [cursor=pointer]:
                    - heading "Conversations" [level=2] [ref=f3e123]
                    - paragraph [ref=f3e124]:
                      - generic [ref=f3e125]: 3 conversation s
                  - generic [ref=f3e132]:
                    - generic [ref=f3e134]:
                      - generic [ref=f3e135]:
                        - button "All" [ref=f3e136] [cursor=pointer]
                        - button "Employees" [ref=f3e137] [cursor=pointer]
                        - button "Consignors" [ref=f3e138] [cursor=pointer]
                      - textbox "Search by name or email..." [ref=f3e143]
                    - generic [ref=f3e144]:
                      - generic [ref=f3e146]:
                        - generic [ref=f3e148] [cursor=pointer]:
                          - generic [ref=f3e149]: T
                          - generic [ref=f3e150]:
                            - generic [ref=f3e151]:
                              - generic [ref=f3e152]: Test Employee
                              - generic [ref=f3e153]: EMP
                            - paragraph [ref=f3e154]: testemployee@thriftycurator.com
                          - generic [ref=f3e155]:
                            - generic [ref=f3e156]: 7:52 PM
                            - button "Delete thread" [ref=f3e157]
                        - generic [ref=f3e162] [cursor=pointer]:
                          - generic [ref=f3e163]: T
                          - generic [ref=f3e164]:
                            - generic [ref=f3e165]:
                              - generic [ref=f3e166]: Test
                              - generic [ref=f3e167]: CON
                            - paragraph [ref=f3e168]: test@test.com
                          - generic [ref=f3e169]:
                            - generic [ref=f3e170]: 7:27 PM
                            - button "Delete thread" [ref=f3e171]
                        - generic [ref=f3e176] [cursor=pointer]:
                          - generic [ref=f3e177]: M
                          - generic [ref=f3e178]:
                            - generic [ref=f3e179]:
                              - generic [ref=f3e180]: Matthew Guzman
                              - generic [ref=f3e181]: EMP
                            - paragraph [ref=f3e182]: matthewjesusguzman1@gmail.com
                          - generic [ref=f3e183]:
                            - generic [ref=f3e184]: 1:13 AM
                            - button "Delete thread" [ref=f3e185]
                      - generic [ref=f3e190]:
                        - generic [ref=f3e191]:
                          - generic [ref=f3e192]:
                            - generic [ref=f3e193]: T
                            - generic [ref=f3e194]:
                              - paragraph [ref=f3e195]: Test Employee
                              - paragraph [ref=f3e196]: testemployee@thriftycurator.com
                          - generic [ref=f3e197]:
                            - generic [ref=f3e198]: Employee
                            - button "Read receipts on - click to disable" [ref=f3e199] [cursor=pointer]
                            - button "Delete conversation" [active] [ref=f3e204] [cursor=pointer]
                        - generic [ref=f3e209]:
                          - generic [ref=f3e210]:
                            - generic [ref=f3e211]: Today
                            - generic [ref=f3e218]:
                              - paragraph [ref=f3e220]: Test Employee
                              - paragraph [ref=f3e223]: Test message for admin textarea verification
                              - generic [ref=f3e224]: 2:33 PM
                          - generic [ref=f3e228]:
                            - generic [ref=f3e229]:
                              - paragraph [ref=f3e231]: Matthew Guzman
                              - paragraph [ref=f3e235]: TEST_ADMIN_REPLY_8783edd4
                              - generic [ref=f3e236]:
                                - generic [ref=f3e237]: 5:24 PM
                                - generic "Delivered" [ref=f3e239]: Read
                            - button "Delete message" [ref=f3e246] [cursor=pointer]
                          - generic [ref=f3e253]:
                            - paragraph [ref=f3e255]: Test Employee
                            - paragraph [ref=f3e259]: TEST_EMP_MSG_b4559f62
                            - generic [ref=f3e260]: 5:24 PM
                          - generic [ref=f3e265]:
                            - paragraph [ref=f3e267]: Test Employee
                            - paragraph [ref=f3e271]: TEST_EMP_MSG_74e908ed
                            - generic [ref=f3e272]: 5:48 PM
                          - generic [ref=f3e277]:
                            - paragraph [ref=f3e279]: Test Employee
                            - paragraph [ref=f3e283]: TEST_EMP_MSG_a5497f9d
                            - generic [ref=f3e284]: 5:55 PM
                          - generic [ref=f3e288]:
                            - generic [ref=f3e289]:
                              - paragraph [ref=f3e291]: Matthew Guzman
                              - paragraph [ref=f3e295]: TEST_READ_RECEIPT_UI_1787594503926
                              - generic [ref=f3e296]:
                                - generic [ref=f3e297]: 6:01 PM
                                - generic "Seen 1h ago" [ref=f3e299]: Read
                            - button "Delete message" [ref=f3e306] [cursor=pointer]
                          - generic [ref=f3e312]:
                            - generic [ref=f3e313]:
                              - paragraph [ref=f3e315]: Matthew Guzman
                              - paragraph [ref=f3e319]: TEST_ADMIN_REPLY_e6377db6
                              - generic [ref=f3e320]:
                                - generic [ref=f3e321]: 6:05 PM
                                - generic "Seen 1h ago" [ref=f3e323]: Read
                            - button "Delete message" [ref=f3e330] [cursor=pointer]
                          - generic [ref=f3e337]:
                            - paragraph [ref=f3e339]: Test Employee
                            - paragraph [ref=f3e343]: TEST_EMP_MSG_ae865f29
                            - generic [ref=f3e344]: 6:05 PM
                          - generic [ref=f3e348]:
                            - generic [ref=f3e349]:
                              - paragraph [ref=f3e351]: Matthew Guzman
                              - paragraph [ref=f3e355]: TEST_READ_RECEIPT_UI_1787599637655
                              - generic [ref=f3e356]:
                                - generic [ref=f3e357]: 7:27 PM
                                - generic "Seen 26m ago" [ref=f3e359]: Read
                            - button "Delete message" [ref=f3e366] [cursor=pointer]
                          - generic [ref=f3e372]:
                            - generic [ref=f3e373]:
                              - paragraph [ref=f3e375]: Matthew Guzman
                              - paragraph [ref=f3e379]: TEST_DELETE_UI_1787601172775
                              - generic [ref=f3e380]:
                                - generic [ref=f3e381]: 7:52 PM
                                - generic "Delivered" [ref=f3e383]: Sent
                            - button "Delete message" [ref=f3e389] [cursor=pointer]
                        - generic [ref=f3e394]:
                          - textbox "Type a message..." [ref=f3e395]
                          - generic [ref=f3e396]:
                            - button "Send" [disabled]
                  - generic [ref=f3e398]:
                    - generic [ref=f3e403]:
                      - heading "Delete Conversation?" [level=3] [ref=f3e404]
                      - paragraph [ref=f3e405]: This action can be undone by admin
                    - paragraph [ref=f3e406]:
                      - text: Are you sure you want to delete the entire conversation with
                      - generic [ref=f3e407]: Test Employee
                      - text: "? The conversation will be hidden from both parties."
                    - generic [ref=f3e408]:
                      - button "Cancel" [ref=f3e409] [cursor=pointer]
                      - button "Delete" [ref=f3e410] [cursor=pointer]
                - generic [ref=f3e418] [cursor=pointer]:
                  - heading "Messages" [level=2] [ref=f3e419]
                  - paragraph [ref=f3e420]:
                    - generic [ref=f3e421]: 0 total message s
          - button "Hiring Applications & Interviews" [ref=f3e428] [cursor=pointer]:
            - generic [ref=f3e435]:
              - heading "Hiring" [level=2] [ref=f3e436]
              - generic [ref=f3e437]: Applications & Interviews
          - button "Reports & Operations Sales, reports & tax prep" [ref=f3e443] [cursor=pointer]:
            - generic [ref=f3e449]:
              - heading "Reports & Operations" [level=2] [ref=f3e450]
              - generic [ref=f3e451]: Sales, reports & tax prep
    - button "Back to top" [ref=f3e456] [cursor=pointer]
  - region "Notifications alt+T"
```

# Test source

```ts
  6   |  * 1. Delete icon visible on conversation list items
  7   |  * 2. Delete confirmation dialog appears when clicking delete
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
  22  |     const formsGroup = page.getByText('Forms & Communications').first();
  23  |     await expect(formsGroup).toBeVisible();
  24  |     await formsGroup.click();
  25  |     await page.waitForTimeout(1000);
  26  |     
  27  |     // Find and expand conversations section (use the one inside the dashboard card)
  28  |     const conversationsSection = page.locator('.dashboard-card').filter({ hasText: 'Conversations' }).first();
  29  |     await expect(conversationsSection).toBeVisible();
  30  |     
  31  |     // Click to expand using the toggle
  32  |     const toggle = page.getByTestId('conversations-section-toggle');
  33  |     await toggle.click();
  34  |     await page.waitForTimeout(1000);
  35  |     
  36  |     // Take screenshot
  37  |     await page.screenshot({ path: 'conversations-section-expanded.jpeg', quality: 20, fullPage: false });
  38  |   });
  39  | 
  40  |   test('Conversation item has delete icon visible', async ({ page }) => {
  41  |     // Navigate to Forms & Communications group
  42  |     await page.getByText('Forms & Communications').first().click();
  43  |     await page.waitForTimeout(1000);
  44  |     
  45  |     // Expand conversations section
  46  |     const toggle = page.getByTestId('conversations-section-toggle');
  47  |     await toggle.click();
  48  |     await page.waitForTimeout(1000);
  49  |     
  50  |     // Get first conversation item
  51  |     const conversationItems = page.locator('[data-testid^="conversation-item-"]');
  52  |     const count = await conversationItems.count();
  53  |     
  54  |     if (count === 0) {
  55  |       test.skip();
  56  |       return;
  57  |     }
  58  |     
  59  |     const firstItem = conversationItems.first();
  60  |     const itemId = await firstItem.getAttribute('data-testid');
  61  |     const convId = itemId?.replace('conversation-item-', '');
  62  |     
  63  |     // Check that delete icon exists and is visible
  64  |     const deleteIcon = page.getByTestId(`delete-icon-${convId}`);
  65  |     await expect(deleteIcon).toBeVisible();
  66  |     
  67  |     // Take screenshot showing delete icon
  68  |     await page.screenshot({ path: 'conversation-delete-icon.jpeg', quality: 20, fullPage: false });
  69  |   });
  70  | 
  71  |   test('Delete confirmation dialog appears when clicking delete button in header', async ({ page }) => {
  72  |     // Navigate to Forms & Communications group
  73  |     await page.getByText('Forms & Communications').first().click();
  74  |     await page.waitForTimeout(1000);
  75  |     
  76  |     // Expand conversations section
  77  |     const toggle = page.getByTestId('conversations-section-toggle');
  78  |     await toggle.click();
  79  |     await page.waitForTimeout(1000);
  80  |     
  81  |     // Click on a conversation to select it
  82  |     const conversationItems = page.locator('[data-testid^="conversation-item-"]');
  83  |     const count = await conversationItems.count();
  84  |     
  85  |     if (count === 0) {
  86  |       test.skip();
  87  |       return;
  88  |     }
  89  |     
  90  |     await conversationItems.first().click();
  91  |     await page.waitForTimeout(1000);
  92  |     
  93  |     // Click the delete button in the conversation header
  94  |     const deleteConversationBtn = page.getByTestId('delete-conversation-btn');
  95  |     await expect(deleteConversationBtn).toBeVisible();
  96  |     await deleteConversationBtn.click();
  97  |     
  98  |     // Verify confirmation dialog appears - look for the dialog content
  99  |     await expect(page.locator('text=Delete Conversation?')).toBeVisible();
  100 |     await expect(page.locator('text=This action can be undone by admin')).toBeVisible();
  101 |     
  102 |     // Verify cancel and confirm buttons exist
  103 |     const cancelBtn = page.getByRole('button', { name: 'Cancel' });
  104 |     const confirmBtn = page.getByRole('button', { name: 'Delete' });
  105 |     await expect(cancelBtn).toBeVisible();
> 106 |     await expect(confirmBtn).toBeVisible();
      |                              ^ Error: expect(locator).toBeVisible() failed
  107 |     
  108 |     // Take screenshot
  109 |     await page.screenshot({ path: 'delete-confirmation-dialog.jpeg', quality: 20, fullPage: false });
  110 |     
  111 |     // Cancel the deletion
  112 |     await cancelBtn.click();
  113 |     
  114 |     // Verify dialog is closed
  115 |     await expect(page.locator('text=Delete Conversation?')).not.toBeVisible();
  116 |   });
  117 | 
  118 |   test('Admin can send and delete their own message', async ({ page }) => {
  119 |     // Navigate to Forms & Communications group
  120 |     await page.getByText('Forms & Communications').first().click();
  121 |     await page.waitForTimeout(1000);
  122 |     
  123 |     // Expand conversations section
  124 |     const toggle = page.getByTestId('conversations-section-toggle');
  125 |     await toggle.click();
  126 |     await page.waitForTimeout(1000);
  127 |     
  128 |     // Click on a conversation to select it
  129 |     const conversationItems = page.locator('[data-testid^="conversation-item-"]');
  130 |     const count = await conversationItems.count();
  131 |     
  132 |     if (count === 0) {
  133 |       test.skip();
  134 |       return;
  135 |     }
  136 |     
  137 |     await conversationItems.first().click();
  138 |     await page.waitForTimeout(1000);
  139 |     
  140 |     // Send a test message first
  141 |     const messageInput = page.getByTestId('admin-message-input');
  142 |     await expect(messageInput).toBeVisible();
  143 |     
  144 |     const testMessage = `TEST_DELETE_UI_${Date.now()}`;
  145 |     await messageInput.fill(testMessage);
  146 |     
  147 |     const sendBtn = page.getByTestId('admin-send-message-btn');
  148 |     await sendBtn.click();
  149 |     
  150 |     // Wait for message to be sent and toasts to clear
  151 |     await page.waitForTimeout(3000);
  152 |     
  153 |     // Verify message appears in the messages container
  154 |     const messageLocator = page.locator('.rounded-2xl').filter({ hasText: testMessage }).first();
  155 |     await expect(messageLocator).toBeVisible();
  156 |     
  157 |     // Find the delete button for the message (appears on hover)
  158 |     const deleteMessageBtns = page.locator('[data-testid^="delete-message-"]');
  159 |     const deleteBtnCount = await deleteMessageBtns.count();
  160 |     
  161 |     if (deleteBtnCount > 0) {
  162 |       // Hover over the message to reveal delete button and click
  163 |       const lastDeleteBtn = deleteMessageBtns.last();
  164 |       await lastDeleteBtn.click({ force: true });
  165 |       
  166 |       // Wait for deletion
  167 |       await page.waitForTimeout(1000);
  168 |       
  169 |       // Verify message is removed from the messages area
  170 |       const newDeleteBtnCount = await deleteMessageBtns.count();
  171 |       expect(newDeleteBtnCount).toBeLessThan(deleteBtnCount);
  172 |     }
  173 |   });
  174 | 
  175 |   test('Admin message input has correct styling (6 rows, min-height)', async ({ page }) => {
  176 |     // Navigate to Forms & Communications group
  177 |     await page.getByText('Forms & Communications').first().click();
  178 |     await page.waitForTimeout(1000);
  179 |     
  180 |     // Expand conversations section
  181 |     const toggle = page.getByTestId('conversations-section-toggle');
  182 |     await toggle.click();
  183 |     await page.waitForTimeout(1000);
  184 |     
  185 |     // Click on a conversation to select it
  186 |     const conversationItems = page.locator('[data-testid^="conversation-item-"]');
  187 |     const count = await conversationItems.count();
  188 |     
  189 |     if (count === 0) {
  190 |       test.skip();
  191 |       return;
  192 |     }
  193 |     
  194 |     await conversationItems.first().click();
  195 |     await page.waitForTimeout(1000);
  196 |     
  197 |     // Check message input
  198 |     const messageInput = page.getByTestId('admin-message-input');
  199 |     await expect(messageInput).toBeVisible();
  200 |     
  201 |     // Verify rows attribute
  202 |     const rows = await messageInput.getAttribute('rows');
  203 |     expect(rows).toBe('6');
  204 |     
  205 |     // Verify min-height style
  206 |     const minHeight = await messageInput.evaluate((el) => {
```