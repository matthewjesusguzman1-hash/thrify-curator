import { test, expect } from '@playwright/test';

test.describe('Payment Records Auto-fill Feature', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to homepage
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');
    
    // Wait for homepage to load
    await page.waitForSelector('text=Employee Portal');
    
    // Click Employee Portal
    const employeePortalBtn = page.locator('text=Employee Portal').first();
    await employeePortalBtn.click();
    
    // Wait for login page
    await page.waitForSelector('input[placeholder="your@email.com"]');
    
    // Enter admin email
    const emailInput = page.locator('input[placeholder="your@email.com"]').first();
    await emailInput.fill('matthewjesusguzman1@gmail.com');
    
    // Click Find My Account
    const findAccountBtn = page.locator('button:has-text("Find My Account")').first();
    await findAccountBtn.click();
    
    // Wait for admin code input
    await page.waitForSelector('input[placeholder="4-digit code"]');
    
    // Enter admin code
    const codeInput = page.locator('input[placeholder="4-digit code"]').first();
    await codeInput.fill('4399');
    
    // Click Sign In
    const signInBtn = page.locator('button:has-text("Sign In")').first();
    await signInBtn.click();
    
    // Wait for dashboard to load
    await page.waitForSelector('text=Admin Dashboard');
    
    // Click on "Payroll & Payments" to expand it
    const payrollSection = page.locator('text=Payroll & Payments').first();
    await payrollSection.click();
    
    // Wait for Payment Records section to appear
    await page.waitForSelector('text=Payment Records');
    
    // Click to expand Payment Records section
    const sectionToggle = page.locator('[data-testid="check-records-section-toggle"]');
    await sectionToggle.click();
    
    // Wait for section to expand
    await page.waitForSelector('[data-testid="tab-employee-payments"]');
  });

  test('should show Payment Records section with Employee tab', async ({ page }) => {
    // Verify Employee tab is visible and active
    const employeeTab = page.locator('[data-testid="tab-employee-payments"]');
    await expect(employeeTab).toBeVisible();
    
    // Verify Select Employee button is visible
    const selectEmployeeBtn = page.locator('[data-testid="select-employee"]');
    await expect(selectEmployeeBtn).toBeVisible();
    
    // Take screenshot
    await page.screenshot({ path: 'payment-records-section.jpeg', quality: 20, fullPage: false });
  });

  test('should show employee picker with owed amount preview', async ({ page }) => {
    // Click Select Employee button
    const selectEmployeeBtn = page.locator('[data-testid="select-employee"]');
    await selectEmployeeBtn.click();
    
    // Wait for employee picker modal
    await page.waitForSelector('text=Select Employee');
    
    // Look for "Owed:" text which indicates the preview feature is working
    const owedPreview = page.locator('text=/Owed: \\$/').first();
    await expect(owedPreview).toBeVisible();
    
    // Take screenshot of employee picker with owed preview
    await page.screenshot({ path: 'employee-picker-owed-preview.jpeg', quality: 20, fullPage: false });
  });

  test('should auto-fill amount when selecting employee with owed amount', async ({ page }) => {
    // Click Select Employee button
    const selectEmployeeBtn = page.locator('[data-testid="select-employee"]');
    await selectEmployeeBtn.click();
    
    // Wait for employee picker modal
    await page.waitForSelector('text=Select Employee');
    
    // Find and click on Test Employee (who has $4.67 owed)
    const testEmployeeOption = page.locator('button:has-text("Test Employee")').first();
    await testEmployeeOption.click();
    
    // Wait for modal to close
    await page.waitForSelector('text=Select Employee', { state: 'hidden' }).catch(() => {});
    
    // Check if the amount field was auto-filled
    const amountInput = page.locator('input[placeholder="$0.00"]').first();
    const amountValue = await amountInput.inputValue();
    
    // Verify the employee name was set
    const employeeNameDisplay = page.locator('[data-testid="select-employee"]');
    const employeeNameText = await employeeNameDisplay.textContent();
    
    // Assert that Test Employee was selected
    expect(employeeNameText).toContain('Test Employee');
    
    // Assert that amount was auto-filled with $4.67
    expect(amountValue).toBe('$4.67');
    
    // Take screenshot showing auto-filled amount
    await page.screenshot({ path: 'amount-autofilled.jpeg', quality: 20, fullPage: false });
  });

  test('should show toast notification when amount is auto-filled', async ({ page }) => {
    // Click Select Employee button
    const selectEmployeeBtn = page.locator('[data-testid="select-employee"]');
    await selectEmployeeBtn.click();
    
    // Wait for employee picker modal
    await page.waitForSelector('text=Select Employee');
    
    // Find and click on Test Employee
    const testEmployeeOption = page.locator('button:has-text("Test Employee")').first();
    await testEmployeeOption.click();
    
    // Wait for toast notification
    await page.waitForSelector('text=/Amount auto-filled/');
    
    // Verify toast appeared
    const toast = page.locator('text=/Amount auto-filled/').first();
    await expect(toast).toBeVisible();
    
    // Take screenshot showing toast
    await page.screenshot({ path: 'autofill-toast.jpeg', quality: 20, fullPage: false });
  });
});
