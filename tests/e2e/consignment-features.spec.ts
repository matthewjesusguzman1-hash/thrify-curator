import { test, expect } from '@playwright/test';
import { skipSplashScreen, dismissToasts, removeEmergentBadge } from '../fixtures/helpers';

test.describe('Consignment Agreement New Features', () => {
  
  test.beforeEach(async ({ page }) => {
    // Skip splash screen and setup
    await page.goto('/');
    await skipSplashScreen(page);
    await dismissToasts(page);
  });

  test.describe('Choice Page', () => {
    test('should display choice page with Sign New and Update options', async ({ page }) => {
      await page.goto('/consignment-agreement');
      await expect(page.getByTestId('consignment-choice-page')).toBeVisible({ timeout: 10000 });
      
      // Check both options are visible
      await expect(page.getByTestId('sign-new-agreement-btn')).toBeVisible();
      await expect(page.getByTestId('add-more-items-btn')).toBeVisible();
      
      // Check option text
      await expect(page.getByText('Sign New Agreement')).toBeVisible();
      await expect(page.getByText('Update Info / Add Items')).toBeVisible();
    });

    test('should navigate to new agreement form when Sign New is clicked', async ({ page }) => {
      await page.goto('/consignment-agreement');
      await expect(page.getByTestId('consignment-choice-page')).toBeVisible({ timeout: 10000 });
      
      await page.getByTestId('sign-new-agreement-btn').click();
      
      // Should show the new agreement form
      await expect(page.getByTestId('consignment-agreement-page')).toBeVisible({ timeout: 5000 });
      await expect(page.getByTestId('consignment-agreement-form')).toBeVisible();
    });

    test('should navigate to update flow when Update Info is clicked', async ({ page }) => {
      await page.goto('/consignment-agreement');
      await expect(page.getByTestId('consignment-choice-page')).toBeVisible({ timeout: 10000 });
      
      await page.getByTestId('add-more-items-btn').click();
      
      // Should show the add items page with email input
      await expect(page.getByTestId('add-items-page')).toBeVisible({ timeout: 5000 });
      await expect(page.getByTestId('add-items-email')).toBeVisible();
    });
  });

  test.describe('New Agreement Form - Custom Fields', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/consignment-agreement');
      await expect(page.getByTestId('consignment-choice-page')).toBeVisible({ timeout: 10000 });
      await page.getByTestId('sign-new-agreement-btn').click();
      await expect(page.getByTestId('consignment-agreement-form')).toBeVisible();
    });

    test('should have custom profit split field', async ({ page }) => {
      // Check custom split input exists
      await expect(page.getByTestId('input-custom-split')).toBeVisible();
      
      // Fill custom split
      await page.getByTestId('input-custom-split').fill('60/40');
      
      // Check placeholder text
      await expect(page.getByText('Default: 50/50')).toBeVisible();
    });

    test('should have additional info field', async ({ page }) => {
      // Check additional info textarea exists
      await expect(page.getByTestId('input-additional-info')).toBeVisible();
      
      // Fill additional info
      await page.getByTestId('input-additional-info').fill('These are vintage designer items in excellent condition');
    });

    test('should have payment method buttons', async ({ page }) => {
      // Check all payment methods
      await expect(page.getByTestId('payment-method-check')).toBeVisible();
      await expect(page.getByTestId('payment-method-venmo')).toBeVisible();
      await expect(page.getByTestId('payment-method-paypal')).toBeVisible();
      await expect(page.getByTestId('payment-method-zelle')).toBeVisible();
      await expect(page.getByTestId('payment-method-cashapp')).toBeVisible();
      await expect(page.getByTestId('payment-method-applepay')).toBeVisible();
    });

    test('should not require payment details for Check payment', async ({ page }) => {
      // Select Check payment
      await page.getByTestId('payment-method-check').click();
      
      // Payment details input should NOT appear for Check
      await expect(page.getByTestId('input-payment-details')).not.toBeVisible();
    });

    test('should require payment details for Venmo', async ({ page }) => {
      // Select Venmo payment
      await page.getByTestId('payment-method-venmo').click();
      
      // Payment details input should appear
      await expect(page.getByTestId('input-payment-details')).toBeVisible();
    });
  });

  test.describe('Update Info / Add Items Flow', () => {
    test('should find existing agreement by email', async ({ page }) => {
      await page.goto('/consignment-agreement');
      await expect(page.getByTestId('consignment-choice-page')).toBeVisible({ timeout: 10000 });
      await page.getByTestId('add-more-items-btn').click();
      
      await expect(page.getByTestId('add-items-page')).toBeVisible();
      
      // Enter existing email
      await page.getByTestId('add-items-email').fill('testuser@example.com');
      await page.getByTestId('find-agreement-btn').click();
      
      // Should show agreement found message
      await expect(page.getByText('Agreement found for:')).toBeVisible({ timeout: 10000 });
    });

    test('should have collapsible Add Items section', async ({ page }) => {
      await page.goto('/consignment-agreement');
      await expect(page.getByTestId('consignment-choice-page')).toBeVisible({ timeout: 10000 });
      await page.getByTestId('add-more-items-btn').click();
      
      await page.getByTestId('add-items-email').fill('testuser@example.com');
      await page.getByTestId('find-agreement-btn').click();
      await expect(page.getByText('Agreement found for:')).toBeVisible({ timeout: 10000 });
      
      // Toggle Add Items section - should be collapsed by default
      const addItemsToggle = page.getByTestId('toggle-add-items-section');
      await expect(addItemsToggle).toBeVisible();
      
      // Expand Add Items section
      await addItemsToggle.click();
      
      // Check items to add input is visible
      await expect(page.getByTestId('items-to-add')).toBeVisible();
      await expect(page.getByTestId('items-description')).toBeVisible();
    });

    test('should have signature and date fields', async ({ page }) => {
      await page.goto('/consignment-agreement');
      await expect(page.getByTestId('consignment-choice-page')).toBeVisible({ timeout: 10000 });
      await page.getByTestId('add-more-items-btn').click();
      
      await page.getByTestId('add-items-email').fill('testuser@example.com');
      await page.getByTestId('find-agreement-btn').click();
      await expect(page.getByText('Agreement found for:')).toBeVisible({ timeout: 10000 });
      
      // Check signature fields
      await expect(page.getByTestId('update-signature')).toBeVisible();
      await expect(page.getByTestId('update-signature-date')).toBeVisible();
      
      // Signature should have placeholder
      const signatureInput = page.getByTestId('update-signature');
      await expect(signatureInput).toHaveAttribute('placeholder', 'Type your full name as signature');
    });

    test('should have custom profit split field in update form', async ({ page }) => {
      await page.goto('/consignment-agreement');
      await expect(page.getByTestId('consignment-choice-page')).toBeVisible({ timeout: 10000 });
      await page.getByTestId('add-more-items-btn').click();
      
      await page.getByTestId('add-items-email').fill('testuser@example.com');
      await page.getByTestId('find-agreement-btn').click();
      await expect(page.getByText('Agreement found for:')).toBeVisible({ timeout: 10000 });
      
      // Check custom split field
      await expect(page.getByTestId('update-custom-split')).toBeVisible();
    });

    test('should have additional info field in update form', async ({ page }) => {
      await page.goto('/consignment-agreement');
      await expect(page.getByTestId('consignment-choice-page')).toBeVisible({ timeout: 10000 });
      await page.getByTestId('add-more-items-btn').click();
      
      await page.getByTestId('add-items-email').fill('testuser@example.com');
      await page.getByTestId('find-agreement-btn').click();
      await expect(page.getByText('Agreement found for:')).toBeVisible({ timeout: 10000 });
      
      // Check additional info field
      await expect(page.getByTestId('update-additional-info')).toBeVisible();
    });

    test('should have collapsible contact update section', async ({ page }) => {
      await page.goto('/consignment-agreement');
      await expect(page.getByTestId('consignment-choice-page')).toBeVisible({ timeout: 10000 });
      await page.getByTestId('add-more-items-btn').click();
      
      await page.getByTestId('add-items-email').fill('testuser@example.com');
      await page.getByTestId('find-agreement-btn').click();
      await expect(page.getByText('Agreement found for:')).toBeVisible({ timeout: 10000 });
      
      // Toggle contact section
      const contactToggle = page.getByTestId('toggle-contact-section');
      await expect(contactToggle).toBeVisible();
      
      // Expand and check fields
      await contactToggle.click();
      await expect(page.getByTestId('update-email')).toBeVisible();
      await expect(page.getByTestId('update-phone')).toBeVisible();
      await expect(page.getByTestId('update-address')).toBeVisible();
    });

    test('should have collapsible payment update section', async ({ page }) => {
      await page.goto('/consignment-agreement');
      await expect(page.getByTestId('consignment-choice-page')).toBeVisible({ timeout: 10000 });
      await page.getByTestId('add-more-items-btn').click();
      
      await page.getByTestId('add-items-email').fill('testuser@example.com');
      await page.getByTestId('find-agreement-btn').click();
      await expect(page.getByText('Agreement found for:')).toBeVisible({ timeout: 10000 });
      
      // Toggle payment section
      const paymentToggle = page.getByTestId('toggle-payment-section');
      await expect(paymentToggle).toBeVisible();
      
      // Expand and check payment method buttons
      await paymentToggle.click();
      await expect(page.getByTestId('update-payment-venmo')).toBeVisible();
      await expect(page.getByTestId('update-payment-check')).toBeVisible();
    });

    test('should show error for non-existent email', async ({ page }) => {
      await page.goto('/consignment-agreement');
      await expect(page.getByTestId('consignment-choice-page')).toBeVisible({ timeout: 10000 });
      await page.getByTestId('add-more-items-btn').click();
      
      await page.getByTestId('add-items-email').fill('nonexistent@example.com');
      await page.getByTestId('find-agreement-btn').click();
      
      // Should show error toast/message
      await expect(page.getByText('No existing agreement found')).toBeVisible({ timeout: 10000 });
    });
  });
});
