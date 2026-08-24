# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: message-deletion.spec.ts >> Admin Message Deletion Features >> Admin can send and delete their own message
- Location: e2e/message-deletion.spec.ts:138:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=TEST_DELETE_UI_1787593130164')
Expected: visible
Error: strict mode violation: locator('text=TEST_DELETE_UI_1787593130164') resolved to 2 elements:
    1) <span x-excluded="true" data-ve-dynamic="true">TEST_DELETE_UI_1787593130164</span> aka getByTestId('conversation-item-6f40d1f6-1785-48a5-af00-14b0646a24a6').getByText('TEST_DELETE_UI_1787593130164')
    2) <span x-excluded="true" data-ve-dynamic="true">TEST_DELETE_UI_1787593130164</span> aka getByText('TEST_DELETE_UI_1787593130164').nth(1)

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('text=TEST_DELETE_UI_1787593130164')
    - found locator('[data-sonner-toast], .Toastify__toast, [role="status"].toast, .MuiSnackbar-root'), intercepting action to run the handler
    - locator handler has finished
    - interception handler has finished, continuing

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
            - button "Forms & Communications 0 new submissions" [ref=f3e79] [cursor=pointer]:
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
                - generic [ref=f3e114]:
                  - generic [ref=f3e116] [cursor=pointer]:
                    - generic [ref=f3e117]: "1"
                    - generic [ref=f3e125]:
                      - heading "Conversations" [level=2] [ref=f3e126]
                      - paragraph [ref=f3e127]:
                        - generic [ref=f3e128]: 1 unread message
                  - generic [ref=f3e135]:
                    - generic [ref=f3e137]:
                      - generic [ref=f3e138]:
                        - button "All" [ref=f3e139] [cursor=pointer]
                        - button "Employees" [ref=f3e140] [cursor=pointer]
                        - button "Consignors" [ref=f3e141] [cursor=pointer]
                      - textbox "Search by name or email..." [ref=f3e146]
                    - generic [ref=f3e147]:
                      - generic [ref=f3e149]:
                        - paragraph [ref=f3e150]: ← Swipe right to delete a thread
                        - generic [ref=f3e151]:
                          - button "Delete" [ref=f3e153] [cursor=pointer]
                          - generic [ref=f3e158] [cursor=pointer]:
                            - generic [ref=f3e159]:
                              - generic [ref=f3e160]: T
                              - generic [ref=f3e161]:
                                - paragraph [ref=f3e163]: Test
                                - paragraph [ref=f3e164]: TEST_DELETE_UI_1787593130164
                              - generic [ref=f3e165]: 5:38 PM
                            - generic [ref=f3e166]:
                              - generic [ref=f3e167]: Consignor
                              - generic [ref=f3e168]: test@test.com
                            - generic: ← swipe
                        - generic [ref=f3e169]:
                          - button "Delete" [ref=f3e171] [cursor=pointer]
                          - generic [ref=f3e176] [cursor=pointer]:
                            - generic [ref=f3e177]:
                              - generic [ref=f3e178]: T
                              - generic [ref=f3e179]:
                                - generic [ref=f3e180]:
                                  - paragraph: Test Employee
                                  - generic [ref=f3e181]: "1"
                                - paragraph [ref=f3e183]: TEST_EMP_MSG_b4559f62
                              - generic [ref=f3e184]: 5:24 PM
                            - generic [ref=f3e185]:
                              - generic [ref=f3e186]: Employee
                              - generic [ref=f3e187]: testemployee@thriftycurator.com
                            - generic: ← swipe
                        - generic [ref=f3e188]:
                          - button "Delete" [ref=f3e190] [cursor=pointer]
                          - generic [ref=f3e195] [cursor=pointer]:
                            - generic [ref=f3e196]:
                              - generic [ref=f3e197]: M
                              - generic [ref=f3e198]:
                                - paragraph [ref=f3e200]: Matthew Guzman
                                - paragraph [ref=f3e201]: Test
                              - generic [ref=f3e202]: 1:13 AM
                            - generic [ref=f3e203]:
                              - generic [ref=f3e204]: Employee
                              - generic [ref=f3e205]: matthewjesusguzman1@gmail.com
                            - generic: ← swipe
                      - generic [ref=f3e207]:
                        - generic [ref=f3e208]:
                          - generic [ref=f3e209]:
                            - generic [ref=f3e210]: T
                            - generic [ref=f3e211]:
                              - paragraph [ref=f3e212]: Test
                              - paragraph [ref=f3e213]: test@test.com
                          - generic [ref=f3e214]:
                            - generic [ref=f3e215]: Consignor
                            - button "Delete conversation" [ref=f3e216] [cursor=pointer]
                        - generic [ref=f3e221]:
                          - generic [ref=f3e222]:
                            - generic [ref=f3e223]: Thursday, March 26
                            - generic [ref=f3e230]:
                              - paragraph [ref=f3e232]: Test
                              - paragraph [ref=f3e236]: Test
                              - paragraph [ref=f3e237]: 3:07 AM
                          - generic [ref=f3e238]:
                            - generic [ref=f3e239]: Today
                            - generic [ref=f3e246]:
                              - paragraph [ref=f3e248]: Test Consignor
                              - paragraph [ref=f3e252]: TEST_CONSIGNOR_MSG_1e2afeb9
                              - paragraph [ref=f3e253]: 5:24 PM
                          - generic [ref=f3e256]:
                            - generic [ref=f3e257]:
                              - paragraph [ref=f3e259]: Matthew Guzman
                              - paragraph [ref=f3e263]: TEST_DELETE_UI_1787593130164
                              - paragraph [ref=f3e264]: 5:38 PM
                            - button "Delete message" [ref=f3e266] [cursor=pointer]
                        - generic [ref=f3e271]:
                          - textbox "Type a message..." [ref=f3e272]
                          - generic [ref=f3e273]:
                            - button "Send" [disabled]
                - generic [ref=f3e281] [cursor=pointer]:
                  - heading "Messages" [level=2] [ref=f3e282]
                  - paragraph [ref=f3e283]:
                    - generic [ref=f3e284]: 0 total message s
          - button "Hiring Applications & Interviews" [ref=f3e291] [cursor=pointer]:
            - generic [ref=f3e298]:
              - heading "Hiring" [level=2] [ref=f3e299]
              - generic [ref=f3e300]: Applications & Interviews
          - button "Reports & Operations Sales, reports & tax prep" [ref=f3e306] [cursor=pointer]:
            - generic [ref=f3e312]:
              - heading "Reports & Operations" [level=2] [ref=f3e313]
              - generic [ref=f3e314]: Sales, reports & tax prep
    - button "Back to top" [ref=f3e319] [cursor=pointer]
  - region "Notifications alt+T":
    - list:
      - listitem [ref=f3e322]:
        - generic [ref=f3e326]: Message sent!
