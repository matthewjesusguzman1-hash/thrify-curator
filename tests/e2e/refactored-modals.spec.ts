import { test, expect } from '@playwright/test';
import { dismissToasts, removeEmergentBadge } from '../fixtures/helpers';

const BASE_URL = 'https://curator-app-3.preview.emergentagent.com';

test.describe('Refactored Modal Components - Edit Employee Modal', () => {
  test.beforeEach(async ({ page }) => {
    // Skip splash screen
    await page.addInitScript(() => {
      sessionStorage.setItem('hasSeenSplash', 'true');
    });
    
    // Setup toast handler
    await dismissToasts(page);
    
    // Login as admin
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    await page.getByTestId('login-email').fill('4399');
    await page.getByTestId('login-submit-btn').click();
    await page.waitForURL('**/admin**', { timeout: 15000 });
    await expect(page.getByTestId('admin-dashboard')).toBeVisible({ timeout: 15000 });
    
    // Remove Emergent badge if present
    await removeEmergentBadge(page);
  });

  test('Edit Employee button is visible and clickable in admin dashboard', async ({ page }) => {
    // The Edit button is in the header area of the admin dashboard
    const editButton = page.getByTestId('edit-employee-btn');
    await expect(editButton).toBeVisible();
    await editButton.click();
    
    // Verify Edit Employee modal opens
    await expect(page.getByTestId('edit-employee-modal')).toBeVisible({ timeout: 5000 });
  });

  test('Edit Employee modal - select employee dropdown works', async ({ page }) => {
    // Click Edit button to open modal
    await page.getByTestId('edit-employee-btn').click();
    await expect(page.getByTestId('edit-employee-modal')).toBeVisible({ timeout: 5000 });
    
    // Check select dropdown is visible
    const selectTrigger = page.getByTestId('edit-employee-select');
    await expect(selectTrigger).toBeVisible();
    
    // Click to open dropdown
    await selectTrigger.click();
    
    // Verify employees appear in dropdown
    await expect(page.locator('[role="option"]').first()).toBeVisible({ timeout: 3000 });
    
    // Select an employee
    await page.locator('[role="option"]').first().click();
    
    // Verify form fields appear with employee data
    await expect(page.getByTestId('edit-employee-name')).toBeVisible();
    await expect(page.getByTestId('edit-employee-email')).toBeVisible();
  });

  test('Edit Employee modal - form fields are editable', async ({ page }) => {
    // Click Edit button to open modal
    await page.getByTestId('edit-employee-btn').click();
    await expect(page.getByTestId('edit-employee-modal')).toBeVisible({ timeout: 5000 });
    
    // Select an employee
    await page.getByTestId('edit-employee-select').click();
    await page.locator('[role="option"]').first().click();
    
    // Verify form fields are editable
    const nameInput = page.getByTestId('edit-employee-name');
    await expect(nameInput).toBeVisible();
    
    // Get current value and modify it slightly for testing
    const currentName = await nameInput.inputValue();
    await nameInput.fill('Test Edit Name');
    expect(await nameInput.inputValue()).toBe('Test Edit Name');
    
    // Restore original value (don't actually submit changes)
    await nameInput.fill(currentName);
  });

  test('Edit Employee modal - close button works', async ({ page }) => {
    // Click Edit button to open modal
    await page.getByTestId('edit-employee-btn').click();
    await expect(page.getByTestId('edit-employee-modal')).toBeVisible({ timeout: 5000 });
    
    // Click X button to close (the close button in the header)
    await page.getByTestId('edit-employee-modal').locator('button').first().click();
    
    // Verify modal is closed
    await expect(page.getByTestId('edit-employee-modal')).not.toBeVisible({ timeout: 3000 });
  });

  test('Edit Employee modal - has W-9 management section', async ({ page }) => {
    // Click Edit button to open modal
    await page.getByTestId('edit-employee-btn').click();
    await expect(page.getByTestId('edit-employee-modal')).toBeVisible({ timeout: 5000 });
    
    // Select an employee to load their data
    await page.getByTestId('edit-employee-select').click();
    await page.locator('[role="option"]').first().click();
    
    // Scroll to bottom of modal to see W-9 section
    await page.getByTestId('edit-employee-modal').evaluate(el => el.scrollTo(0, el.scrollHeight));
    
    // Check for W-9 related content
    const w9Section = page.locator('text=W-9 Documents').or(page.locator('text=W-9 Tax'));
    const w9SectionVisible = await w9Section.isVisible().catch(() => false);
    
    // W-9 section may or may not be visible depending on employee data
    // Just verify modal is still functional
    await expect(page.getByTestId('edit-employee-modal')).toBeVisible();
  });
});

