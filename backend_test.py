#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime
from pathlib import Path

class ThriftyCuratorAPITester:
    def __init__(self):
        # Use the public endpoint from frontend .env
        self.base_url = "https://inventory-hub-888.preview.emergentagent.com/api"
        self.token = None
        self.test_user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        print(f"🔗 Testing API at: {self.base_url}")

    def log_result(self, test_name, success, details="", expected_status=None, actual_status=None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            status = "✅ PASS"
        else:
            status = "❌ FAIL"
        
        result = {
            "test": test_name,
            "status": "PASS" if success else "FAIL",
            "details": details,
            "expected_status": expected_status,
            "actual_status": actual_status
        }
        self.test_results.append(result)
        
        print(f"{status} - {test_name}")
        if details:
            print(f"    Details: {details}")
        if not success and expected_status and actual_status:
            print(f"    Expected: {expected_status}, Got: {actual_status}")

    def make_request(self, method, endpoint, data=None, expected_status=200, test_name=None):
        """Make API request and return response"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)
            
            success = response.status_code == expected_status
            
            if test_name:
                try:
                    response_data = response.json() if response.content else {}
                except:
                    response_data = {}
                
                self.log_result(
                    test_name, 
                    success, 
                    f"Response: {response_data}" if success else f"Error: {response.text}",
                    expected_status,
                    response.status_code
                )
            
            return success, response.json() if response.content and success else {}
            
        except requests.exceptions.RequestException as e:
            if test_name:
                self.log_result(test_name, False, f"Request failed: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test basic API health"""
        print("\n📋 Testing API Health...")
        return self.make_request('GET', '', expected_status=200, test_name="API Health Check")

    def test_user_registration_employee(self):
        """Test user registration as employee"""
        print("\n👤 Testing Employee Registration...")
        timestamp = int(datetime.now().timestamp())
        
        user_data = {
            "name": f"Test Employee {timestamp}",
            "email": f"employee{timestamp}@test.com",
            "password": "testpass123",
            "role": "employee"
        }
        
        success, response = self.make_request(
            'POST', 'auth/register', user_data, 
            expected_status=200, 
            test_name="Employee Registration"
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.test_user_id = response['user']['id']
            return True, response
        return False, response

    def test_user_registration_admin(self):
        """Test admin user registration"""
        print("\n👨‍💼 Testing Admin Registration...")
        timestamp = int(datetime.now().timestamp())
        
        admin_data = {
            "name": f"Test Admin {timestamp}",
            "email": f"admin{timestamp}@test.com",
            "password": "testpass123",
            "role": "admin"
        }
        
        return self.make_request(
            'POST', 'auth/register', admin_data, 
            expected_status=200, 
            test_name="Admin Registration"
        )

    def test_user_login(self):
        """Test user login"""
        print("\n🔑 Testing Login...")
        # First register a user to login with
        timestamp = int(datetime.now().timestamp())
        
        register_data = {
            "name": f"Login Test User {timestamp}",
            "email": f"login{timestamp}@test.com", 
            "password": "testpass123",
            "role": "employee"
        }
        
        # Register user
        success, reg_response = self.make_request('POST', 'auth/register', register_data)
        if not success:
            self.log_result("Login Test - User Registration", False, "Failed to register test user")
            return False, {}
        
        # Now test login
        login_data = {
            "email": register_data["email"],
            "password": register_data["password"]
        }
        
        return self.make_request(
            'POST', 'auth/login', login_data,
            expected_status=200,
            test_name="User Login"
        )

    def test_get_current_user(self):
        """Test getting current user info"""
        print("\n👤 Testing Get Current User...")
        if not self.token:
            self.log_result("Get Current User", False, "No token available")
            return False, {}
        
        return self.make_request(
            'GET', 'auth/me', 
            expected_status=200,
            test_name="Get Current User Info"
        )

    def test_time_tracking_clock_in(self):
        """Test clocking in"""
        print("\n⏰ Testing Clock In...")
        if not self.token:
            self.log_result("Clock In", False, "No token available")
            return False, {}
        
        clock_data = {"action": "in"}
        return self.make_request(
            'POST', 'time/clock', clock_data,
            expected_status=200,
            test_name="Clock In"
        )

    def test_time_tracking_status(self):
        """Test getting clock status"""
        print("\n📊 Testing Clock Status...")
        if not self.token:
            self.log_result("Clock Status", False, "No token available")
            return False, {}
        
        return self.make_request(
            'GET', 'time/status',
            expected_status=200,
            test_name="Clock Status Check"
        )

    def test_time_tracking_clock_out(self):
        """Test clocking out"""
        print("\n⏰ Testing Clock Out...")
        if not self.token:
            self.log_result("Clock Out", False, "No token available")
            return False, {}
        
        clock_data = {"action": "out"}
        return self.make_request(
            'POST', 'time/clock', clock_data,
            expected_status=200,
            test_name="Clock Out"
        )

    def test_time_entries_and_summary(self):
        """Test getting time entries and summary"""
        print("\n📈 Testing Time Tracking Data...")
        if not self.token:
            self.log_result("Time Entries", False, "No token available")
            return False, {}
        
        # Test entries
        success1, _ = self.make_request(
            'GET', 'time/entries',
            expected_status=200,
            test_name="Get Time Entries"
        )
        
        # Test summary
        success2, _ = self.make_request(
            'GET', 'time/summary',
            expected_status=200,
            test_name="Get Time Summary"
        )
        
        return success1 and success2, {}

    def test_job_application_form(self):
        """Test job application form submission"""
        print("\n📄 Testing Job Application Form...")
        
        app_data = {
            "full_name": "Test Applicant",
            "email": "applicant@test.com",
            "phone": "555-123-4567",
            "resume_text": "Test resume experience",
            "why_join": "Test motivation",
            "availability": "Full-time"
        }
        
        return self.make_request(
            'POST', 'forms/job-application', app_data,
            expected_status=200,
            test_name="Job Application Submission"
        )

    def test_consignment_inquiry_form(self):
        """Test consignment inquiry form submission"""
        print("\n📋 Testing Consignment Inquiry Form...")
        
        inquiry_data = {
            "full_name": "Test Consigner",
            "email": "consigner@test.com",
            "phone": "555-123-4567",
            "item_description": "Designer handbag, excellent condition",
            "estimated_value": "100-250",
            "item_condition": "like-new"
        }
        
        return self.make_request(
            'POST', 'forms/consignment-inquiry', inquiry_data,
            expected_status=200,
            test_name="Consignment Inquiry Submission"
        )

    def test_consignment_agreement_form(self):
        """Test consignment agreement form submission"""
        print("\n📝 Testing Consignment Agreement Form...")
        
        agreement_data = {
            "full_name": "Test Agreement Signer",
            "email": "signer@test.com",
            "phone": "555-123-4567",
            "address": "123 Test St, Test City, TS 12345",
            "items_description": "Various designer items for consignment",
            "agreed_percentage": "60-40",
            "signature": "Test Agreement Signer",
            "agreed_to_terms": True
        }
        
        return self.make_request(
            'POST', 'forms/consignment-agreement', agreement_data,
            expected_status=200,
            test_name="Consignment Agreement Submission"
        )

    def test_admin_endpoints(self):
        """Test admin-only endpoints"""
        print("\n👨‍💼 Testing Admin Endpoints...")
        
        # First create an admin user
        timestamp = int(datetime.now().timestamp())
        admin_data = {
            "name": f"Admin Test {timestamp}",
            "email": f"admintest{timestamp}@test.com",
            "password": "testpass123",
            "role": "admin"
        }
        
        success, response = self.make_request('POST', 'auth/register', admin_data)
        if not success:
            self.log_result("Admin Test Setup", False, "Failed to create admin user")
            return False, {}
        
        # Store admin token
        admin_token = self.token
        self.token = response['access_token']
        
        # Test admin endpoints
        success1, _ = self.make_request(
            'GET', 'admin/employees',
            expected_status=200,
            test_name="Get All Employees (Admin)"
        )
        
        success2, _ = self.make_request(
            'GET', 'admin/time-entries',
            expected_status=200,
            test_name="Get All Time Entries (Admin)"
        )
        
        success3, _ = self.make_request(
            'GET', 'admin/summary',
            expected_status=200,
            test_name="Get Admin Summary"
        )
        
        # Restore original token
        self.token = admin_token
        return success1 and success2 and success3, {}

    def run_all_tests(self):
        """Run comprehensive test suite"""
        print("🚀 Starting Thrifty Curator API Tests")
        print("=" * 50)
        
        # Basic health check
        self.test_health_check()
        
        # Authentication tests
        self.test_user_registration_employee()
        self.test_user_registration_admin()
        self.test_user_login()
        self.test_get_current_user()
        
        # Time tracking tests
        self.test_time_tracking_clock_in()
        self.test_time_tracking_status()
        self.test_time_tracking_clock_out()
        self.test_time_entries_and_summary()
        
        # Form submission tests
        self.test_job_application_form()
        self.test_consignment_inquiry_form()
        self.test_consignment_agreement_form()
        
        # Admin tests
        self.test_admin_endpoints()
        
        # Print results
        print("\n" + "=" * 50)
        print("📊 TEST RESULTS")
        print("=" * 50)
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        # Save detailed results
        results_file = "/app/backend_test_results.json"
        with open(results_file, 'w') as f:
            json.dump({
                "summary": {
                    "total_tests": self.tests_run,
                    "passed": self.tests_passed,
                    "failed": self.tests_run - self.tests_passed,
                    "success_rate": round(self.tests_passed/self.tests_run*100, 1)
                },
                "test_results": self.test_results,
                "timestamp": datetime.now().isoformat()
            }, f, indent=2)
        
        print(f"\n📁 Detailed results saved to: {results_file}")
        
        return self.tests_passed == self.tests_run

if __name__ == "__main__":
    tester = ThriftyCuratorAPITester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)