```

# Test source

```ts
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
  128 |     // Take screenshot
  129 |     await page.screenshot({ path: 'delete-confirmation-dialog.jpeg', quality: 20, fullPage: false });
  130 |     
  131 |     // Cancel the deletion
  132 |     await cancelBtn.click();
  133 |     
  134 |     // Verify dialog is closed
  135 |     await expect(confirmDialog).not.toBeVisible();
  136 |   });
  137 | 
  138 |   test('Admin can send and delete their own message', async ({ page }) => {
  139 |     // Navigate to Forms & Communications group
  140 |     await page.getByText('Forms & Communications').first().click();
  141 |     await page.waitForTimeout(1000);
  142 |     
  143 |     // Expand conversations section
  144 |     const toggle = page.getByTestId('conversations-section-toggle');
  145 |     await toggle.click();
  146 |     await page.waitForTimeout(1000);
  147 |     
  148 |     // Click on a conversation to select it
  149 |     const conversationItems = page.locator('[data-testid^="conversation-item-"]');
  150 |     const count = await conversationItems.count();
  151 |     
  152 |     if (count === 0) {
  153 |       test.skip();
  154 |       return;
  155 |     }
  156 |     
  157 |     await conversationItems.first().click();
  158 |     await page.waitForTimeout(1000);
  159 |     
  160 |     // Send a test message first
  161 |     const messageInput = page.getByTestId('admin-message-input');
  162 |     await expect(messageInput).toBeVisible();
  163 |     
  164 |     const testMessage = `TEST_DELETE_UI_${Date.now()}`;
  165 |     await messageInput.fill(testMessage);
  166 |     
  167 |     const sendBtn = page.getByTestId('admin-send-message-btn');
  168 |     await sendBtn.click();
  169 |     
  170 |     // Wait for message to be sent
  171 |     await page.waitForTimeout(2000);
  172 |     
  173 |     // Verify message appears
> 174 |     await expect(page.locator(`text=${testMessage}`)).toBeVisible();
      |                                                       ^ Error: expect(locator).toBeVisible() failed
  175 |     
  176 |     // Find the delete button for the message (appears on hover)
  177 |     const deleteMessageBtns = page.locator('[data-testid^="delete-message-"]');
  178 |     const deleteBtnCount = await deleteMessageBtns.count();
  179 |     
  180 |     if (deleteBtnCount > 0) {
  181 |       // Hover over the message to reveal delete button and click
  182 |       const lastDeleteBtn = deleteMessageBtns.last();
  183 |       await lastDeleteBtn.click({ force: true });
  184 |       
  185 |       // Wait for deletion
  186 |       await page.waitForTimeout(1000);
  187 |       
  188 |       // Verify message is removed
  189 |       await expect(page.locator(`text=${testMessage}`)).not.toBeVisible();
  190 |     }
  191 |   });
  192 | 
  193 |   test('Admin message input has correct styling (6 rows, min-height)', async ({ page }) => {
  194 |     // Navigate to Forms & Communications group
  195 |     await page.getByText('Forms & Communications').first().click();
  196 |     await page.waitForTimeout(1000);
  197 |     
  198 |     // Expand conversations section
  199 |     const toggle = page.getByTestId('conversations-section-toggle');
  200 |     await toggle.click();
  201 |     await page.waitForTimeout(1000);
  202 |     
  203 |     // Click on a conversation to select it
  204 |     const conversationItems = page.locator('[data-testid^="conversation-item-"]');
  205 |     const count = await conversationItems.count();
  206 |     
  207 |     if (count === 0) {
  208 |       test.skip();
  209 |       return;
  210 |     }
  211 |     
  212 |     await conversationItems.first().click();
  213 |     await page.waitForTimeout(1000);
  214 |     
  215 |     // Check message input
  216 |     const messageInput = page.getByTestId('admin-message-input');
  217 |     await expect(messageInput).toBeVisible();
  218 |     
  219 |     // Verify rows attribute
  220 |     const rows = await messageInput.getAttribute('rows');
  221 |     expect(rows).toBe('6');
  222 |     
  223 |     // Verify min-height style
  224 |     const minHeight = await messageInput.evaluate((el) => {
  225 |       return window.getComputedStyle(el).minHeight;
  226 |     });
  227 |     expect(minHeight).toBe('150px');
  228 |   });
  229 | 
  230 |   test('Conversation list shows participant type badges', async ({ page }) => {
  231 |     // Navigate to Forms & Communications group
  232 |     await page.getByText('Forms & Communications').first().click();
  233 |     await page.waitForTimeout(1000);
  234 |     
  235 |     // Expand conversations section
  236 |     const toggle = page.getByTestId('conversations-section-toggle');
  237 |     await toggle.click();
  238 |     await page.waitForTimeout(1000);
  239 |     
  240 |     // Check for Employee or Consignor badges
  241 |     const employeeBadge = page.locator('[data-testid^="conversation-item-"] >> text=Employee').first();
  242 |     const consignorBadge = page.locator('[data-testid^="conversation-item-"] >> text=Consignor').first();
  243 |     
  244 |     // At least one type should be visible
  245 |     const hasEmployee = await employeeBadge.isVisible().catch(() => false);
  246 |     const hasConsignor = await consignorBadge.isVisible().catch(() => false);
  247 |     
  248 |     expect(hasEmployee || hasConsignor).toBe(true);
  249 |   });
  250 | 
  251 |   test('Filter buttons work correctly', async ({ page }) => {
  252 |     // Navigate to Forms & Communications group
  253 |     await page.getByText('Forms & Communications').first().click();
  254 |     await page.waitForTimeout(1000);
  255 |     
  256 |     // Expand conversations section
  257 |     const toggle = page.getByTestId('conversations-section-toggle');
  258 |     await toggle.click();
  259 |     await page.waitForTimeout(1000);
  260 |     
  261 |     // Check filter buttons exist
  262 |     const allBtn = page.locator('button:has-text("All")').first();
  263 |     const employeesBtn = page.locator('button:has-text("Employees")').first();
  264 |     const consignorsBtn = page.locator('button:has-text("Consignors")').first();
  265 |     
  266 |     await expect(allBtn).toBeVisible();
  267 |     await expect(employeesBtn).toBeVisible();
  268 |     await expect(consignorsBtn).toBeVisible();
  269 |     
  270 |     // Click Employees filter
  271 |     await employeesBtn.click();
  272 |     await page.waitForTimeout(500);
  273 |     
  274 |     // Verify only employee conversations are shown (if any)
```