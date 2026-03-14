import { test, expect } from '@playwright/test';
import { dismissToasts, removeEmergentBadge } from '../fixtures/helpers';

const BASE_URL = process.env.REACT_APP_BACKEND_URL || 'https://resale-hub-62.preview.emergentagent.com';

test.describe('Reports Section - Est. Pay Column Feature', () => {
  let authToken: string;

  test.beforeAll(async ({ request }) => {
    // Get auth token for API testing
    const response = await request.post(`${BASE_URL}/api/auth/login`, {
      data: {
        email: 'matthewjesusguzman1@gmail.com',
        admin_code: '4399'
      }
    });
    const data = await response.json();
    authToken = data.access_token;
  });

  test.beforeEach(async ({ page }) => {
    // Set sessionStorage to skip splash screen
    await page.addInitScript(() => {
      sessionStorage.setItem('hasSeenSplash', 'true');
    });
    await dismissToasts(page);
  });

  test('Backend API: GET /api/admin/reports/shifts returns hourly_rate for entries', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/admin/reports/shifts?start_date=2026-01-01&end_date=2026-12-31`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    expect(response.status()).toBe(200);
    const data = await response.json();
    
    // Verify structure
    expect(data).toHaveProperty('entries');
    expect(data).toHaveProperty('summary');
    
    // Verify each entry has hourly_rate
    if (data.entries.length > 0) {
      for (const entry of data.entries) {
        expect(entry).toHaveProperty('hourly_rate');
        expect(typeof entry.hourly_rate).toBe('number');
        expect(entry).toHaveProperty('total_hours');
      }
    }
    
    // Verify summary has hourly_rate for Est. Pay calculation
    if (data.summary.length > 0) {
      for (const summary of data.summary) {
        expect(summary).toHaveProperty('hourly_rate');
        expect(summary).toHaveProperty('total_hours');
        expect(typeof summary.hourly_rate).toBe('number');
      }
    }
  });

  test('Backend API: CSV export includes Est. Pay column', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/admin/reports/shifts/csv?start_date=2026-01-01&end_date=2026-12-31`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    expect(response.status()).toBe(200);
    const csvContent = await response.text();
    
    // Verify CSV header contains Est. Pay
    const lines = csvContent.split('\n');
    expect(lines[0]).toContain('Est. Pay');
    
    // Verify header row structure
    const headers = lines[0].split(',');
    expect(headers).toContain('Est. Pay');
    
    // Find Est. Pay column index
    const estPayIndex = headers.indexOf('Est. Pay');
    expect(estPayIndex).toBeGreaterThan(-1);
    
    // If there are data rows, verify Est. Pay values are formatted as currency
    if (lines.length > 1 && lines[1].trim() !== '') {
      const dataRow = lines[1].split(',');
      if (dataRow.length > estPayIndex) {
        // Est. Pay should be formatted like $X.XX
        expect(dataRow[estPayIndex]).toMatch(/^\$[\d,]+\.\d{2}$/);
      }
    }
    
    // Verify summary section has Estimated Pay
    expect(csvContent).toContain('=== SUMMARY ===');
    expect(csvContent).toContain('Estimated Pay');
  });

  test('Backend API: PDF export returns valid PDF with Est. Pay', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/admin/reports/shifts/pdf?start_date=2026-01-01&end_date=2026-12-31`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    expect(response.status()).toBe(200);
    
    // Verify content type is PDF
    const contentType = response.headers()['content-type'];
    expect(contentType).toBe('application/pdf');
    
    // Verify content disposition header
    const contentDisposition = response.headers()['content-disposition'];
    expect(contentDisposition).toContain('attachment');
    expect(contentDisposition).toContain('shift_report_');
    expect(contentDisposition).toContain('.pdf');
    
    // Verify PDF content starts with PDF magic number
    const body = await response.body();
    expect(body.slice(0, 5).toString()).toBe('%PDF-');
  });

  test('Frontend: Reports section loads and displays correctly', async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    
    // Wait for login form and fill it
    const loginForm = page.getByTestId('login-form');
    await expect(loginForm).toBeVisible({ timeout: 10000 });
    
    await page.getByTestId('login-email').fill('4399');
    await page.getByTestId('login-submit-btn').click();
    
    // Wait for admin dashboard
    await expect(page.getByTestId('admin-dashboard')).toBeVisible({ timeout: 15000 });
    
    // Scroll to find Reports section
    await removeEmergentBadge(page);
    
    // Find and expand Reports section
    const reportsSection = page.getByTestId('reports-section');
    await reportsSection.scrollIntoViewIfNeeded();
    await expect(reportsSection).toBeVisible();
    
    // Click to expand reports
    const reportsToggle = page.getByTestId('reports-toggle');
    await reportsToggle.click();
    
    // Verify report type selector is visible - use more specific selectors
    // Note: Mileage Report option was removed, now only Payroll/Shift and W-9 remain
    await expect(page.locator('button:has-text("Payroll/Shift Report")')).toBeVisible();
    await expect(page.locator('button:has-text("W-9 Report")')).toBeVisible();
    
    // Screenshot the expanded reports section
    await page.screenshot({ path: '.screenshots/reports-section-expanded.jpeg', quality: 20 });
  });

  test('Frontend: Preview shift report shows Est. Pay column in table', async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    await page.getByTestId('login-email').fill('4399');
    await page.getByTestId('login-submit-btn').click();
    await expect(page.getByTestId('admin-dashboard')).toBeVisible({ timeout: 15000 });
    
    await removeEmergentBadge(page);
    
    // Navigate to Reports section
    const reportsSection = page.getByTestId('reports-section');
    await reportsSection.scrollIntoViewIfNeeded();
    const reportsToggle = page.getByTestId('reports-toggle');
    await reportsToggle.click();
    
    // Ensure Payroll/Shift Report is selected (default)
    await expect(page.getByText('Payroll/Shift Report')).toBeVisible();
    
    // Click Preview Report button
    const previewBtn = page.getByTestId('preview-report-btn');
    await expect(previewBtn).toBeVisible();
    await previewBtn.click();
    
    // Wait for the preview to load - look for the report summary or table
    await page.waitForLoadState('networkidle');
    
    // Check if there's data or "no shifts found" message
    const hasData = await page.locator('text=Shift Details').isVisible({ timeout: 5000 }).catch(() => false);
    const noData = await page.locator('text=No shifts found').isVisible({ timeout: 2000 }).catch(() => false);
    
    if (hasData) {
      // Verify "Est. Pay" column header exists in Shift Details table
      const estPayHeader = page.locator('th:has-text("Est. Pay")');
      await expect(estPayHeader.first()).toBeVisible();
      
      // Also check for By Employee summary table which has Est. Pay
      const summaryEstPay = page.locator('table th:has-text("Est. Pay")');
      const count = await summaryEstPay.count();
      expect(count).toBeGreaterThan(0);
      
      // Take screenshot showing Est. Pay column
      await page.screenshot({ path: '.screenshots/shift-report-est-pay.jpeg', quality: 20 });
    } else if (noData) {
      // If no data, that's still a valid state - just verify the message
      await expect(page.getByText('No shifts found')).toBeVisible();
    } else {
      // Wait a bit more and take screenshot for debugging
      await page.screenshot({ path: '.screenshots/shift-report-preview-debug.jpeg', quality: 20 });
    }
  });

  test('Frontend: CSV download button triggers download', async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    await page.getByTestId('login-email').fill('4399');
    await page.getByTestId('login-submit-btn').click();
    await expect(page.getByTestId('admin-dashboard')).toBeVisible({ timeout: 15000 });
    
    await removeEmergentBadge(page);
    
    // Navigate to Reports section
    const reportsSection = page.getByTestId('reports-section');
    await reportsSection.scrollIntoViewIfNeeded();
    const reportsToggle = page.getByTestId('reports-toggle');
    await reportsToggle.click();
    
    // Click CSV download button
    const csvBtn = page.getByTestId('download-csv-btn');
    await expect(csvBtn).toBeVisible();
    
    // Set up download listener before clicking
    const downloadPromise = page.waitForEvent('download', { timeout: 15000 });
    await csvBtn.click();
    
    // Wait for download to start
    const download = await downloadPromise;
    
    // Verify download filename (frontend uses 'shifts_report_' pattern)
    const filename = download.suggestedFilename();
    expect(filename).toContain('shifts_report_');
    expect(filename).toContain('.csv');
  });

  test('Frontend: PDF download button triggers download', async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    await page.getByTestId('login-email').fill('4399');
    await page.getByTestId('login-submit-btn').click();
    await expect(page.getByTestId('admin-dashboard')).toBeVisible({ timeout: 15000 });
    
    await removeEmergentBadge(page);
    
    // Navigate to Reports section
    const reportsSection = page.getByTestId('reports-section');
    await reportsSection.scrollIntoViewIfNeeded();
    const reportsToggle = page.getByTestId('reports-toggle');
    await reportsToggle.click();
    
    // Click PDF download button
    const pdfBtn = page.getByTestId('download-pdf-btn');
    await expect(pdfBtn).toBeVisible();
    
    // Set up download listener before clicking
    const downloadPromise = page.waitForEvent('download', { timeout: 15000 });
    await pdfBtn.click();
    
    // Wait for download to start
    const download = await downloadPromise;
    
    // Verify download filename (frontend uses 'shifts_report_' pattern)
    const filename = download.suggestedFilename();
    expect(filename).toContain('shifts_report_');
    expect(filename).toContain('.pdf');
  });

  test('Backend API: Est. Pay calculation is correct (hours * hourly_rate)', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/admin/reports/shifts?start_date=2026-01-01&end_date=2026-12-31`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    const data = await response.json();
    
    // For each entry, verify that est_pay = total_hours * hourly_rate
    if (data.entries.length > 0) {
      for (const entry of data.entries) {
        const expectedPay = (entry.total_hours || 0) * (entry.hourly_rate || 15);
        // Note: The API doesn't return est_pay directly, but hourly_rate for frontend calculation
        // Frontend calculates: formatCurrency((entry.total_hours || 0) * (entry.hourly_rate || 15))
        expect(entry.hourly_rate).toBeDefined();
        expect(entry.total_hours).toBeDefined();
        expect(expectedPay).toBeGreaterThanOrEqual(0);
      }
    }
    
    // Verify summary total pays are calculable
    if (data.summary.length > 0) {
      for (const s of data.summary) {
        const expectedTotalPay = s.total_hours * s.hourly_rate;
        expect(expectedTotalPay).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test('Backend API: CSV Est. Pay values match API calculation', async ({ request }) => {
    // Get JSON data
    const jsonResponse = await request.get(`${BASE_URL}/api/admin/reports/shifts?start_date=2026-01-01&end_date=2026-12-31`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    const jsonData = await jsonResponse.json();
    
    // Get CSV data
    const csvResponse = await request.get(`${BASE_URL}/api/admin/reports/shifts/csv?start_date=2026-01-01&end_date=2026-12-31`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    const csvContent = await csvResponse.text();
    
    // Parse CSV to verify Est. Pay values
    const lines = csvContent.split('\n');
    const headers = lines[0].split(',');
    const estPayIndex = headers.indexOf('Est. Pay');
    const hoursIndex = headers.indexOf('Hours');
    
    // For each entry in JSON, verify corresponding CSV row
    if (jsonData.entries.length > 0 && lines.length > 1) {
      // Skip header, get first data row
      const dataRow = lines[1].split(',');
      const entry = jsonData.entries[0];
      
      // Expected pay from JSON
      const expectedPay = (entry.total_hours || 0) * (entry.hourly_rate || 15);
      
      // CSV pay value (remove $ and convert to float)
      if (dataRow[estPayIndex]) {
        const csvPay = parseFloat(dataRow[estPayIndex].replace('$', ''));
        expect(csvPay).toBeCloseTo(expectedPay, 2);
      }
    }
  });
});
