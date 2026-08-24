# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: message-deletion.spec.ts >> Admin Message Deletion Features >> Filter buttons work correctly
- Location: e2e/message-deletion.spec.ts:251:7

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 2
Received: 4
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
                        - button "Employees" [active] [ref=f3e140] [cursor=pointer]
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
                                - generic [ref=f3e162]:
                                  - paragraph: Test Employee
                                  - generic [ref=f3e163]: "1"
                                - paragraph [ref=f3e165]: TEST_EMP_MSG_b4559f62
                              - generic [ref=f3e166]: 5:24 PM
                            - generic [ref=f3e167]:
                              - generic [ref=f3e168]: Employee
                              - generic [ref=f3e169]: testemployee@thriftycurator.com
                            - generic: ← swipe
                        - generic [ref=f3e170]:
                          - button "Delete" [ref=f3e172] [cursor=pointer]
                          - generic [ref=f3e177] [cursor=pointer]:
                            - generic [ref=f3e178]:
                              - generic [ref=f3e179]: M
                              - generic [ref=f3e180]:
                                - paragraph [ref=f3e182]: Matthew Guzman
                                - paragraph [ref=f3e183]: Test
                              - generic [ref=f3e184]: 1:13 AM
                            - generic [ref=f3e185]:
                              - generic [ref=f3e186]: Employee
                              - generic [ref=f3e187]: matthewjesusguzman1@gmail.com
                            - generic: ← swipe
                      - generic [ref=f3e191]:
                        - paragraph [ref=f3e194]: Select a conversation
                        - paragraph [ref=f3e195]: Choose from the list to view messages
                - generic [ref=f3e203] [cursor=pointer]:
                  - heading "Messages" [level=2] [ref=f3e204]
                  - paragraph [ref=f3e205]:
                    - generic [ref=f3e206]: 0 total message s
          - button "Hiring Applications & Interviews" [ref=f3e213] [cursor=pointer]:
            - generic [ref=f3e220]:
              - heading "Hiring" [level=2] [ref=f3e221]
              - generic [ref=f3e222]: Applications & Interviews
          - button "Reports & Operations Sales, reports & tax prep" [ref=f3e228] [cursor=pointer]:
            - generic [ref=f3e234]:
              - heading "Reports & Operations" [level=2] [ref=f3e235]
              - generic [ref=f3e236]: Sales, reports & tax prep
    - button "Back to top" [ref=f3e241] [cursor=pointer]
  - region "Notifications alt+T"
```

# Test source

```ts
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
  275 |     const conversationItems = page.locator('[data-testid^="conversation-item-"]');
  276 |     const count = await conversationItems.count();
  277 |     
  278 |     if (count > 0) {
  279 |       // All visible items should have Employee badge
  280 |       const employeeBadges = page.locator('[data-testid^="conversation-item-"] >> text=Employee');
  281 |       const badgeCount = await employeeBadges.count();
> 282 |       expect(badgeCount).toBe(count);
      |                          ^ Error: expect(received).toBe(expected) // Object.is equality
  283 |     }
  284 |     
  285 |     // Reset to All
  286 |     await allBtn.click();
  287 |   });
  288 | });
  289 | 
```