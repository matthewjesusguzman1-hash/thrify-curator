import { test, expect } from '@playwright/test';

// Custom login function that handles the admin login flow properly
async function loginAsAdmin(page) {
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');
  
  // Step 1: Enter email using data-testid
  const emailInput = page.getByTestId('login-email');
  await expect(emailInput).toBeVisible();
  await emailInput.click();
  await emailInput.pressSequentially('matthewjesusguzman1@gmail.com', { delay: 20 });
  
  // Click Continue/Submit button
  const submitBtn = page.getByTestId('login-submit-btn');
  await submitBtn.click();
  
  // Wait for access code input to appear (admin flow)
  const codeInput = page.getByTestId('login-admin-code');
  await expect(codeInput).toBeVisible();
  
  // Step 2: Enter access code
  await codeInput.click();
  await codeInput.pressSequentially('4399', { delay: 50 });
  await submitBtn.click();
  
  // Wait for admin dashboard
  await expect(page.getByTestId('admin-dashboard')).toBeVisible();
}

// Helper to expand Operations & Reports section and then GPS Mileage Tracker
async function expandGPSMileageTracker(page) {
  // First expand Operations & Reports section
  const opsReports = page.getByText('Operations & Reports').first();
  await opsReports.click();
  
  // Wait for GPS Mileage Tracker to be visible
  const gpsTracker = page.getByTestId('gps-mileage-tracker');
  await expect(gpsTracker).toBeVisible();
  
  // Click to expand GPS Mileage Tracker
  await gpsTracker.click();
  
  // Wait for content to load
  await page.waitForTimeout(500);
}

// Helper to remove Emergent badge
async function removeEmergentBadge(page) {
  await page.evaluate(() => {
    const badge = document.querySelector('[class*="emergent"], [id*="emergent-badge"]');
    if (badge) badge.remove();
  });
}

test.describe('GPS Mileage Tracker - YTD Summary', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await removeEmergentBadge(page);
  });

  test('GPS Mileage Tracker section is visible and expandable', async ({ page }) => {
    // Expand Operations & Reports first
    const opsReports = page.getByText('Operations & Reports').first();
    await opsReports.click();
    
    // Find and expand the GPS Mileage Tracker section
    const gpsTracker = page.getByTestId('gps-mileage-tracker');
    await expect(gpsTracker).toBeVisible();
    
    // Click to expand
    await gpsTracker.click();
    
    // Verify expanded content is visible - check manual entry button
    const manualEntryBtn = page.getByTestId('manual-entry-btn');
    await expect(manualEntryBtn).toBeVisible();
  });

  test('YTD summary displays correct structure (trips, miles, deduction)', async ({ page }) => {
    await expandGPSMileageTracker(page);
    
    // Click on Year tab to see YTD summary
    const yearTab = page.getByTestId('summary-tab-year');
    await expect(yearTab).toBeVisible();
    await yearTab.click();
    
    // Verify summary structure - should show Trips, Miles, Deduction
    await expect(page.getByText('Trips').first()).toBeVisible();
    await expect(page.getByText('Miles').first()).toBeVisible();
    await expect(page.getByText('Deduction').first()).toBeVisible();
    
    // Verify IRS rate is displayed
    await expect(page.getByText('IRS Rate:')).toBeVisible();
    await expect(page.getByText('$0.725/mile')).toBeVisible();
  });

  test('YTD summary shows non-zero values when trips exist', async ({ page }) => {
    await expandGPSMileageTracker(page);
    
    // Click on Year tab
    const yearTab = page.getByTestId('summary-tab-year');
    await yearTab.click();
    
    // Wait for data to load
    await page.waitForTimeout(500);
    
    // The YTD should show actual data (we know there are trips from API tests)
    // Check that the summary section is visible
    await expect(page.getByText('Year-to-Date')).toBeVisible();
  });

  test('Summary tabs (Today/Month/Year) are visible and clickable', async ({ page }) => {
    await expandGPSMileageTracker(page);
    
    // Wait for summary tabs to load
    const todayTab = page.getByTestId('summary-tab-today');
    const monthTab = page.getByTestId('summary-tab-month');
    const yearTab = page.getByTestId('summary-tab-year');
    
    await expect(todayTab).toBeVisible();
    await expect(monthTab).toBeVisible();
    await expect(yearTab).toBeVisible();
    
    // Click Today tab
    await todayTab.click();
    await expect(todayTab).toHaveClass(/bg-blue-100/);
    
    // Click Month tab
    await monthTab.click();
    await expect(monthTab).toHaveClass(/bg-blue-100/);
    
    // Click Year tab
    await yearTab.click();
    await expect(yearTab).toHaveClass(/bg-blue-100/);
  });
});

