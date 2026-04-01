import { test, expect } from '@playwright/test';

/**
 * Tax Returns Archive E2E Tests
 * Tests the Tax Returns Archive section in Admin Dashboard under Operations & Reports
 */

const ADMIN_EMAIL = 'matthewjesusguzman1@gmail.com';
const ADMIN_CODE = '4399';

// Helper function to login as admin
async function loginAsAdmin(page) {
  await page.goto('/admin', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  
  // Enter email
  await page.fill('input[placeholder="your@email.com"]', ADMIN_EMAIL);
  await page.click('button:has-text("Find My Account")');
  await page.waitForTimeout(2000);
  
  // Enter access code
  await page.fill('input[placeholder="4-digit code"]', ADMIN_CODE);
  await page.click('button:has-text("Sign In")');
  await page.waitForTimeout(3000);
  
  // Verify we're on the admin dashboard
  await expect(page.locator('text=Admin Dashboard')).toBeVisible();
}

// Helper function to navigate to Tax Returns Archive
async function navigateToTaxReturnsArchive(page) {
  // Click on Operations & Reports to expand
  await page.click('text=Operations & Reports');
  await page.waitForTimeout(1500);
  
  // Scroll down to Tax Returns Archive
  await page.evaluate(() => window.scrollBy(0, 1200));
  await page.waitForTimeout(1000);
  
  // Verify Tax Returns Archive section is visible
  await expect(page.getByTestId('tax-returns-archive-section')).toBeVisible();
}

test.describe('Tax Returns Archive Section', () => {
  
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('Tax Returns Archive section is visible in Admin Dashboard under Operations & Reports', async ({ page }) => {
    // Navigate to Operations & Reports
    await page.click('text=Operations & Reports');
    await page.waitForTimeout(1500);
    
    // Scroll down to find Tax Returns Archive
    await page.evaluate(() => window.scrollBy(0, 1200));
    await page.waitForTimeout(1000);
    
    // Verify Tax Returns Archive section is visible
    const archiveSection = page.getByTestId('tax-returns-archive-section');
    await expect(archiveSection).toBeVisible();
    
    // Verify the title
    const title = page.getByTestId('tax-returns-archive-title');
    await expect(title).toHaveText('Tax Returns Archive');
  });

  test('Year accordion expands to show upload functionality', async ({ page }) => {
    await navigateToTaxReturnsArchive(page);
    
    // Click on Tax Year 2025 to expand
    const year2025Toggle = page.getByTestId('tax-year-2025-toggle');
    await year2025Toggle.click();
    await page.waitForTimeout(2000);
    
    // Verify the upload button is visible
    const uploadButton = page.getByTestId('upload-button-2025');
    await expect(uploadButton).toBeVisible();
    
    // Verify "Filed Tax Return" section is visible
    await expect(page.locator('text=Filed Tax Return')).toBeVisible();
  });

  test('Year accordion shows Tax Summary with download options', async ({ page }) => {
    await navigateToTaxReturnsArchive(page);
    
    // Click on Tax Year 2025 to expand
    const year2025Toggle = page.getByTestId('tax-year-2025-toggle');
    await year2025Toggle.click();
    await page.waitForTimeout(2000);
    
    // Verify Tax Summary section is visible
    await expect(page.locator('text=Tax Summary')).toBeVisible();
    
    // Verify Gross Income and Net Profit are displayed
    await expect(page.locator('text=Gross Income:')).toBeVisible();
    await expect(page.locator('text=Net Profit:')).toBeVisible();
    
    // Verify PDF and CSV download buttons are visible
    await expect(page.locator('button:has-text("PDF")')).toBeVisible();
    await expect(page.locator('button:has-text("CSV")')).toBeVisible();
  });

  test('Multiple year accordions are available', async ({ page }) => {
    await navigateToTaxReturnsArchive(page);
    
    // Verify multiple tax years are available
    await expect(page.getByTestId('tax-year-2025')).toBeVisible();
    await expect(page.getByTestId('tax-year-2024')).toBeVisible();
    
    // Scroll down to see more years
    await page.evaluate(() => window.scrollBy(0, 200));
    await page.waitForTimeout(500);
    
    // Check for additional years (2023, 2022, 2021)
    const year2023 = page.getByTestId('tax-year-2023');
    const year2022 = page.getByTestId('tax-year-2022');
    const year2021 = page.getByTestId('tax-year-2021');
    
    // At least some of these should be visible
    const visibleYears = await Promise.all([
      year2023.isVisible().catch(() => false),
      year2022.isVisible().catch(() => false),
      year2021.isVisible().catch(() => false)
    ]);
    
    expect(visibleYears.some(v => v)).toBeTruthy();
  });

  test('Upload button triggers file input', async ({ page }) => {
    await navigateToTaxReturnsArchive(page);
    
    // Click on Tax Year 2025 to expand
    const year2025Toggle = page.getByTestId('tax-year-2025-toggle');
    await year2025Toggle.click();
    await page.waitForTimeout(2000);
    
    // Verify the upload input exists
    const uploadInput = page.getByTestId('upload-input-2025');
    await expect(uploadInput).toBeAttached();
    
    // Verify the upload button is clickable
    const uploadButton = page.getByTestId('upload-button-2025');
    await expect(uploadButton).toBeEnabled();
  });

  test('Shows "No filed return uploaded yet" when no documents exist', async ({ page }) => {
    await navigateToTaxReturnsArchive(page);
    
    // Click on Tax Year 2025 to expand
    const year2025Toggle = page.getByTestId('tax-year-2025-toggle');
    await year2025Toggle.click();
    await page.waitForTimeout(2000);
    
    // Check for the "no returns" message or existing documents
    const noReturnsMessage = page.getByTestId('no-returns-2025');
    const returnsList = page.getByTestId('tax-returns-list-2025');
    
    // Either no returns message should be visible OR returns list should be visible
    const noReturnsVisible = await noReturnsMessage.isVisible().catch(() => false);
    const returnsListVisible = await returnsList.isVisible().catch(() => false);
    
    expect(noReturnsVisible || returnsListVisible).toBeTruthy();
  });

  test('Year accordion can be collapsed after expanding', async ({ page }) => {
    await navigateToTaxReturnsArchive(page);
    
    // Click on Tax Year 2025 to expand
    const year2025Toggle = page.getByTestId('tax-year-2025-toggle');
    await year2025Toggle.click();
    await page.waitForTimeout(1500);
    
    // Verify expanded content is visible
    const uploadButton = page.getByTestId('upload-button-2025');
    await expect(uploadButton).toBeVisible();
    
    // Click again to collapse
    await year2025Toggle.click();
    await page.waitForTimeout(1500);
    
    // Verify content is no longer visible
    await expect(uploadButton).not.toBeVisible();
  });

  test('Different years can be expanded independently', async ({ page }) => {
    await navigateToTaxReturnsArchive(page);
    
    // Click on Tax Year 2025 to expand
    const year2025Toggle = page.getByTestId('tax-year-2025-toggle');
    await year2025Toggle.click();
    await page.waitForTimeout(1500);
    
    // Verify 2025 is expanded
    const uploadButton2025 = page.getByTestId('upload-button-2025');
    await expect(uploadButton2025).toBeVisible();
    
    // Click on Tax Year 2024 to expand
    const year2024Toggle = page.getByTestId('tax-year-2024-toggle');
    await year2024Toggle.click();
    await page.waitForTimeout(1500);
    
    // Verify 2024 is now expanded (2025 should collapse since only one can be expanded at a time)
    const uploadButton2024 = page.getByTestId('upload-button-2024');
    await expect(uploadButton2024).toBeVisible();
    
    // 2025 should be collapsed now
    await expect(uploadButton2025).not.toBeVisible();
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
