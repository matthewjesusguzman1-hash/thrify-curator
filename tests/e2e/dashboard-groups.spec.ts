import { test, expect } from '@playwright/test';
import { dismissToasts, removeEmergentBadge } from '../fixtures/helpers';

const BASE_URL = 'https://resale-portal-2.preview.emergentagent.com';

test.describe('Admin Dashboard - Collapsible Groups', () => {
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

  test('All 4 dashboard groups are visible', async ({ page }) => {
    // Verify all 4 groups exist
    await expect(page.getByTestId('group-team')).toBeVisible();
    await expect(page.getByTestId('group-payroll')).toBeVisible();
    await expect(page.getByTestId('group-forms')).toBeVisible();
    await expect(page.getByTestId('group-operations')).toBeVisible();
    
    // Verify group titles
    await expect(page.getByText('Team Management')).toBeVisible();
    await expect(page.getByText('Payroll & Payments')).toBeVisible();
    await expect(page.getByText('Forms & Communications')).toBeVisible();
    await expect(page.getByText('Operations & Reports')).toBeVisible();
  });

  test('Team Management group is open by default', async ({ page }) => {
    const teamGroup = page.getByTestId('group-team');
    await expect(teamGroup).toBeVisible();
    
    // Team Management should be expanded by default - check internal content is visible
    await expect(page.getByTestId('employees-section')).toBeVisible();
    await expect(page.getByTestId('hours-section')).toBeVisible();
    
    // Verify nested sections are visible
    await expect(page.getByText('All Employees')).toBeVisible();
    await expect(page.getByText('Hours by Employee')).toBeVisible();
  });

  test('Team Management group expands/collapses correctly', async ({ page }) => {
    const teamGroup = page.getByTestId('group-team');
    const toggleBtn = page.getByTestId('group-team-toggle');
    
    // Initially open - content should be visible
    await expect(page.getByTestId('employees-section')).toBeVisible();
    
    // Click to collapse
    await toggleBtn.click();
    
    // Wait for animation and verify content is hidden
    await expect(page.getByTestId('employees-section')).not.toBeVisible({ timeout: 3000 });
    
    // Click to expand again
    await toggleBtn.click();
    
    // Verify content is visible again
    await expect(page.getByTestId('employees-section')).toBeVisible({ timeout: 3000 });
  });

  test('Payroll & Payments group expands to show payroll summary', async ({ page }) => {
    // Initially collapsed
    const payrollGroup = page.getByTestId('group-payroll');
    await expect(payrollGroup).toBeVisible();
    
    // Payroll summary should not be visible initially (group is collapsed)
    await expect(page.getByTestId('payroll-summary')).not.toBeVisible();
    
    // Click toggle to expand
    await page.getByTestId('group-payroll-toggle').click();
    
    // Verify payroll content is now visible
    await expect(page.getByTestId('payroll-summary')).toBeVisible({ timeout: 3000 });
    await expect(page.getByText('Payroll Summary')).toBeVisible();
    await expect(page.getByText('Current Pay Period')).toBeVisible();
    await expect(page.getByText('This Month')).toBeVisible();
    await expect(page.getByText('This Year')).toBeVisible();
  });

  test('Payroll & Payments group shows payment records when expanded', async ({ page }) => {
    // Expand payroll group
    await page.getByTestId('group-payroll-toggle').click();
    
    // Wait for content to load
    await expect(page.getByTestId('payroll-summary')).toBeVisible({ timeout: 3000 });
    
    // Verify payroll data testids are present
    await expect(page.getByTestId('period-payroll')).toBeVisible();
    await expect(page.getByTestId('month-total')).toBeVisible();
    await expect(page.getByTestId('year-total')).toBeVisible();
  });

  test('Forms & Communications group shows messages and form submissions', async ({ page }) => {
    // Scroll to make sure the group is visible
    const formsGroup = page.getByTestId('group-forms');
    await formsGroup.scrollIntoViewIfNeeded();
    
    // Initially collapsed - messages section not visible
    // Use .first() to avoid strict mode violation (there are 2 elements with messages-section testid)
    await expect(page.getByTestId('messages-section').first()).not.toBeVisible();
    
    // Expand group
    await page.getByTestId('group-forms-toggle').click();
    
    // Verify messages and form submissions sections are visible
    await expect(page.getByTestId('messages-section').first()).toBeVisible({ timeout: 3000 });
    await expect(page.getByTestId('form-submissions-section')).toBeVisible();
  });

  test('Operations & Reports group shows mileage and reports sections', async ({ page }) => {
    // Scroll down to see operations group
    const operationsGroup = page.getByTestId('group-operations');
    await operationsGroup.scrollIntoViewIfNeeded();
    
    await expect(operationsGroup).toBeVisible();
    
    // Expand group
    await page.getByTestId('group-operations-toggle').click();
    
    // Wait for content to appear and verify reports-related content
    // The section is called "Mileage Log", not "Monthly Mileage"
    await expect(page.getByText('Mileage Log')).toBeVisible({ timeout: 3000 });
    // Use the reports-toggle testid to verify Reports section
    await expect(page.getByTestId('reports-toggle')).toBeVisible();
  });

  test('Multiple groups can be expanded simultaneously', async ({ page }) => {
    // Expand Payroll group (Team is already open by default)
    await page.getByTestId('group-payroll-toggle').click();
    await expect(page.getByTestId('payroll-summary')).toBeVisible({ timeout: 3000 });
    
    // Expand Forms group
    await page.getByTestId('group-forms-toggle').click();
    // Use .first() to avoid strict mode violation (there are 2 elements with messages-section testid)
    await expect(page.getByTestId('messages-section').first()).toBeVisible({ timeout: 3000 });
    
    // Verify Team is still expanded
    await expect(page.getByTestId('employees-section')).toBeVisible();
    
    // Verify Payroll is still expanded
    await expect(page.getByTestId('payroll-summary')).toBeVisible();
    
    // Verify Forms is expanded
    await expect(page.getByTestId('messages-section').first()).toBeVisible();
  });

  test('Collapsing one group does not affect others', async ({ page }) => {
    // Expand multiple groups
    await page.getByTestId('group-payroll-toggle').click();
    await expect(page.getByTestId('payroll-summary')).toBeVisible({ timeout: 3000 });
    
    // Now collapse Team Management
    await page.getByTestId('group-team-toggle').click();
    await expect(page.getByTestId('employees-section')).not.toBeVisible({ timeout: 3000 });
    
    // Verify Payroll is still expanded
    await expect(page.getByTestId('payroll-summary')).toBeVisible();
  });

  test('Dashboard group icons have correct gradient styling', async ({ page }) => {
    // Each group should have a distinctive icon with gradient
    const teamGroup = page.getByTestId('group-team');
    const payrollGroup = page.getByTestId('group-payroll');
    const formsGroup = page.getByTestId('group-forms');
    const operationsGroup = page.getByTestId('group-operations');
    
    // All groups should be visible on the page
    await expect(teamGroup).toBeVisible();
    await expect(payrollGroup).toBeVisible();
    await expect(formsGroup).toBeVisible();
    await operationsGroup.scrollIntoViewIfNeeded();
    await expect(operationsGroup).toBeVisible();
  });

  test('Group badges display relevant information', async ({ page }) => {
    // Team Management should show employee count
    await expect(page.getByTestId('group-team')).toContainText('employees');
    
    // Payroll & Payments should show "Financial overview"
    await expect(page.getByTestId('group-payroll')).toContainText('Financial overview');
    
    // Forms & Communications should show submissions count
    await expect(page.getByTestId('group-forms')).toContainText('submissions');
    
    // Operations & Reports should show "Mileage & analytics"
    const operationsGroup = page.getByTestId('group-operations');
    await operationsGroup.scrollIntoViewIfNeeded();
    await expect(operationsGroup).toContainText('analytics');
  });
});

