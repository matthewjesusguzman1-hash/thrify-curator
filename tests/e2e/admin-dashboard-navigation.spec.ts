import { test, expect } from '@playwright/test';
import { loginAsAdmin, dismissToasts, removeEmergentBadge } from '../fixtures/helpers';

test.describe('Admin Dashboard Navigation & New Features', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await loginAsAdmin(page);
    await removeEmergentBadge(page);
    await page.waitForTimeout(1000);
  });

  test('dashboard loads with four main groups', async ({ page }) => {
    // Verify all four dashboard groups are visible
    await expect(page.getByText('Team Management')).toBeVisible();
    await expect(page.getByText('Payroll & Payments')).toBeVisible();
    await expect(page.getByText('Forms & Communications')).toBeVisible();
    await expect(page.getByText('Operations & Reports')).toBeVisible();
  });

  test('Team Management group expands to show sections', async ({ page }) => {
    // Click Team Management to expand
    await page.getByText('Team Management').first().click();
    await page.waitForTimeout(1000);

    // Verify sections inside Team Management
    await expect(page.getByText('All Employees')).toBeVisible();
    await expect(page.getByText('Hours by Employee')).toBeVisible();
    
    // Verify Password Management is under Team Management (now collapsible)
    await expect(page.getByText('Password Management')).toBeVisible();
    await expect(page.getByText('Manage passwords for employees and consignment clients')).toBeVisible();
  });

  test('Password Management section is collapsible', async ({ page }) => {
    // Expand Team Management
    await page.getByText('Team Management').first().click();
    await page.waitForTimeout(1000);

    // Password Management should be visible but content hidden initially (collapsed)
    await expect(page.getByText('Password Management')).toBeVisible();
    await expect(page.getByTestId('password-management-section')).toBeVisible();
    
    // Click to expand Password Management
    await page.getByTestId('password-management-toggle').click();
    await page.waitForTimeout(1000);
    
    // Now tabs should be visible after expansion
    await expect(page.getByTestId('tab-employees')).toBeVisible();
    await expect(page.getByTestId('tab-consignors')).toBeVisible();
    
    // Click again to collapse
    await page.getByTestId('password-management-toggle').click();
    await page.waitForTimeout(500);
    
    // Tabs should be hidden after collapse
    await expect(page.getByTestId('tab-employees')).not.toBeVisible();
  });

  test('Password Management section has Employees and Consignors tabs when expanded', async ({ page }) => {
    // Expand Team Management
    await page.getByText('Team Management').first().click();
    await page.waitForTimeout(1000);

    // Expand Password Management section
    await page.getByTestId('password-management-toggle').click();
    await page.waitForTimeout(1000);
    
    // Password Management should show tabs
    const employeesTab = page.getByTestId('tab-employees');
    const consignorsTab = page.getByTestId('tab-consignors');
    
    await expect(employeesTab).toBeVisible();
    await expect(consignorsTab).toBeVisible();
  });

  test('Payroll & Payments group shows summary and payment records', async ({ page }) => {
    // Click Payroll & Payments to expand
    await page.getByText('Payroll & Payments').first().click();
    await page.waitForTimeout(1000);

    // Verify Payroll Summary
    await expect(page.getByText('Payroll Summary')).toBeVisible();
    await expect(page.getByTestId('period-payroll')).toBeVisible();
    await expect(page.getByTestId('month-total')).toBeVisible();
    await expect(page.getByTestId('year-total')).toBeVisible();

    // Verify Payment Records section exists
    await expect(page.getByText('Payment Records')).toBeVisible();
  });

  test('Forms & Communications group shows Messages and Form Submissions', async ({ page }) => {
    // Click Forms & Communications to expand
    await page.getByText('Forms & Communications').first().click();
    await page.waitForTimeout(1000);

    // Verify sections
    await expect(page.getByRole('heading', { name: 'Messages' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Form Submissions' })).toBeVisible();
  });

  test('Operations & Reports group is accessible', async ({ page }) => {
    // Click Operations & Reports to expand
    await page.getByText('Operations & Reports').first().click();
    await page.waitForTimeout(1000);

    // Should show mileage/reports content
    const section = page.locator('[data-testid="admin-dashboard"]');
    await expect(section).toBeVisible();
  });
});
