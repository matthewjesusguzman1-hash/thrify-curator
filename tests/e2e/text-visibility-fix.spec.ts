import { test, expect } from '@playwright/test';

test.describe('Applicant Tests Section Text Visibility Fix', () => {
  test('should verify text visibility in Applicant Skills Tests section', async ({ page }) => {
    // Navigate to home page
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // Click on Employee Portal to go to login
    const employeePortal = page.locator('text=Employee Portal').first();
    await expect(employeePortal).toBeVisible();
    await employeePortal.click();
    
    // Wait for login page
    await page.waitForLoadState('networkidle');

    // Login as admin
    const emailInput = page.getByTestId('login-email');
    await expect(emailInput).toBeVisible();
    await emailInput.fill('matthewjesusguzman1@gmail.com');
    await page.getByTestId('login-submit-btn').click();
    
    // Wait for admin code input
    const codeInput = page.getByTestId('login-admin-code');
    await expect(codeInput).toBeVisible();
    await codeInput.fill('4399');
    await page.getByTestId('login-submit-btn').click();
    
    // Wait for dashboard to load
    await page.waitForLoadState('networkidle');
    
    // Find and expand the Hiring section
    const hiringSection = page.locator('text=Hiring').first();
    await expect(hiringSection).toBeVisible();
    await hiringSection.click();
    
    // Wait for section to expand
    await page.waitForTimeout(500);

    // Verify the Applicant Skills Tests header is visible with white text
    const applicantTestsHeader = page.locator('h2:has-text("Applicant Skills Tests")');
    await expect(applicantTestsHeader).toBeVisible();

    // Check that the header has white text (text-white class)
    const headerClasses = await applicantTestsHeader.getAttribute('class');
    expect(headerClasses).toContain('text-white');

    // Verify the description text is visible
    const descriptionText = page.locator('text=Create listing tests to evaluate job applicants');
    await expect(descriptionText).toBeVisible();

    // Check that description has light gray text (text-gray-300 class)
    const descriptionElement = page.locator('p:has-text("Create listing tests to evaluate job applicants")');
    const descriptionClasses = await descriptionElement.getAttribute('class');
    expect(descriptionClasses).toContain('text-gray-300');
  });

  test('should verify Hiring section is separate from Forms & Communications', async ({ page }) => {
    // Navigate to home page
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // Click on Employee Portal to go to login
    const employeePortal = page.locator('text=Employee Portal').first();
    await expect(employeePortal).toBeVisible();
    await employeePortal.click();
    
    // Wait for login page
    await page.waitForLoadState('networkidle');

    // Login as admin
    const emailInput = page.getByTestId('login-email');
    await expect(emailInput).toBeVisible();
    await emailInput.fill('matthewjesusguzman1@gmail.com');
    await page.getByTestId('login-submit-btn').click();
    
    // Wait for admin code input
    const codeInput = page.getByTestId('login-admin-code');
    await expect(codeInput).toBeVisible();
    await codeInput.fill('4399');
    await page.getByTestId('login-submit-btn').click();
    
    // Wait for dashboard to load
    await page.waitForLoadState('networkidle');

    // Verify Hiring section exists as a separate DashboardGroup
    const hiringSection = page.locator('text=Hiring').first();
    await expect(hiringSection).toBeVisible();

    // Verify Forms & Communications section exists separately
    const formsSection = page.locator('text=Forms & Communications').first();
    await expect(formsSection).toBeVisible();

    // Click on Hiring to expand it
    await hiringSection.click();
    await page.waitForTimeout(500);

    // Verify Applicant Skills Tests is visible inside Hiring section
    const applicantTestsHeader = page.locator('h2:has-text("Applicant Skills Tests")');
    await expect(applicantTestsHeader).toBeVisible();

    // Click on Hiring again to collapse it
    await hiringSection.click();
    await page.waitForTimeout(500);

    // Verify Applicant Skills Tests is no longer visible (collapsed)
    await expect(applicantTestsHeader).not.toBeVisible();
  });
});
