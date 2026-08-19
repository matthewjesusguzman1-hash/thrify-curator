import { test, expect } from '@playwright/test';

test.describe('Employee Terminations Section', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to homepage
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    // Wait for splash screen to finish
    await page.waitForTimeout(4000);
    
    // Click on Employee Portal
    const employeePortal = page.getByText('Employee Portal');
    await employeePortal.click();
    await page.waitForTimeout(1500);
    
    // Login as admin
    const emailInput = page.getByPlaceholder('your@email.com');
    await emailInput.fill('matthewjesusguzman1@gmail.com');
    
    await page.getByRole('button', { name: /find my account/i }).click();
    await page.waitForTimeout(1500);
    
    // Enter admin code
    const codeInput = page.getByPlaceholder('4-digit code');
    await codeInput.fill('4399');
    
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForTimeout(3000);
  });

  test('should display Employee Terminations section in Team Management', async ({ page }) => {
    // Navigate to Team Management section
    const teamManagementTab = page.getByText('Team Management');
    await expect(teamManagementTab).toBeVisible();
    await teamManagementTab.click();
    await page.waitForTimeout(1500);
    
    // Look for Employee Terminations heading
    const terminationsHeader = page.getByRole('heading', { name: 'Employee Terminations' });
    await expect(terminationsHeader).toBeVisible();
    
    // Check for Active Employees section
    const activeEmployeesSection = page.getByText(/Active Employees \(\d+\)/);
    await expect(activeEmployeesSection).toBeVisible();
    
    // Check for Termination History section
    const historySection = page.getByText(/Termination History/);
    await expect(historySection).toBeVisible();
    
    await page.screenshot({ path: 'terminations-section.jpeg', quality: 20 });
  });

  test('should show Terminate buttons for active employees', async ({ page }) => {
    // Navigate to Team Management section
    const teamManagementTab = page.getByText('Team Management');
    await teamManagementTab.click();
    await page.waitForTimeout(1500);
    
    // Check for Terminate buttons
    const terminateButtons = page.locator('[data-testid^="terminate-btn-"]');
    const count = await terminateButtons.count();
    
    // Should have at least one terminate button if there are active employees
    expect(count).toBeGreaterThan(0);
    
    await page.screenshot({ path: 'terminate-buttons.jpeg', quality: 20 });
  });
});
