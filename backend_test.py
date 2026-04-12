#!/usr/bin/env python3
"""
Backend API Testing for Nebraska State Patrol Violation Navigator
Tests all API endpoints for the violation search/filter application
"""

import requests
import sys
import json
from datetime import datetime

class ViolationAPITester:
    def __init__(self, base_url="https://violation-navigator.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            status = "✅ PASS"
        else:
            status = "❌ FAIL"
        
        result = {
            "test": name,
            "status": "PASS" if success else "FAIL",
            "details": details
        }
        self.test_results.append(result)
        print(f"{status} - {name}")
        if details:
            print(f"    {details}")

    def test_api_root(self):
        """Test API root endpoint"""
        try:
            response = requests.get(f"{self.api_url}/", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                details += f", Message: {data.get('message', 'N/A')}"
            self.log_test("API Root Endpoint", success, details)
            return success
        except Exception as e:
            self.log_test("API Root Endpoint", False, f"Error: {str(e)}")
            return False

    def test_violations_endpoint(self):
        """Test basic violations endpoint"""
        try:
            response = requests.get(f"{self.api_url}/violations", timeout=15)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                total = data.get('total', 0)
                violations_count = len(data.get('violations', []))
                details += f", Total: {total}, Returned: {violations_count}"
                
                # Check if we have the expected 1,597 records
                if total == 1597:
                    details += " (Expected count ✓)"
                else:
                    details += f" (Expected 1,597, got {total})"
                    
            self.log_test("GET /violations", success, details)
            return success, data if success else None
        except Exception as e:
            self.log_test("GET /violations", False, f"Error: {str(e)}")
            return False, None

    def test_keyword_search(self):
        """Test keyword search functionality"""
        test_keywords = ["brake", "tire", "driver", "hazmat"]
        
        for keyword in test_keywords:
            try:
                params = {"keyword": keyword}
                response = requests.get(f"{self.api_url}/violations", params=params, timeout=15)
                success = response.status_code == 200
                
                if success:
                    data = response.json()
                    total = data.get('total', 0)
                    details = f"Keyword '{keyword}': {total} results"
                else:
                    details = f"Status: {response.status_code}"
                    
                self.log_test(f"Keyword Search: {keyword}", success, details)
            except Exception as e:
                self.log_test(f"Keyword Search: {keyword}", False, f"Error: {str(e)}")

    def test_violation_class_filter(self):
        """Test violation class filtering"""
        test_classes = ["Driver", "Vehicle", "Hazardous Materials"]
        
        for vclass in test_classes:
            try:
                params = {"violation_class": vclass}
                response = requests.get(f"{self.api_url}/violations", params=params, timeout=15)
                success = response.status_code == 200
                
                if success:
                    data = response.json()
                    total = data.get('total', 0)
                    details = f"Class '{vclass}': {total} results"
                else:
                    details = f"Status: {response.status_code}"
                    
                self.log_test(f"Violation Class Filter: {vclass}", success, details)
            except Exception as e:
                self.log_test(f"Violation Class Filter: {vclass}", False, f"Error: {str(e)}")

    def test_oos_filter(self):
        """Test OOS (Out of Service) filtering"""
        for oos_value in ["Y", "N"]:
            try:
                params = {"oos": oos_value}
                response = requests.get(f"{self.api_url}/violations", params=params, timeout=15)
                success = response.status_code == 200
                
                if success:
                    data = response.json()
                    total = data.get('total', 0)
                    details = f"OOS '{oos_value}': {total} results"
                else:
                    details = f"Status: {response.status_code}"
                    
                self.log_test(f"OOS Filter: {oos_value}", success, details)
            except Exception as e:
                self.log_test(f"OOS Filter: {oos_value}", False, f"Error: {str(e)}")

    def test_hazmat_filter(self):
        """Test HazMat filtering"""
        for hazmat_value in ["Y", "N"]:
            try:
                params = {"hazmat": hazmat_value}
                response = requests.get(f"{self.api_url}/violations", params=params, timeout=15)
                success = response.status_code == 200
                
                if success:
                    data = response.json()
                    total = data.get('total', 0)
                    details = f"HazMat '{hazmat_value}': {total} results"
                else:
                    details = f"Status: {response.status_code}"
                    
                self.log_test(f"HazMat Filter: {hazmat_value}", success, details)
            except Exception as e:
                self.log_test(f"HazMat Filter: {hazmat_value}", False, f"Error: {str(e)}")

    def test_level_iii_filter(self):
        """Test Level III filtering"""
        for level_value in ["Y", "N"]:
            try:
                params = {"level_iii": level_value}
                response = requests.get(f"{self.api_url}/violations", params=params, timeout=15)
                success = response.status_code == 200
                
                if success:
                    data = response.json()
                    total = data.get('total', 0)
                    details = f"Level III '{level_value}': {total} results"
                else:
                    details = f"Status: {response.status_code}"
                    
                self.log_test(f"Level III Filter: {level_value}", success, details)
            except Exception as e:
                self.log_test(f"Level III Filter: {level_value}", False, f"Error: {str(e)}")

    def test_critical_filter(self):
        """Test Critical filtering"""
        for critical_value in ["Y", "N"]:
            try:
                params = {"critical": critical_value}
                response = requests.get(f"{self.api_url}/violations", params=params, timeout=15)
                success = response.status_code == 200
                
                if success:
                    data = response.json()
                    total = data.get('total', 0)
                    details = f"Critical '{critical_value}': {total} results"
                else:
                    details = f"Status: {response.status_code}"
                    
                self.log_test(f"Critical Filter: {critical_value}", success, details)
            except Exception as e:
                self.log_test(f"Critical Filter: {critical_value}", False, f"Error: {str(e)}")

    def test_pagination(self):
        """Test pagination functionality"""
        try:
            # Test first page
            params = {"page": 1, "page_size": 10}
            response = requests.get(f"{self.api_url}/violations", params=params, timeout=15)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                page = data.get('page', 0)
                page_size = data.get('page_size', 0)
                total_pages = data.get('total_pages', 0)
                violations_count = len(data.get('violations', []))
                details = f"Page {page}, Size {page_size}, Total Pages {total_pages}, Returned {violations_count}"
            else:
                details = f"Status: {response.status_code}"
                
            self.log_test("Pagination", success, details)
            
            # Test second page if available
            if success and data.get('total_pages', 0) > 1:
                params = {"page": 2, "page_size": 10}
                response = requests.get(f"{self.api_url}/violations", params=params, timeout=15)
                success2 = response.status_code == 200
                self.log_test("Pagination Page 2", success2, f"Status: {response.status_code}")
                
        except Exception as e:
            self.log_test("Pagination", False, f"Error: {str(e)}")

    def test_filter_options(self):
        """Test filter options endpoint"""
        try:
            response = requests.get(f"{self.api_url}/violations/filters", timeout=10)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                violation_classes = len(data.get('violation_classes', []))
                oos_values = len(data.get('oos_values', []))
                details = f"Classes: {violation_classes}, OOS Values: {oos_values}"
            else:
                details = f"Status: {response.status_code}"
                
            self.log_test("GET /violations/filters", success, details)
            return success, data if success else None
        except Exception as e:
            self.log_test("GET /violations/filters", False, f"Error: {str(e)}")
            return False, None

    def test_stats_endpoint(self):
        """Test statistics endpoint"""
        try:
            response = requests.get(f"{self.api_url}/violations/stats", timeout=10)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                total = data.get('total', 0)
                oos_count = data.get('oos_count', 0)
                hazmat_count = data.get('hazmat_count', 0)
                details = f"Total: {total}, OOS: {oos_count}, HazMat: {hazmat_count}"
                
                # Check if stats match expected values
                if total == 1597:
                    details += " (Expected total ✓)"
                else:
                    details += f" (Expected 1,597 total)"
                    
            else:
                details = f"Status: {response.status_code}"
                
            self.log_test("GET /violations/stats", success, details)
            return success, data if success else None
        except Exception as e:
            self.log_test("GET /violations/stats", False, f"Error: {str(e)}")
            return False, None

    def test_smart_search(self):
        """Test AI-powered smart search"""
        test_queries = [
            "brake problems",
            "tire safety",
            "driver fatigue",
            "hazardous materials"
        ]
        
        for query in test_queries:
            try:
                payload = {"query": query}
                response = requests.post(
                    f"{self.api_url}/violations/smart-search", 
                    json=payload, 
                    timeout=30  # AI search might take longer
                )
                success = response.status_code == 200
                
                if success:
                    data = response.json()
                    total = data.get('total', 0)
                    expanded_terms = data.get('expanded_terms', [])
                    details = f"Query '{query}': {total} results, {len(expanded_terms)} expanded terms"
                else:
                    details = f"Status: {response.status_code}"
                    if response.status_code != 200:
                        try:
                            error_data = response.json()
                            details += f", Error: {error_data}"
                        except:
                            details += f", Response: {response.text[:100]}"
                    
                self.log_test(f"Smart Search: {query}", success, details)
            except Exception as e:
                self.log_test(f"Smart Search: {query}", False, f"Error: {str(e)}")

    def test_combined_filters(self):
        """Test multiple filters combined"""
        try:
            params = {
                "keyword": "brake",
                "violation_class": "Vehicle",
                "oos": "Y"
            }
            response = requests.get(f"{self.api_url}/violations", params=params, timeout=15)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                total = data.get('total', 0)
                details = f"Combined filters: {total} results"
            else:
                details = f"Status: {response.status_code}"
                
            self.log_test("Combined Filters", success, details)
        except Exception as e:
            self.log_test("Combined Filters", False, f"Error: {str(e)}")

    def test_sorting_functionality(self):
        """Test sorting functionality"""
        sort_tests = [
            ("oos", "desc"),
            ("violation_class", "asc"),
            ("regulatory_reference", "desc"),
            ("violation_text", "asc"),
            ("level_iii", "desc"),
            ("critical", "asc"),
            ("violation_code", "desc"),
            ("cfr_part", "asc")
        ]
        
        for sort_by, sort_dir in sort_tests:
            try:
                params = {
                    "sort_by": sort_by,
                    "sort_dir": sort_dir,
                    "page_size": 5  # Small page size for testing
                }
                response = requests.get(f"{self.api_url}/violations", params=params, timeout=15)
                success = response.status_code == 200
                
                if success:
                    data = response.json()
                    violations = data.get('violations', [])
                    details = f"Sort by {sort_by} {sort_dir}: {len(violations)} results returned"
                    
                    # Verify sorting is applied by checking if we get results
                    if len(violations) > 0:
                        details += " ✓"
                    else:
                        details += " (no results to verify sort order)"
                else:
                    details = f"Status: {response.status_code}"
                    
                self.log_test(f"Sort: {sort_by} {sort_dir}", success, details)
            except Exception as e:
                self.log_test(f"Sort: {sort_by} {sort_dir}", False, f"Error: {str(e)}")

    def test_similar_violations_endpoint(self):
        """Test similar violations endpoint"""
        # First get a violation ID to test with
        try:
            response = requests.get(f"{self.api_url}/violations", params={"page_size": 1}, timeout=15)
            if response.status_code != 200:
                self.log_test("Similar Violations Setup", False, "Could not get violation ID for testing")
                return
                
            data = response.json()
            violations = data.get('violations', [])
            if not violations:
                self.log_test("Similar Violations Setup", False, "No violations found for testing")
                return
                
            violation_id = violations[0].get('id')
            if not violation_id:
                self.log_test("Similar Violations Setup", False, "Violation ID not found")
                return
                
            # Test the similar violations endpoint
            response = requests.get(f"{self.api_url}/violations/{violation_id}/similar", timeout=15)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                similar_violations = data.get('violations', [])
                total = data.get('total', 0)
                source = data.get('source')
                details = f"Found {total} similar violations, returned {len(similar_violations)}"
                
                if source:
                    details += f", source violation: {source.get('regulatory_reference', 'N/A')}"
                else:
                    details += ", no source violation returned"
            else:
                details = f"Status: {response.status_code}"
                try:
                    error_data = response.json()
                    details += f", Error: {error_data}"
                except:
                    details += f", Response: {response.text[:100]}"
                    
            self.log_test("Similar Violations Endpoint", success, details)
            
        except Exception as e:
            self.log_test("Similar Violations Endpoint", False, f"Error: {str(e)}")

    def run_all_tests(self):
        """Run all backend API tests"""
        print("🚀 Starting Nebraska State Patrol Violation Navigator API Tests")
        print(f"Testing against: {self.api_url}")
        print("=" * 60)
        
        # Basic connectivity
        if not self.test_api_root():
            print("❌ API root endpoint failed - stopping tests")
            return False
            
        # Core functionality
        violations_success, violations_data = self.test_violations_endpoint()
        if not violations_success:
            print("❌ Basic violations endpoint failed - stopping tests")
            return False
            
        # Search and filter tests
        self.test_keyword_search()
        self.test_violation_class_filter()
        self.test_oos_filter()
        self.test_hazmat_filter()
        self.test_level_iii_filter()
        self.test_critical_filter()
        self.test_combined_filters()
        
        # New sorting functionality
        self.test_sorting_functionality()
        
        # New similar violations endpoint
        self.test_similar_violations_endpoint()
        
        # Pagination
        self.test_pagination()
        
        # Metadata endpoints
        self.test_filter_options()
        self.test_stats_endpoint()
        
        # AI functionality
        self.test_smart_search()
        
        # Print summary
        print("=" * 60)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"📈 Success Rate: {success_rate:.1f}%")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return True
        else:
            print("⚠️  Some tests failed - check details above")
            return False

def main():
    """Main test execution"""
    tester = ViolationAPITester()
    success = tester.run_all_tests()
    
    # Save test results
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    results_file = f"/app/backend_test_results_{timestamp}.json"
    
    with open(results_file, 'w') as f:
        json.dump({
            "timestamp": timestamp,
            "total_tests": tester.tests_run,
            "passed_tests": tester.tests_passed,
            "success_rate": (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0,
            "test_results": tester.test_results
        }, f, indent=2)
    
    print(f"\n📄 Detailed results saved to: {results_file}")
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())