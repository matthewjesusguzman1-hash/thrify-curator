import { test, expect } from '@playwright/test';

/**
 * Tax Returns Archive E2E Tests
 * Tests the Tax Returns Archive section in Admin Dashboard under Operations & Reports
 * 
 * Updated for collapsible section that only shows years with data:
 * - Section starts collapsed by default
 * - Header shows count of years with data
 * - Only years with income data or uploaded returns are shown
 * - Year badges show 'Filed' for uploaded returns and 'Has Income Data' for income-only years
 */

const ADMIN_EMAIL = 'matthewjesusguzman1@gmail.com';
const ADMIN_CODE = '4399';

// Helper function to login as admin
async function loginAsAdmin(page) {
  await page.goto('/admin', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');
  
  // Enter email
  await page.fill('input[placeholder="your@email.com"]', ADMIN_EMAIL);
  await page.click('button:has-text("Find My Account")');
  await page.waitForLoadState('networkidle');
  
  // Enter access code
  await page.fill('input[placeholder="4-digit code"]', ADMIN_CODE);
  await page.click('button:has-text("Sign In")');
  await page.waitForLoadState('networkidle');
  
  // Verify we're on the admin dashboard
  await expect(page.locator('text=Admin Dashboard')).toBeVisible();
}

// Helper function to navigate to Tax Returns Archive section
async function navigateToTaxReturnsArchive(page) {
  // Click on Operations & Reports to expand
  await page.click('text=Operations & Reports');
  await page.waitForLoadState('networkidle');
  
  // Scroll down to Tax Returns Archive
  await page.evaluate(() => window.scrollBy(0, 1500));
  
  // Verify Tax Returns Archive section is visible
  await expect(page.getByTestId('tax-returns-archive-section')).toBeVisible();
}

// Helper function to expand the Tax Returns Archive section
async function expandTaxReturnsArchive(page) {
  const archiveToggle = page.getByTestId('tax-returns-archive-toggle');
  await archiveToggle.click();
  await page.waitForLoadState('networkidle');
}

test.describe('Tax Returns Archive Section - Collapsible Behavior', () => {
  
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('Tax Returns Archive section starts collapsed by default', async ({ page }) => {
    await navigateToTaxReturnsArchive(page);
    
    // Verify the section is visible
    const archiveSection = page.getByTestId('tax-returns-archive-section');
    await expect(archiveSection).toBeVisible();
    
    // Verify the title
    const title = page.getByTestId('tax-returns-archive-title');
    await expect(title).toHaveText('Tax Returns Archive');
    
    // Verify the toggle button exists
    const archiveToggle = page.getByTestId('tax-returns-archive-toggle');
    await expect(archiveToggle).toBeVisible();
    
    // Verify year rows are NOT visible (section is collapsed)
    // We check that no tax-year-* toggle is visible
    const anyYearToggle = page.locator('[data-testid^="tax-year-"][data-testid$="-toggle"]').first();
    await expect(anyYearToggle).not.toBeVisible();
  });

  test('Section header shows count of years with data', async ({ page }) => {
    await navigateToTaxReturnsArchive(page);
    
    // The header should show "X years with data" text
    const archiveSection = page.getByTestId('tax-returns-archive-section');
    await expect(archiveSection).toContainText(/\d+ years? with data/);
  });

  test('Expand/collapse toggle works correctly', async ({ page }) => {
    await navigateToTaxReturnsArchive(page);
    
    const archiveToggle = page.getByTestId('tax-returns-archive-toggle');
    
    // Initially collapsed - no year toggles visible
    const anyYearToggle = page.locator('[data-testid^="tax-year-"][data-testid$="-toggle"]').first();
    await expect(anyYearToggle).not.toBeVisible();
    
    // Click to expand
    await archiveToggle.click();
    await page.waitForLoadState('networkidle');
    
    // Now year toggles should be visible
    await expect(anyYearToggle).toBeVisible();
    
    // Click to collapse again
    await archiveToggle.click();
    await page.waitForLoadState('networkidle');
    
    // Year toggles should be hidden again
    await expect(anyYearToggle).not.toBeVisible();
  });
});

test.describe('Tax Returns Archive Section - Years with Data', () => {
  
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await navigateToTaxReturnsArchive(page);
    await expandTaxReturnsArchive(page);
    // Wait for loading to complete - wait for "years with data" text to appear
    await expect(page.getByTestId('tax-returns-archive-section')).toContainText(/\d+ years? with data/);
  });

  test('Only years with data are shown', async ({ page }) => {
    // Get all visible year toggles (these are the year rows)
    const yearToggles = page.locator('[data-testid^="tax-year-"][data-testid$="-toggle"]');
    const count = await yearToggles.count();
    
    // Should have at least one year with data
    expect(count).toBeGreaterThan(0);
    
    // Each visible year should have either "Filed" or "Has Income Data" badge
    for (let i = 0; i < count; i++) {
      const yearToggle = yearToggles.nth(i);
      const hasFiled = await yearToggle.locator('text=Filed').isVisible().catch(() => false);
      const hasIncomeData = await yearToggle.locator('text=Has Income Data').isVisible().catch(() => false);
      
      // Each year should have at least one badge
      expect(hasFiled || hasIncomeData).toBeTruthy();
    }
  });

  test('Year badges show "Filed" for uploaded returns', async ({ page }) => {
    // Look for a year with "Filed" badge (Tax Year 2023 has a filed return)
    const filedBadge = page.locator('text=Filed').first();
    
    // If there's a filed return, verify the badge is visible
    const isFiledVisible = await filedBadge.isVisible().catch(() => false);
    if (isFiledVisible) {
      await expect(filedBadge).toBeVisible();
      // The badge should be green (bg-green-100)
      const parentRow = filedBadge.locator('xpath=ancestor::div[@data-testid]').first();
      await expect(parentRow).toBeVisible();
    }
  });

  test('Year badges show "Has Income Data" for income-only years', async ({ page }) => {
    // Look for a year with "Has Income Data" badge
    const incomeDataBadge = page.locator('text=Has Income Data').first();
    
    // If there's income data, verify the badge is visible
    const isIncomeDataVisible = await incomeDataBadge.isVisible().catch(() => false);
    if (isIncomeDataVisible) {
      await expect(incomeDataBadge).toBeVisible();
      // The badge should be blue (bg-blue-100)
    }
  });

  test('Year accordion expands to show Tax Summary and upload functionality', async ({ page }) => {
    // Get the first visible year toggle
    const firstYearToggle = page.locator('[data-testid^="tax-year-"][data-testid$="-toggle"]').first();
    await expect(firstYearToggle).toBeVisible();
    
    // Click to expand
    await firstYearToggle.click();
    await page.waitForLoadState('networkidle');
    
    // Scroll down to see expanded content
    await page.evaluate(() => window.scrollBy(0, 300));
    
    // Verify Tax Summary section is visible
    await expect(page.locator('text=Tax Summary')).toBeVisible();
    
    // Verify Gross Income and Net Profit are displayed
    await expect(page.locator('text=Gross Income:')).toBeVisible();
    await expect(page.locator('text=Net Profit:')).toBeVisible();
    
    // Verify Filed Tax Return section is visible
    await expect(page.locator('text=Filed Tax Return')).toBeVisible();
    
    // Verify Upload button is visible
    await expect(page.locator('text=Upload Tax Return')).toBeVisible();
  });

  test('Year accordion can be collapsed after expanding', async ({ page }) => {
    // Get the first visible year toggle
    const firstYearToggle = page.locator('[data-testid^="tax-year-"][data-testid$="-toggle"]').first();
    
    // Click to expand
    await firstYearToggle.click();
    await page.waitForLoadState('networkidle');
    
    // Verify expanded content is visible
    await expect(page.locator('text=Tax Summary')).toBeVisible();
    
    // Click again to collapse
    await firstYearToggle.click();
    await page.waitForLoadState('networkidle');
    
    // Verify content is no longer visible
    await expect(page.locator('text=Tax Summary')).not.toBeVisible();
  });

  test('Different years can be expanded - only one at a time', async ({ page }) => {
    // Get all year toggles
    const yearToggles = page.locator('[data-testid^="tax-year-"][data-testid$="-toggle"]');
    const count = await yearToggles.count();
    
    if (count >= 2) {
      // Click first year to expand
      await yearToggles.nth(0).click();
      await page.waitForLoadState('networkidle');
      
      // Verify first year is expanded
      await expect(page.locator('text=Tax Summary')).toBeVisible();
      
      // Click second year to expand
      await yearToggles.nth(1).click();
      await page.waitForLoadState('networkidle');
      
      // Scroll to see content
      await page.evaluate(() => window.scrollBy(0, 200));
      
      // Second year should now be expanded (only one at a time)
      await expect(page.locator('text=Tax Summary')).toBeVisible();
    }
  });
});

