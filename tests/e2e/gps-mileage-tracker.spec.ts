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
}

// Helper to remove Emergent badge
async function removeEmergentBadge(page) {
  await page.evaluate(() => {
    const badge = document.querySelector('[class*="emergent"], [id*="emergent-badge"]');
    if (badge) badge.remove();
  });
}

test.describe('GPS Mileage Tracker', () => {
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
    
    // Verify expanded content is visible - check each button individually
    const startBtn = page.getByTestId('start-trip-btn');
    const manualEntryBtn = page.getByTestId('manual-entry-btn');
    
    // Both buttons should be visible when expanded (no active trip)
    await expect(startBtn).toBeVisible();
    await expect(manualEntryBtn).toBeVisible();
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

  test('Mileage summary shows correct totals structure', async ({ page }) => {
    await expandGPSMileageTracker(page);
    
    // Click on Today tab
    const todayTab = page.getByTestId('summary-tab-today');
    await todayTab.click();
    
    // Verify summary structure - should show Trips, Miles, Deduction
    await expect(page.getByText('Trips').first()).toBeVisible();
    await expect(page.getByText('Miles').first()).toBeVisible();
    await expect(page.getByText('Deduction').first()).toBeVisible();
    
    // Click on Month tab
    const monthTab = page.getByTestId('summary-tab-month');
    await monthTab.click();
    
    // Same structure should be visible
    await expect(page.getByText('Trips').first()).toBeVisible();
    await expect(page.getByText('Miles').first()).toBeVisible();
    await expect(page.getByText('Deduction').first()).toBeVisible();
    
    // Click on Year tab
    const yearTab = page.getByTestId('summary-tab-year');
    await yearTab.click();
    
    // Same structure should be visible
    await expect(page.getByText('Trips').first()).toBeVisible();
    await expect(page.getByText('Miles').first()).toBeVisible();
    await expect(page.getByText('Deduction').first()).toBeVisible();
  });

  test('Start GPS Tracking button is visible', async ({ page }) => {
    await expandGPSMileageTracker(page);
    
    // Start GPS Tracking button should be visible
    const startBtn = page.getByTestId('start-trip-btn');
    await expect(startBtn).toBeVisible();
    await expect(startBtn).toContainText('Start GPS Tracking');
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
