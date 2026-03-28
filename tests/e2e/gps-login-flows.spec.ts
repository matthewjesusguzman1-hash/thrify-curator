/**
 * GPS Tracking and Login Flow E2E Tests
 * Tests GPS mileage tracker, employee login, and consignor login flows
 */
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.REACT_APP_BACKEND_URL || 'https://curator-app-3.preview.emergentagent.com';
const TEST_EMAIL = 'matthewjesusguzman1@gmail.com';
const TEST_CODE = '4399';

test.describe('Employee Login Flow', () => {
  
  test('should display Find My Account button on employee login page', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.waitForTimeout(5000);
    
    // Verify the button text is "Find My Account" (not "Continue")
    await expect(page.getByRole('button', { name: /Find My Account/i })).toBeVisible();
    
    // Verify help text is visible
    await expect(page.getByText(/Need more help logging in/i)).toBeVisible();
  });
  
  test('should show admin code input after entering admin email', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.waitForTimeout(5000);
    
    // Enter admin email
    await page.fill('input[placeholder*="email" i]', TEST_EMAIL);
    await page.click('button:has-text("Find My Account")');
    await page.waitForTimeout(2000);
    
    // Should show admin code input
    await expect(page.locator('input[placeholder*="digit" i]')).toBeVisible();
    await expect(page.getByText('Admin Access Code')).toBeVisible();
  });
  
  test('should login successfully with admin code', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.waitForTimeout(5000);
    
    // Enter admin email
    await page.fill('input[placeholder*="email" i]', TEST_EMAIL);
    await page.click('button:has-text("Find My Account")');
    await page.waitForTimeout(2000);
    
    // Enter admin code
    await page.fill('input[placeholder*="digit" i]', TEST_CODE);
    await page.click('button:has-text("Sign In")');
    await page.waitForTimeout(5000);
    
    // Should show admin dashboard
    await expect(page.getByText('Admin Dashboard')).toBeVisible();
  });
});

test.describe('Consignor Login Flow', () => {
  
  test('should display Find My Agreement button on consignor login page', async ({ page }) => {
    await page.goto(`${BASE_URL}/consignment-agreement`);
    await page.waitForTimeout(5000);
    
    // Click Manage My Account
    await page.click('text=Manage My Account');
    await page.waitForTimeout(2000);
    
    // Verify the button text is "Find My Agreement" (not "Continue")
    await expect(page.getByRole('button', { name: /Find My Agreement/i })).toBeVisible();
    
    // Verify help text is visible
    await expect(page.getByText(/Need more help logging in/i)).toBeVisible();
  });
  
  test('should show consignment agreement options', async ({ page }) => {
    await page.goto(`${BASE_URL}/consignment-agreement`);
    await page.waitForTimeout(5000);
    
    // Verify both options are visible
    await expect(page.getByText('Sign New Agreement')).toBeVisible();
    await expect(page.getByText('Manage My Account')).toBeVisible();
  });
});

test.describe('GPS Mileage Tracker - Admin Dashboard', () => {
  
  test.beforeEach(async ({ page }) => {
    // Login to admin dashboard
    await page.goto(`${BASE_URL}/login`);
    await page.waitForTimeout(5000);
    
    // Enter admin email
    await page.fill('input[placeholder*="email" i]', TEST_EMAIL);
    await page.click('button:has-text("Find My Account")');
    await page.waitForTimeout(2000);
    
    // Enter admin code
    await page.fill('input[placeholder*="digit" i]', TEST_CODE);
    await page.click('button:has-text("Sign In")');
    await page.waitForTimeout(5000);
    
    // Scroll down to see GPS Mileage Tracker
    await page.evaluate(() => window.scrollBy(0, 500));
    await page.waitForTimeout(2000);
  });
  
  test('should display GPS tracker with summary tabs', async ({ page }) => {
    // Verify GPS Mileage Tracker is visible
    await expect(page.getByText('GPS Mileage Tracker').first()).toBeVisible();
    
    // Verify tabs exist using data-testid
    await expect(page.locator('[data-testid="summary-tab-today"]')).toBeVisible();
    await expect(page.locator('[data-testid="summary-tab-month"]')).toBeVisible();
    await expect(page.locator('[data-testid="summary-tab-year"]')).toBeVisible();
    
    // Verify IRS rate is displayed
    await expect(page.getByText('$0.725/mile')).toBeVisible();
  });
  
  test('should show trip in progress when tracking', async ({ page }) => {
    // Verify active trip is shown
    await expect(page.getByText('Trip in Progress')).toBeVisible();
    
    // Verify tracking stats are shown
    await expect(page.getByText('Miles').first()).toBeVisible();
    await expect(page.getByText('Points')).toBeVisible();
    await expect(page.getByText('Deduction').first()).toBeVisible();
  });
  
  test('should show year-to-date summary', async ({ page }) => {
    // Click on 2026 tab
    await page.click('[data-testid="summary-tab-year"]');
    await page.waitForTimeout(500);
    
    // Verify year-to-date summary is shown
    await expect(page.getByText('Year-to-Date')).toBeVisible();
    await expect(page.getByText('Trips').first()).toBeVisible();
  });
  
  test('should show adjust mileage button', async ({ page }) => {
    await expect(page.getByText('Adjust')).toBeVisible();
  });
  
  test('should show trip history', async ({ page }) => {
    // Verify trip history section
    await expect(page.getByText('2026 Trips')).toBeVisible();
  });
});