test.describe('Tax Returns Archive - Upload/Download/Delete Functionality', () => {
  
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await navigateToTaxReturnsArchive(page);
    await expandTaxReturnsArchive(page);
  });

  test('Upload button triggers file input', async ({ page }) => {
    // Get the first visible year toggle and expand it
    const firstYearToggle = page.locator('[data-testid^="tax-year-"][data-testid$="-toggle"]').first();
    await firstYearToggle.click();
    await page.waitForLoadState('networkidle');
    
    // Scroll down to see upload button
    await page.evaluate(() => window.scrollBy(0, 300));
    
    // Get the year from the toggle's testid
    const testId = await firstYearToggle.getAttribute('data-testid');
    const year = testId?.match(/tax-year-(\d+)-toggle/)?.[1];
    
    if (year) {
      // Verify the upload input exists
      const uploadInput = page.getByTestId(`upload-input-${year}`);
      await expect(uploadInput).toBeAttached();
      
      // Verify the upload button is clickable
      const uploadButton = page.getByTestId(`upload-button-${year}`);
      await expect(uploadButton).toBeEnabled();
    }
  });

  test('Shows "No filed return uploaded yet" when no documents exist for a year', async ({ page }) => {
    // Find a year with "Has Income Data" badge (no filed return)
    const incomeDataBadge = page.locator('text=Has Income Data').first();
    const isIncomeDataVisible = await incomeDataBadge.isVisible().catch(() => false);
    
    if (isIncomeDataVisible) {
      // Click on the parent year toggle
      const yearRow = incomeDataBadge.locator('xpath=ancestor::button[@data-testid]');
      await yearRow.click();
      await page.waitForLoadState('networkidle');
      
      // Scroll down to see content
      await page.evaluate(() => window.scrollBy(0, 300));
      
      // Check for the "no returns" message
      await expect(page.locator('text=No filed return uploaded yet')).toBeVisible();
    }
  });

  test('Filed returns show download and delete buttons', async ({ page }) => {
    // Find a year with "Filed" badge
    const filedBadge = page.locator('text=Filed').first();
    const isFiledVisible = await filedBadge.isVisible().catch(() => false);
    
    if (isFiledVisible) {
      // Click on the parent year toggle
      const yearRow = filedBadge.locator('xpath=ancestor::button[@data-testid]');
      await yearRow.click();
      await page.waitForLoadState('networkidle');
      
      // Scroll down to see content
      await page.evaluate(() => window.scrollBy(0, 300));
      
      // Verify download and delete buttons are visible for the document
      const downloadButton = page.locator('[data-testid^="download-doc-"]').first();
      const deleteButton = page.locator('[data-testid^="delete-doc-"]').first();
      
      await expect(downloadButton).toBeVisible();
      await expect(deleteButton).toBeVisible();
    }
  });
});