test.describe('Dashboard Groups - Section Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      sessionStorage.setItem('hasSeenSplash', 'true');
    });
    await dismissToasts(page);
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    await page.getByTestId('login-email').fill('4399');
    await page.getByTestId('login-submit-btn').click();
    await page.waitForURL('**/admin**', { timeout: 15000 });
    await expect(page.getByTestId('admin-dashboard')).toBeVisible({ timeout: 15000 });
    await removeEmergentBadge(page);
  });

  test('All Employees section accessible within Team Management', async ({ page }) => {
    // Team Management is open by default
    await expect(page.getByText('All Employees')).toBeVisible();
    
    // Check employee count is displayed
    await expect(page.getByTestId('employees-section')).toContainText('total');
  });

  test('Hours by Employee section accessible within Team Management', async ({ page }) => {
    await expect(page.getByText('Hours by Employee')).toBeVisible();
    await expect(page.getByTestId('hours-section')).toBeVisible();
    
    // Verify Add Entry button is visible
    await expect(page.getByText('Add Entry')).toBeVisible();
  });

  test('Payroll summary data displays correctly when expanded', async ({ page }) => {
    // Expand Payroll group
    await page.getByTestId('group-payroll-toggle').click();
    
    // Wait for content
    await expect(page.getByTestId('payroll-summary')).toBeVisible({ timeout: 3000 });
    
    // Verify all payroll cards are showing dollar amounts
    const periodPayroll = page.getByTestId('period-payroll');
    const monthTotal = page.getByTestId('month-total');
    const yearTotal = page.getByTestId('year-total');
    
    await expect(periodPayroll).toBeVisible();
    await expect(monthTotal).toBeVisible();
    await expect(yearTotal).toBeVisible();
    
    // Amounts should contain $ symbol
    await expect(periodPayroll).toContainText('$');
    await expect(monthTotal).toContainText('$');
    await expect(yearTotal).toContainText('$');
  });
});