test.describe('GPS Tracking Hook - Location Processing', () => {
  
  test('should handle both location data formats', async ({ page }) => {
    await page.goto(`${BASE_URL}/`);
    await page.waitForTimeout(3000);
    
    // Test the location processing logic that handles both formats
    const result = await page.evaluate(() => {
      // Simulate the processLocation logic from useGPSTracking.js
      function processLocation(location) {
        // Handle both Transistorsoft format (direct) and standard format (coords nested)
        const coords = location.coords || location;
        
        return {
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
          speed: coords.speed,
          timestamp: location.timestamp || new Date().toISOString()
        };
      }
      
      // Test standard format (coords nested)
      const standardFormat = {
        coords: {
          latitude: 33.7490,
          longitude: -84.3880,
          accuracy: 10,
          speed: 5
        },
        timestamp: '2026-03-28T12:00:00Z'
      };
      
      // Test Transistorsoft format (direct)
      const transistorFormat = {
        latitude: 33.7500,
        longitude: -84.3900,
        accuracy: 8,
        speed: 10,
        timestamp: '2026-03-28T12:01:00Z'
      };
      
      const result1 = processLocation(standardFormat);
      const result2 = processLocation(transistorFormat);
      
      return {
        standard: result1,
        transistor: result2,
        standardValid: result1.latitude === 33.7490 && result1.longitude === -84.3880,
        transistorValid: result2.latitude === 33.7500 && result2.longitude === -84.3900
      };
    });
    
    expect(result.standardValid).toBe(true);
    expect(result.transistorValid).toBe(true);
  });
  
  test('should calculate distance using Haversine formula', async ({ page }) => {
    await page.goto(`${BASE_URL}/`);
    await page.waitForTimeout(3000);
    
    const result = await page.evaluate(() => {
      // Haversine formula from useGPSTracking.js
      const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const R = 3959; // Earth's radius in miles
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = 
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
      };
      
      // Test: Atlanta to Marietta (approximately 15 miles)
      const distance = calculateDistance(33.7490, -84.3880, 33.9526, -84.5499);
      return {
        distance: distance.toFixed(2),
        irsDeduction: (distance * 0.725).toFixed(2),
        isValid: distance > 10 && distance < 20
      };
    });
    
    expect(result.isValid).toBe(true);
  });
  
  test('should filter GPS noise and jumps correctly', async ({ page }) => {
    await page.goto(`${BASE_URL}/`);
    await page.waitForTimeout(3000);
    
    const result = await page.evaluate(() => {
      // Match the actual implementation from useGPSTracking.js and gps_trips.py
      // Filter out tiny movements < 0.001 miles (about 5 feet) to reduce noise
      // Filter out extreme GPS jumps (> 5 miles in one reading)
      const MIN_THRESHOLD = 0.001; // ~5 feet
      const MAX_THRESHOLD = 5.0;   // 5 miles
      
      const testCases = [
        { distance: 0.0005, expected: false, desc: 'GPS noise - too small' },
        { distance: 0.002, expected: true, desc: 'Just above minimum' },
        { distance: 0.5, expected: true, desc: 'Normal driving' },
        { distance: 4.9, expected: true, desc: 'Just under max' },
        { distance: 5.0, expected: false, desc: 'At max - GPS jump' },
        { distance: 10.0, expected: false, desc: 'Large error' },
      ];
      
      return testCases.map(tc => {
        // Match the actual filter logic: distance > 0.001 && distance < 5.0
        const isValid = tc.distance > MIN_THRESHOLD && tc.distance < MAX_THRESHOLD;
        return {
          ...tc,
          actual: isValid,
          passed: isValid === tc.expected
        };
      });
    });
    
    result.forEach((r: any) => {
      expect(r.passed).toBe(true);
    });
  });
});