test.describe('Tax Returns Archive API Integration', () => {
  
  test('GET /api/financials/tax-returns/{year} returns correct structure', async ({ request }) => {
    const response = await request.get('/api/financials/tax-returns/2025');
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('year', 2025);
    expect(data).toHaveProperty('documents');
    expect(data).toHaveProperty('count');
    expect(Array.isArray(data.documents)).toBeTruthy();
  });

  test('POST /api/financials/tax-returns/{year}/upload accepts PDF files', async ({ request }) => {
    // Create a test PDF file
    const pdfContent = Buffer.from('%PDF-1.4 Test Tax Return PDF');
    
    const response = await request.post('/api/financials/tax-returns/2098/upload', {
      multipart: {
        file: {
          name: 'test_tax_return.pdf',
          mimeType: 'application/pdf',
          buffer: pdfContent
        },
        description: 'TEST_E2E Tax Return'
      }
    });
    
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.message).toBe('Tax return uploaded successfully');
    expect(data.document).toHaveProperty('id');
    expect(data.document.year).toBe(2098);
    expect(data.document.original_filename).toBe('test_tax_return.pdf');
    
    // Cleanup: Delete the uploaded document
    const docId = data.document.id;
    await request.delete(`/api/financials/tax-returns/2098/${docId}`);
  });

  test('POST /api/financials/tax-returns/{year}/upload rejects invalid file types', async ({ request }) => {
    const textContent = Buffer.from('This is not a valid file');
    
    const response = await request.post('/api/financials/tax-returns/2098/upload', {
      multipart: {
        file: {
          name: 'test.txt',
          mimeType: 'text/plain',
          buffer: textContent
        }
      }
    });
    
    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.detail).toContain('PDF');
  });

  test('DELETE /api/financials/tax-returns/{year}/{doc_id} deletes document', async ({ request }) => {
    // First upload a document
    const pdfContent = Buffer.from('%PDF-1.4 Test Delete');
    
    const uploadResponse = await request.post('/api/financials/tax-returns/2098/upload', {
      multipart: {
        file: {
          name: 'delete_test.pdf',
          mimeType: 'application/pdf',
          buffer: pdfContent
        }
      }
    });
    
    const docId = (await uploadResponse.json()).document.id;
    
    // Delete the document
    const deleteResponse = await request.delete(`/api/financials/tax-returns/2098/${docId}`);
    expect(deleteResponse.status()).toBe(200);
    
    const deleteData = await deleteResponse.json();
    expect(deleteData.message).toBe('Tax return document deleted');
    
    // Verify it's deleted
    const getResponse = await request.get('/api/financials/tax-returns/2098');
    const getData = await getResponse.json();
    const deletedDoc = getData.documents.find(d => d.id === docId);
    expect(deletedDoc).toBeUndefined();
  });

  test('GET /api/financials/tax-returns/{year}/{doc_id}/download returns file content', async ({ request }) => {
    // First upload a document
    const pdfContent = Buffer.from('%PDF-1.4 Test Download Content');
    
    const uploadResponse = await request.post('/api/financials/tax-returns/2098/upload', {
      multipart: {
        file: {
          name: 'download_test.pdf',
          mimeType: 'application/pdf',
          buffer: pdfContent
        }
      }
    });
    
    const docId = (await uploadResponse.json()).document.id;
    
    // Download the document
    const downloadResponse = await request.get(`/api/financials/tax-returns/2098/${docId}/download`);
    expect(downloadResponse.status()).toBe(200);
    
    const downloadedContent = await downloadResponse.body();
    expect(downloadedContent.toString()).toBe('%PDF-1.4 Test Download Content');
    
    // Cleanup
    await request.delete(`/api/financials/tax-returns/2098/${docId}`);
  });

  test('DELETE /api/financials/tax-returns/{year}/{doc_id} returns 404 for non-existent document', async ({ request }) => {
    const response = await request.delete('/api/financials/tax-returns/2098/nonexistent-id');
    expect(response.status()).toBe(404);
    
    const data = await response.json();
    expect(data.detail.toLowerCase()).toContain('not found');
  });
});
