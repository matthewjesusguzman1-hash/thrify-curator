import { test, expect } from '@playwright/test';
import { loginAsAdmin, dismissToasts, removeEmergentBadge } from '../fixtures/helpers';

test.describe('Consignor Portal View Modal', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await loginAsAdmin(page);
    await removeEmergentBadge(page);
    await page.waitForTimeout(1000);
  });

  test('Agreements tab shows Portal button for each consignor', async ({ page }) => {
    // Navigate to Forms & Communications > Form Submissions > Agreements
    await page.getByText('Forms & Communications').first().click();
    await page.waitForTimeout(1000);
    await page.getByText('Form Submissions').first().click();
    await page.waitForTimeout(1000);
    await page.getByTestId('tab-consignment-agreements').click();
    await page.waitForTimeout(1500);

    // Check that table shows agreements
    await expect(page.getByText('NAME')).toBeVisible();
    await expect(page.getByText('ACTIONS')).toBeVisible();

    // Portal buttons should be visible in the table
    const portalButtons = page.getByText('Portal', { exact: true });
    const count = await portalButtons.count();
    expect(count).toBeGreaterThan(0);
  });

  test('Clicking Portal button opens ConsignorPortalViewModal', async ({ page }) => {
    // Navigate to Agreements tab
    await page.getByText('Forms & Communications').first().click();
    await page.waitForTimeout(1000);
    await page.getByText('Form Submissions').first().click();
    await page.waitForTimeout(1000);
    await page.getByTestId('tab-consignment-agreements').click();
    await page.waitForTimeout(1500);

    // Click first Portal button
    const portalButtons = page.getByText('Portal', { exact: true });
    await portalButtons.first().click();
    await page.waitForTimeout(2000);

    // Modal should be visible
    await expect(page.getByTestId('consignor-portal-modal')).toBeVisible();
  });

  test('Portal modal shows "Admin View" indicator', async ({ page }) => {
    // Navigate to Agreements tab
    await page.getByText('Forms & Communications').first().click();
    await page.waitForTimeout(1000);
    await page.getByText('Form Submissions').first().click();
    await page.waitForTimeout(1000);
    await page.getByTestId('tab-consignment-agreements').click();
    await page.waitForTimeout(1500);

    // Open portal modal
    await page.getByText('Portal', { exact: true }).first().click();
    await page.waitForTimeout(2000);

    // Check for admin view indicator
    await expect(page.getByText('Admin View - Consignor Portal Preview')).toBeVisible();
  });

  test('Portal modal shows My Account section with consignor info', async ({ page }) => {
    // Navigate to Agreements tab
    await page.getByText('Forms & Communications').first().click();
    await page.waitForTimeout(1000);
    await page.getByText('Form Submissions').first().click();
    await page.waitForTimeout(1000);
    await page.getByTestId('tab-consignment-agreements').click();
    await page.waitForTimeout(1500);

    // Open portal modal
    await page.getByText('Portal', { exact: true }).first().click();
    await page.waitForTimeout(2000);

    // Verify My Account section
    await expect(page.getByText('My Account')).toBeVisible();
    await expect(page.getByText('Personal Information')).toBeVisible();
    await expect(page.getByTestId('consignor-portal-modal').getByText('Full Name')).toBeVisible();
    await expect(page.getByTestId('consignor-portal-modal').getByText('Email')).toBeVisible();
  });

  test('Portal modal shows Consignment Details section', async ({ page }) => {
    // Navigate to Agreements tab
    await page.getByText('Forms & Communications').first().click();
    await page.waitForTimeout(1000);
    await page.getByText('Form Submissions').first().click();
    await page.waitForTimeout(1000);
    await page.getByTestId('tab-consignment-agreements').click();
    await page.waitForTimeout(1500);

    // Open portal modal
    await page.getByText('Portal', { exact: true }).first().click();
    await page.waitForTimeout(2000);

    // Verify Consignment Details section
    await expect(page.getByText('Consignment Details')).toBeVisible();
    await expect(page.getByText('Split Percentage')).toBeVisible();
    await expect(page.getByText('Payment Method')).toBeVisible();
    await expect(page.getByText('Agreement Date')).toBeVisible();
  });

  test('Portal modal shows Account Summary with statistics', async ({ page }) => {
    // Navigate to Agreements tab
    await page.getByText('Forms & Communications').first().click();
    await page.waitForTimeout(1000);
    await page.getByText('Form Submissions').first().click();
    await page.waitForTimeout(1000);
    await page.getByTestId('tab-consignment-agreements').click();
    await page.waitForTimeout(1500);

    // Open portal modal
    await page.getByText('Portal', { exact: true }).first().click();
    await page.waitForTimeout(2000);

    // Verify Account Summary
    await expect(page.getByText('Account Summary')).toBeVisible();
    await expect(page.getByTestId('consignor-portal-modal').getByText('Total Submissions')).toBeVisible();
    await expect(page.getByTestId('consignor-portal-modal').getByText('Total Paid')).toBeVisible();
    await expect(page.getByTestId('consignor-portal-modal').getByText('Payments Received')).toBeVisible();
    await expect(page.getByTestId('consignor-portal-modal').getByText('Pending Items')).toBeVisible();
  });

  test('Portal modal shows Password Protection status', async ({ page }) => {
    // Navigate to Agreements tab
    await page.getByText('Forms & Communications').first().click();
    await page.waitForTimeout(1000);
    await page.getByText('Form Submissions').first().click();
    await page.waitForTimeout(1000);
    await page.getByTestId('tab-consignment-agreements').click();
    await page.waitForTimeout(1500);

    // Open portal modal
    await page.getByText('Portal', { exact: true }).first().click();
    await page.waitForTimeout(2000);

    // Verify Password Protection section
    await expect(page.getByText('Password Protection')).toBeVisible();
  });

  test('Portal modal can be closed with X button', async ({ page }) => {
    // Navigate to Agreements tab
    await page.getByText('Forms & Communications').first().click();
    await page.waitForTimeout(1000);
    await page.getByText('Form Submissions').first().click();
    await page.waitForTimeout(1000);
    await page.getByTestId('tab-consignment-agreements').click();
    await page.waitForTimeout(1500);

    // Open portal modal
    await page.getByText('Portal', { exact: true }).first().click();
    await page.waitForTimeout(2000);
    await expect(page.getByTestId('consignor-portal-modal')).toBeVisible();

    // Close modal
    await page.getByTestId('close-consignor-portal').click();
    await page.waitForTimeout(500);

    // Modal should be hidden
    await expect(page.getByTestId('consignor-portal-modal')).not.toBeVisible();
  });

  test('Portal modal header shows welcome message with consignor name', async ({ page }) => {
    // Navigate to Agreements tab
    await page.getByText('Forms & Communications').first().click();
    await page.waitForTimeout(1000);
    await page.getByText('Form Submissions').first().click();
    await page.waitForTimeout(1000);
    await page.getByTestId('tab-consignment-agreements').click();
    await page.waitForTimeout(1500);

    // Open portal modal
    await page.getByText('Portal', { exact: true }).first().click();
    await page.waitForTimeout(2000);

    // Check welcome message
    await expect(page.getByText(/Welcome back,/)).toBeVisible();
  });
});