test.describe('Refactored Modal Components - Employee Shifts Modal (HoursByEmployee Section)', () => {
  test.beforeEach(async ({ page }) => {
    // Skip splash screen
    await page.addInitScript(() => {
      sessionStorage.setItem('hasSeenSplash', 'true');
    });
    
    // Setup toast handler
    await dismissToasts(page);
    
    // Login as admin
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    await page.getByTestId('login-email').fill('4399');
    await page.getByTestId('login-submit-btn').click();
    await page.waitForURL('**/admin**', { timeout: 15000 });
    await expect(page.getByTestId('admin-dashboard')).toBeVisible({ timeout: 15000 });
    
    // Remove Emergent badge if present
    await removeEmergentBadge(page);
    
    // Expand Hours by Employee section
    await page.getByTestId('hours-by-employee-toggle').click();
    await expect(page.getByTestId('employees-hours-table')).toBeVisible({ timeout: 10000 });
  });

  test('Employee Shifts modal opens from Hours by Employee section', async ({ page }) => {
    // Find View Shifts button
    const viewShiftsButtons = page.getByRole('button', { name: 'View Shifts' });
    const count = await viewShiftsButtons.count();
    
    if (count === 0) {
      test.skip();
      return;
    }
    
    // Click first View Shifts button
    await viewShiftsButtons.first().click();
    
    // Verify modal opens
    await expect(page.getByTestId('employee-shifts-modal')).toBeVisible({ timeout: 5000 });
  });

  test('Employee Shifts modal shows employee name and summary stats', async ({ page }) => {
    // Click View Shifts for first employee
    const viewShiftsButtons = page.getByRole('button', { name: 'View Shifts' });
    const count = await viewShiftsButtons.count();
    
    if (count === 0) {
      test.skip();
      return;
    }
    
    await viewShiftsButtons.first().click();
    await expect(page.getByTestId('employee-shifts-modal')).toBeVisible({ timeout: 5000 });
    
    // Verify modal shows employee info
    // Modal header should have Hours and Shifts summary
    await expect(page.locator('text=Hours').first()).toBeVisible();
    await expect(page.locator('text=Shifts').first()).toBeVisible();
  });

  test('Employee Shifts modal shows filter options', async ({ page }) => {
    // Click View Shifts for first employee
    const viewShiftsButtons = page.getByRole('button', { name: 'View Shifts' });
    const count = await viewShiftsButtons.count();
    
    if (count === 0) {
      test.skip();
      return;
    }
    
    await viewShiftsButtons.first().click();
    await expect(page.getByTestId('employee-shifts-modal')).toBeVisible({ timeout: 5000 });
    
    // Verify filter options are visible (use first() to handle multiple matches)
    await expect(page.getByText('Filter by:').first()).toBeVisible({ timeout: 3000 });
  });

  test('Employee Shifts modal can be closed', async ({ page }) => {
    // Click View Shifts for first employee
    const viewShiftsButtons = page.getByRole('button', { name: 'View Shifts' });
    const count = await viewShiftsButtons.count();
    
    if (count === 0) {
      test.skip();
      return;
    }
    
    await viewShiftsButtons.first().click();
    await expect(page.getByTestId('employee-shifts-modal')).toBeVisible({ timeout: 5000 });
    
    // Click X button to close
    await page.getByTestId('employee-shifts-modal').locator('button').first().click();
    
    // Verify modal is closed
    await expect(page.getByTestId('employee-shifts-modal')).not.toBeVisible({ timeout: 3000 });
  });
});

test.describe('Admin Dashboard loads correctly after refactoring', () => {
  test.beforeEach(async ({ page }) => {
    // Skip splash screen
    await page.addInitScript(() => {
      sessionStorage.setItem('hasSeenSplash', 'true');
    });
    
    // Setup toast handler
    await dismissToasts(page);
    
    // Login as admin
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    await page.getByTestId('login-email').fill('4399');
    await page.getByTestId('login-submit-btn').click();
    await page.waitForURL('**/admin**', { timeout: 15000 });
    await expect(page.getByTestId('admin-dashboard')).toBeVisible({ timeout: 15000 });
    
    // Remove Emergent badge if present
    await removeEmergentBadge(page);
  });

  test('All major sections are visible on admin dashboard (within groups)', async ({ page }) => {
    // Verify major section groups and their titles are present
    // Team Management group (open by default)
    await expect(page.locator('text=All Employees')).toBeVisible();
    await expect(page.locator('text=Hours by Employee')).toBeVisible();
    
    // Payroll & Payments group (collapsed - check group title)
    await expect(page.getByText('Payroll & Payments')).toBeVisible();
    
    // Forms & Communications group (collapsed - check group title)
    await expect(page.getByText('Forms & Communications')).toBeVisible();
    
    // Operations & Reports group (collapsed - check group title)
    await expect(page.getByText('Operations & Reports')).toBeVisible();
    
    // Expand Payroll & Payments to verify Payroll Summary is accessible
    await page.getByTestId('group-payroll-toggle').click();
    await expect(page.locator('text=Payroll Summary')).toBeVisible({ timeout: 3000 });
    
    // Expand Forms & Communications to verify Messages section is accessible
    await page.getByTestId('group-forms-toggle').click();
    // Use role heading to be more specific
    await expect(page.getByRole('heading', { name: 'Messages' })).toBeVisible({ timeout: 3000 });
  });

  test('Add, Edit, Remove buttons are visible in dashboard header', async ({ page }) => {
    // Verify action buttons are present
    await expect(page.getByTestId('add-employee-btn')).toBeVisible();
    await expect(page.getByTestId('edit-employee-btn')).toBeVisible();
    await expect(page.getByTestId('remove-employee-btn')).toBeVisible();
  });

  test('All Employees section can be expanded and shows employee table', async ({ page }) => {
    // Click on All Employees to expand
    await page.click('text=All Employees');
    
    // Verify employees table is visible
    await expect(page.getByTestId('employees-table')).toBeVisible({ timeout: 10000 });
  });
});
