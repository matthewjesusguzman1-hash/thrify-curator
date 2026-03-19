import { test, expect } from '@playwright/test';
import { loginAsAdmin, dismissToasts, removeEmergentBadge } from '../fixtures/helpers';

test.describe('Payment Records - Commission Split Feature', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await loginAsAdmin(page);
    await removeEmergentBadge(page);
    await page.waitForTimeout(1000);
  });

  test('Payment Records section has Employee and Consignment tabs', async ({ page }) => {
    // Expand Payroll & Payments
    await page.getByText('Payroll & Payments').first().click();
    await page.waitForTimeout(1000);

    // Expand Payment Records
    await page.getByTestId('check-records-section-toggle').click();
    await page.waitForTimeout(1000);

    // Verify both tabs are visible
    await expect(page.getByTestId('tab-employee-payments')).toBeVisible();
    await expect(page.getByTestId('tab-consignment-payments')).toBeVisible();
  });

  test('Employee tab shows employee payment form', async ({ page }) => {
    // Navigate to Payment Records
    await page.getByText('Payroll & Payments').first().click();
    await page.waitForTimeout(1000);
    await page.getByTestId('check-records-section-toggle').click();
    await page.waitForTimeout(1000);

    // Employee tab should be active by default
    await expect(page.getByTestId('tab-employee-payments')).toBeVisible();
    
    // Check form fields for employee payment
    await expect(page.getByText('Upload Employee Payment')).toBeVisible();
    await expect(page.getByText('Select Employee')).toBeVisible();
  });

  test('Consignment tab shows commission split field', async ({ page }) => {
    // Navigate to Payment Records
    await page.getByText('Payroll & Payments').first().click();
    await page.waitForTimeout(1000);
    await page.getByTestId('check-records-section-toggle').click();
    await page.waitForTimeout(1000);

    // Click Consignment tab
    await page.getByTestId('tab-consignment-payments').click();
    await page.waitForTimeout(1000);

    // Verify consignment payment form with commission split field
    await expect(page.getByText('Upload Consignment Payment')).toBeVisible();
    await expect(page.getByText('Select Consignment Client')).toBeVisible();
    await expect(page.getByText('Commission Split')).toBeVisible();
    
    // Check the commission split input field
    await expect(page.getByTestId('commission-split-input')).toBeVisible();
  });

  test('Commission split field shows 50/50 placeholder', async ({ page }) => {
    // Navigate to Payment Records > Consignment tab
    await page.getByText('Payroll & Payments').first().click();
    await page.waitForTimeout(1000);
    await page.getByTestId('check-records-section-toggle').click();
    await page.waitForTimeout(1000);
    await page.getByTestId('tab-consignment-payments').click();
    await page.waitForTimeout(1000);

    // Check the placeholder attribute
    const splitInput = page.getByTestId('commission-split-input');
    await expect(splitInput).toHaveAttribute('placeholder', '50/50');
  });

  test('Commission split field can be modified', async ({ page }) => {
    // Navigate to Payment Records > Consignment tab
    await page.getByText('Payroll & Payments').first().click();
    await page.waitForTimeout(1000);
    await page.getByTestId('check-records-section-toggle').click();
    await page.waitForTimeout(1000);
    await page.getByTestId('tab-consignment-payments').click();
    await page.waitForTimeout(1000);

    // Modify the split value
    const splitInput = page.getByTestId('commission-split-input');
    await splitInput.clear();
    await splitInput.fill('60/40');
    
    // Verify the new value
    await expect(splitInput).toHaveValue('60/40');
  });

  test('Consignment client dropdown shows available clients', async ({ page }) => {
    // Navigate to Payment Records > Consignment tab
    await page.getByText('Payroll & Payments').first().click();
    await page.waitForTimeout(1000);
    await page.getByTestId('check-records-section-toggle').click();
    await page.waitForTimeout(1000);
    await page.getByTestId('tab-consignment-payments').click();
    await page.waitForTimeout(1000);

    // Check that client selector shows available count
    await expect(page.getByText(/\d+ available/)).toBeVisible();
    
    // Click to open dropdown
    await page.getByTestId('select-consignment-client').click();
    await page.waitForTimeout(500);
  });

  test('Consignment payment form has all required fields', async ({ page }) => {
    // Navigate to Payment Records > Consignment tab
    await page.getByText('Payroll & Payments').first().click();
    await page.waitForTimeout(1000);
    await page.getByTestId('check-records-section-toggle').click();
    await page.waitForTimeout(1000);
    await page.getByTestId('tab-consignment-payments').click();
    await page.waitForTimeout(1000);

    // Verify all form fields are present
    await expect(page.getByText('Client Name')).toBeVisible();
    await expect(page.getByText('Payment Date')).toBeVisible();
    await expect(page.getByText('Amount ($)')).toBeVisible();
    await expect(page.getByText('Description')).toBeVisible();
    await expect(page.getByText('Select Image')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Submit' })).toBeVisible();
  });
});
