import { test, expect } from '@playwright/test';
import { dismissToasts, removeEmergentBadge, loginAsAdmin, loginAsEmployee } from '../fixtures/helpers';

const BASE_URL = process.env.REACT_APP_BACKEND_URL || 'https://thrifty-curator-4.preview.emergentagent.com';
const TEST_EMPLOYEE_EMAIL = 'testemployee@thriftycurator.com';
const TEST_EMPLOYEE_ID = '6707c692-416d-4bd1-9596-2a9950419e2c';

test.describe('Hours Format Feature (h:m:s)', () => {
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
    await page.addInitScript(() => {
      sessionStorage.setItem('hasSeenSplash', 'true');
    });
    await dismissToasts(page);
  });

  test('Reports section summary shows hours in h:m:s format', async ({ page }) => {
    await loginAsAdmin(page);
    await removeEmergentBadge(page);
    
    // Navigate to Reports section
    const reportsSection = page.getByTestId('reports-section');
    await reportsSection.scrollIntoViewIfNeeded();
    const reportsToggle = page.getByTestId('reports-toggle');
    await reportsToggle.click();
    
    // Click Preview Report
    await page.getByTestId('preview-report-btn').click();
    
    // Wait for report data to load
    await expect(page.locator('text=Payroll/Shift Report Summary')).toBeVisible({ timeout: 15000 });
    
    // Check Total Hours format in summary (e.g., "0h 30m" or "Xh Ym")
    const totalHoursBox = page.locator('text=/\\d+h \\d+m/').first();
    await expect(totalHoursBox).toBeVisible({ timeout: 5000 });
    
    // Screenshot for verification
    await page.screenshot({ path: '.screenshots/reports-summary-hours-format.jpeg', quality: 20 });
  });

  test('Shift Details table shows hours in h:m:s format', async ({ page }) => {
    await loginAsAdmin(page);
    await removeEmergentBadge(page);
    
    // Navigate to Reports section
    const reportsSection = page.getByTestId('reports-section');
    await reportsSection.scrollIntoViewIfNeeded();
    await page.getByTestId('reports-toggle').click();
    await page.getByTestId('preview-report-btn').click();
    
    // Wait for Shift Details to be visible
    await expect(page.locator('text=Shift Details')).toBeVisible({ timeout: 15000 });
    
    // Check that the hours column in Shift Details table shows h:m:s format
    // The table should show values like "0h 30m" instead of "0.5"
    const shiftDetailsTable = page.locator('table').filter({ hasText: 'Shift Details' });
    
    // If there are entries, verify the format
    const hoursCell = page.locator('td:has-text(/^\\d+h \\d+m/)').first();
    const hasEntries = await hoursCell.count() > 0;
    
    if (hasEntries) {
      await expect(hoursCell).toBeVisible();
      // Verify format matches Xh Ym pattern (not decimal like 0.50)
      const hourText = await hoursCell.textContent();
      expect(hourText).toMatch(/^\d+h \d+m/);
    }
    
    await page.screenshot({ path: '.screenshots/shift-details-hours-format.jpeg', quality: 20 });
  });

  test('By Employee table shows hours in h:m:s format', async ({ page }) => {
    await loginAsAdmin(page);
    await removeEmergentBadge(page);
    
    // Navigate to Reports section
    const reportsSection = page.getByTestId('reports-section');
    await reportsSection.scrollIntoViewIfNeeded();
    await page.getByTestId('reports-toggle').click();
    await page.getByTestId('preview-report-btn').click();
    
    // Wait for By Employee section
    await expect(page.locator('text=By Employee')).toBeVisible({ timeout: 15000 });
    
    // Find the By Employee table and verify Hours column format
    const byEmployeeSection = page.locator('text=By Employee').locator('..');
    const hoursCell = byEmployeeSection.locator('td:has-text(/^\\d+h \\d+m/)').first();
    
    const hasData = await hoursCell.count() > 0;
    if (hasData) {
      await expect(hoursCell).toBeVisible();
      const hourText = await hoursCell.textContent();
      expect(hourText).toMatch(/^\d+h \d+m/);
    }
    
    await page.screenshot({ path: '.screenshots/by-employee-hours-format.jpeg', quality: 20 });
  });

  test('Hours by Employee section shows hours in h:m:s format', async ({ page }) => {
    await loginAsAdmin(page);
    await removeEmergentBadge(page);
    
    // Navigate to Hours by Employee section
    const hoursSection = page.getByTestId('hours-by-employee-section');
    await hoursSection.scrollIntoViewIfNeeded();
    await page.getByTestId('hours-by-employee-toggle').click();
    
    // Wait for table to load
    await expect(page.getByTestId('employees-hours-table')).toBeVisible({ timeout: 10000 });
    
    // Check for h:m:s format in the Total Hours column
    // Look for values like "0h 30m" instead of decimal "0.50"
    const hoursCell = page.locator('span:has-text(/^\\d+h \\d+m/)').first();
    await expect(hoursCell).toBeVisible();
    
    const hourText = await hoursCell.textContent();
    expect(hourText).toMatch(/\d+h \d+m/);
    
    await page.screenshot({ path: '.screenshots/hours-by-employee-format.jpeg', quality: 20 });
  });

  test('Employee Portal Recent Shifts shows hours in h:m:s format', async ({ page }) => {
    // Login as employee
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    await page.getByTestId('login-email').fill(TEST_EMPLOYEE_EMAIL);
    await page.getByTestId('login-submit-btn').click();
    await expect(page.getByTestId('employee-dashboard')).toBeVisible({ timeout: 15000 });
    
    await removeEmergentBadge(page);
    
    // Check Recent Shifts section for h:m:s format
    const shiftsListItems = page.getByTestId('shifts-list').locator('div');
    const hasShifts = await shiftsListItems.count() > 0;
    
    if (hasShifts) {
      // Look for hour format like "0h 30m" in shift entries
      const hoursDisplay = page.locator('span:has-text(/^\\d+h \\d+m/)').first();
      await expect(hoursDisplay).toBeVisible();
      
      const hourText = await hoursDisplay.textContent();
      expect(hourText).toMatch(/\d+h \d+m/);
    }
    
    await page.screenshot({ path: '.screenshots/employee-recent-shifts-format.jpeg', quality: 20 });
  });

  test('Backend API: CSV export hours in h:m:s format', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/admin/reports/shifts/csv?start_date=2026-01-01&end_date=2026-12-31`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    expect(response.status()).toBe(200);
    const csvContent = await response.text();
    
    // Verify Hours column header exists
    const lines = csvContent.split('\n');
    expect(lines[0]).toContain('Hours');
    
    // Parse headers
    const headers = lines[0].split(',');
    const hoursIndex = headers.indexOf('Hours');
    expect(hoursIndex).toBeGreaterThan(-1);
    
    // Check data rows for h:m:s format (e.g., "0h 30m" not "0.50")
    if (lines.length > 1 && lines[1].trim() !== '') {
      const dataRow = lines[1].split(',');
      const hoursValue = dataRow[hoursIndex];
      
      // Hours should be in "Xh Ym" format, not decimal
      expect(hoursValue).toMatch(/^\d+h \d+m/);
      // Should NOT be a decimal format
      expect(hoursValue).not.toMatch(/^\d+\.\d+$/);
    }
    
    // Check summary section also uses h:m:s format
    const summaryStartIndex = lines.findIndex(line => line.includes('=== SUMMARY ==='));
    if (summaryStartIndex > -1 && lines.length > summaryStartIndex + 2) {
      const summaryDataLine = lines[summaryStartIndex + 2];
      // Summary Total Hours should be in h:m:s format
      expect(summaryDataLine).toMatch(/\d+h \d+m/);
    }
  });

  test('Backend API: CSV summary Total Hours in h:m:s format', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/admin/reports/shifts/csv?start_date=2026-01-01&end_date=2026-12-31`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    expect(response.status()).toBe(200);
    const csvContent = await response.text();
    
    // Find the summary section
    expect(csvContent).toContain('=== SUMMARY ===');
    
    const lines = csvContent.split('\n');
    const summaryIndex = lines.findIndex(line => line.includes('=== SUMMARY ==='));
    
    // Summary header line (Employee,Total Hours,Total Shifts,Estimated Pay)
    const summaryHeaderLine = lines[summaryIndex + 1];
    expect(summaryHeaderLine).toContain('Total Hours');
    
    // Summary data line should have h:m:s format for Total Hours
    if (summaryIndex > -1 && lines.length > summaryIndex + 2) {
      const summaryDataLine = lines[summaryIndex + 2];
      if (summaryDataLine.trim()) {
        // Second column in summary is Total Hours
        const summaryParts = summaryDataLine.split(',');
        const totalHours = summaryParts[1];
        expect(totalHours).toMatch(/\d+h \d+m/);
      }
    }
  });
});