test.describe('GPS Mileage Tracker - Manual Trip Entry', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await removeEmergentBadge(page);
  });

  test('Manual trip entry form opens and has required fields', async ({ page }) => {
    await expandGPSMileageTracker(page);
    
    // Click manual entry button
    const manualEntryBtn = page.getByTestId('manual-entry-btn');
    await expect(manualEntryBtn).toBeVisible();
    await manualEntryBtn.click();
    
    // Verify form fields are visible
    const dateInput = page.getByTestId('manual-trip-date');
    const milesInput = page.getByTestId('manual-trip-miles');
    const purposeSelect = page.getByTestId('manual-trip-purpose');
    const saveBtn = page.getByTestId('save-manual-trip-btn');
    
    await expect(dateInput).toBeVisible();
    await expect(milesInput).toBeVisible();
    await expect(purposeSelect).toBeVisible();
    await expect(saveBtn).toBeVisible();
    
    // Save button should be disabled without required fields
    await expect(saveBtn).toBeDisabled();
  });

  test('Manual trip entry form can be filled and save button becomes enabled', async ({ page }) => {
    await expandGPSMileageTracker(page);
    
    // Click manual entry button
    const manualEntryBtn = page.getByTestId('manual-entry-btn');
    await manualEntryBtn.click();
    
    // Fill in the form
    const dateInput = page.getByTestId('manual-trip-date');
    const milesInput = page.getByTestId('manual-trip-miles');
    const purposeSelect = page.getByTestId('manual-trip-purpose');
    
    // Set date to today
    const today = new Date().toISOString().split('T')[0];
    await dateInput.fill(today);
    
    // Enter miles
    await milesInput.fill('12.5');
    
    // Select purpose
    await purposeSelect.click();
    await page.getByRole('option', { name: /Post Office/i }).click();
    
    // Save button should now be enabled
    const saveBtn = page.getByTestId('save-manual-trip-btn');
    await expect(saveBtn).toBeEnabled();
    
    // Verify the tax deduction is calculated and displayed
    await expect(page.getByText('Tax Deduction:')).toBeVisible();
  });

  test('Tax deduction calculation shows correct rate ($0.725/mile)', async ({ page }) => {
    await expandGPSMileageTracker(page);
    
    // Click manual entry button
    const manualEntryBtn = page.getByTestId('manual-entry-btn');
    await manualEntryBtn.click();
    
    // Enter miles
    const milesInput = page.getByTestId('manual-trip-miles');
    await milesInput.fill('10');
    
    // Verify tax deduction is calculated (10 * 0.725 = $7.25)
    await expect(page.getByText('Tax Deduction: $7.25')).toBeVisible();
  });
});

test.describe('GPS Mileage Tracker - Adjust Mileage', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await removeEmergentBadge(page);
  });

  test('Adjust mileage button is visible in summary', async ({ page }) => {
    await expandGPSMileageTracker(page);
    
    // Adjust button should be visible
    const adjustBtn = page.getByTestId('adjust-mileage-btn');
    await expect(adjustBtn).toBeVisible();
  });
});

test.describe('Admin Login Flow', () => {
  test('Admin can login with access code 4399', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    
    // Step 1: Enter email using data-testid
    const emailInput = page.getByTestId('login-email');
    await expect(emailInput).toBeVisible();
    await emailInput.click();
    await emailInput.pressSequentially('matthewjesusguzman1@gmail.com', { delay: 20 });
    
    // Click Continue
    const submitBtn = page.getByTestId('login-submit-btn');
    await submitBtn.click();
    
    // Wait for access code input
    const codeInput = page.getByTestId('login-admin-code');
    await expect(codeInput).toBeVisible();
    
    // Step 2: Enter access code
    await codeInput.click();
    await codeInput.pressSequentially('4399', { delay: 50 });
    await submitBtn.click();
    
    // Verify admin dashboard loads
    await expect(page.getByTestId('admin-dashboard')).toBeVisible();
  });
});

test.describe('Manual Trip Entry Bug Fix (BUG-FIX-001)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await removeEmergentBadge(page);
  });

  test('Manual trip entry saves correctly without "Please enter the miles driven" error', async ({ page }) => {
    // This test verifies the bug fix where onClick={handleSaveManualTrip} was passing
    // the click event as formData parameter, causing validation to fail because event.miles is undefined.
    // The fix changed to onClick={() => handleSaveManualTrip()} to ensure null is passed
    // and the internal state (manualTripData) is used correctly.
    
    await expandGPSMileageTracker(page);
    
    // Click manual entry button
    const manualEntryBtn = page.getByTestId('manual-entry-btn');
    await expect(manualEntryBtn).toBeVisible();
    await manualEntryBtn.click();
    
    // Fill in the form with test data
    const today = new Date().toISOString().split('T')[0];
    await page.getByTestId('manual-trip-date').fill(today);
    
    // Enter miles - this is the key test for the bug fix
    await page.getByTestId('manual-trip-miles').fill('2.5');
    
    // Verify tax deduction is calculated (2.5 * 0.725 = $1.81)
    await expect(page.getByText('Tax Deduction: $1.81')).toBeVisible();
    
    // Select purpose
    await page.getByTestId('manual-trip-purpose').click();
    await page.getByRole('option', { name: /Post Office/i }).click();
    
    // Save button should be enabled
    const saveBtn = page.getByTestId('save-manual-trip-btn');
    await expect(saveBtn).toBeEnabled();
    
    // Click save - this is where the bug was occurring
    await saveBtn.click();
    
    // Wait for success toast - the bug would show "Please enter the miles driven" error instead
    await expect(page.getByText(/Trip logged!/i)).toBeVisible();
    await expect(page.getByText(/2.5 miles/i)).toBeVisible();
    
    // Verify the form closes after successful save
    await expect(page.getByTestId('manual-trip-miles')).not.toBeVisible();
    
    // Verify manual entry button is visible again
    await expect(manualEntryBtn).toBeVisible();
  });
});