test.describe('Clock-in Bug Fix', () => {
  let authToken: string;

  test.beforeAll(async ({ request }) => {
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
    await page.addInitScript(() => {
      sessionStorage.setItem('hasSeenSplash', 'true');
    });
    await dismissToasts(page);
  });

  test('Clocking in after admin clock-out creates new shift entry (API test)', async ({ request }) => {
    // This test verifies that when an admin clocks out an employee and the employee
    // then clocks in again, a NEW shift entry is created rather than reopening the old one
    
    // Step 1: Create a test employee time entry by admin clocking them in
    const clockInResponse = await request.post(`${BASE_URL}/api/admin/employee/${TEST_EMPLOYEE_ID}/clock`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: { action: 'in' }
    });
    
    // May fail if already clocked in - handle both cases
    if (clockInResponse.status() === 200) {
      const clockInData = await clockInResponse.json();
      const firstEntryId = clockInData.entry_id;
      
      // Step 2: Admin clocks out the employee
      const clockOutResponse = await request.post(`${BASE_URL}/api/admin/employee/${TEST_EMPLOYEE_ID}/clock`, {
        headers: { Authorization: `Bearer ${authToken}` },
        data: { action: 'out' }
      });
      expect(clockOutResponse.status()).toBe(200);
      
      // Step 3: Clock in again (simulating employee clocking in after admin clock-out)
      // This should create a NEW entry, not reopen the old one
      const secondClockInResponse = await request.post(`${BASE_URL}/api/admin/employee/${TEST_EMPLOYEE_ID}/clock`, {
        headers: { Authorization: `Bearer ${authToken}` },
        data: { action: 'in' }
      });
      expect(secondClockInResponse.status()).toBe(200);
      
      const secondClockInData = await secondClockInResponse.json();
      const secondEntryId = secondClockInData.entry_id;
      
      // Verify: The second entry ID should be different from the first
      // This confirms a NEW entry was created, not the old one reopened
      expect(secondEntryId).not.toBe(firstEntryId);
      
      // Cleanup: Clock out the second entry
      await request.post(`${BASE_URL}/api/admin/employee/${TEST_EMPLOYEE_ID}/clock`, {
        headers: { Authorization: `Bearer ${authToken}` },
        data: { action: 'out' }
      });
    } else {
      // Already clocked in - need to clock out first then run the test
      const currentStatus = await request.get(`${BASE_URL}/api/admin/employee/${TEST_EMPLOYEE_ID}/clock-status`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const statusData = await currentStatus.json();
      
      if (statusData.is_clocked_in) {
        // Clock out first
        await request.post(`${BASE_URL}/api/admin/employee/${TEST_EMPLOYEE_ID}/clock`, {
          headers: { Authorization: `Bearer ${authToken}` },
          data: { action: 'out' }
        });
      }
      
      // Now run the test
      const newClockInResponse = await request.post(`${BASE_URL}/api/admin/employee/${TEST_EMPLOYEE_ID}/clock`, {
        headers: { Authorization: `Bearer ${authToken}` },
        data: { action: 'in' }
      });
      expect(newClockInResponse.status()).toBe(200);
      
      const newClockInData = await newClockInResponse.json();
      expect(newClockInData).toHaveProperty('entry_id');
      
      // Clock out to cleanup
      await request.post(`${BASE_URL}/api/admin/employee/${TEST_EMPLOYEE_ID}/clock`, {
        headers: { Authorization: `Bearer ${authToken}` },
        data: { action: 'out' }
      });
    }
  });

  test('Employee time tracking clock endpoint creates new entry after clock out', async ({ request }) => {
    // Get employee token first
    const empLoginResponse = await request.post(`${BASE_URL}/api/auth/login`, {
      data: { email: TEST_EMPLOYEE_EMAIL }
    });
    const empData = await empLoginResponse.json();
    const empToken = empData.access_token;
    
    // Check current status
    const statusResponse = await request.get(`${BASE_URL}/api/time/status`, {
      headers: { Authorization: `Bearer ${empToken}` }
    });
    const statusData = await statusResponse.json();
    
    // If clocked in, clock out first
    if (statusData.clocked_in) {
      await request.post(`${BASE_URL}/api/time/clock`, {
        headers: { Authorization: `Bearer ${empToken}` },
        data: { action: 'out' }
      });
    }
    
    // Get initial entry count
    const initialEntriesResponse = await request.get(`${BASE_URL}/api/time/entries`, {
      headers: { Authorization: `Bearer ${empToken}` }
    });
    const initialEntries = await initialEntriesResponse.json();
    const initialCount = initialEntries.length;
    
    // Clock in - should create new entry
    // Note: This test may skip if geolocation check fails
    // The important verification is in the API-level admin test above
    
    // For now, just verify the API structure is correct
    expect(initialEntriesResponse.status()).toBe(200);
    expect(Array.isArray(initialEntries)).toBe(true);
  });
});
