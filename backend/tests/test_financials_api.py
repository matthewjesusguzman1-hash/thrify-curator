"""
Test suite for Financials API endpoints
Tests Income, COGS, Expenses, Mileage, Tax Prep Progress, and Summary endpoints
"""
import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test year to avoid conflicts with production data
TEST_YEAR = 2099


class TestFinancialsIncomeAPI:
    """Tests for Income endpoints"""
    
    created_ids = []
    
    @pytest.fixture(autouse=True)
    def setup_and_teardown(self):
        """Setup and teardown for each test"""
        yield
        # Cleanup created entries
        for entry_id in self.created_ids:
            try:
                requests.delete(f"{BASE_URL}/api/financials/income/{entry_id}")
            except:
                pass
        self.created_ids.clear()
    
    def test_get_income_empty_year(self):
        """Test getting income for a year with no data"""
        response = requests.get(f"{BASE_URL}/api/financials/income/{TEST_YEAR}")
        assert response.status_code == 200
        data = response.json()
        assert "entries" in data
        assert "total_1099" in data
        assert "total_other" in data
        assert "total" in data
    
    def test_create_1099_income(self):
        """Test creating a 1099 income entry"""
        payload = {
            "year": TEST_YEAR,
            "platform": "ebay",
            "amount": 1000.50,
            "is_1099": True,
            "date_received": "2025-01-15",
            "notes": "TEST_1099_income"
        }
        response = requests.post(
            f"{BASE_URL}/api/financials/income",
            json=payload
        )
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Income entry created"
        assert "entry" in data
        entry = data["entry"]
        assert entry["amount"] == 1000.50
        assert entry["is_1099"] == True
        assert entry["platform"] == "ebay"
        self.created_ids.append(entry["id"])
        
        # Verify via GET
        get_response = requests.get(f"{BASE_URL}/api/financials/income/{TEST_YEAR}")
        assert get_response.status_code == 200
        get_data = get_response.json()
        assert get_data["total_1099"] == 1000.50
    
    def test_create_other_income(self):
        """Test creating non-1099 income entry"""
        payload = {
            "year": TEST_YEAR,
            "platform": "poshmark",
            "amount": 500.00,
            "is_1099": False,
            "notes": "TEST_other_income"
        }
        response = requests.post(
            f"{BASE_URL}/api/financials/income",
            json=payload
        )
        assert response.status_code == 200
        data = response.json()
        entry = data["entry"]
        assert entry["is_1099"] == False
        self.created_ids.append(entry["id"])
        
        # Verify via GET
        get_response = requests.get(f"{BASE_URL}/api/financials/income/{TEST_YEAR}")
        get_data = get_response.json()
        assert get_data["total_other"] == 500.00
    
    def test_update_income(self):
        """Test updating an income entry"""
        # Create first
        payload = {
            "year": TEST_YEAR,
            "platform": "mercari",
            "amount": 200.00,
            "is_1099": False,
            "notes": "TEST_update_income"
        }
        create_response = requests.post(f"{BASE_URL}/api/financials/income", json=payload)
        entry_id = create_response.json()["entry"]["id"]
        self.created_ids.append(entry_id)
        
        # Update
        update_payload = {
            "year": TEST_YEAR,
            "platform": "mercari",
            "amount": 300.00,
            "is_1099": False,
            "notes": "TEST_updated_income"
        }
        update_response = requests.put(
            f"{BASE_URL}/api/financials/income/{entry_id}",
            json=update_payload
        )
        assert update_response.status_code == 200
        
        # Verify via GET
        get_response = requests.get(f"{BASE_URL}/api/financials/income/{TEST_YEAR}")
        get_data = get_response.json()
        updated_entry = next((e for e in get_data["entries"] if e["id"] == entry_id), None)
        assert updated_entry is not None
        assert updated_entry["amount"] == 300.00
    
    def test_delete_income(self):
        """Test deleting an income entry"""
        # Create first
        payload = {
            "year": TEST_YEAR,
            "platform": "etsy",
            "amount": 150.00,
            "is_1099": False,
            "notes": "TEST_delete_income"
        }
        create_response = requests.post(f"{BASE_URL}/api/financials/income", json=payload)
        entry_id = create_response.json()["entry"]["id"]
        
        # Delete
        delete_response = requests.delete(f"{BASE_URL}/api/financials/income/{entry_id}")
        assert delete_response.status_code == 200
        
        # Verify deleted via GET
        get_response = requests.get(f"{BASE_URL}/api/financials/income/{TEST_YEAR}")
        get_data = get_response.json()
        deleted_entry = next((e for e in get_data["entries"] if e["id"] == entry_id), None)
        assert deleted_entry is None
    
    def test_delete_nonexistent_income(self):
        """Test deleting a non-existent income entry returns 404"""
        fake_id = str(uuid.uuid4())
        response = requests.delete(f"{BASE_URL}/api/financials/income/{fake_id}")
        assert response.status_code == 404


class TestFinancialsCOGSAPI:
    """Tests for COGS (Cost of Goods Sold) endpoints"""
    
    created_ids = []
    
    @pytest.fixture(autouse=True)
    def setup_and_teardown(self):
        yield
        for entry_id in self.created_ids:
            try:
                requests.delete(f"{BASE_URL}/api/financials/cogs/{entry_id}")
            except:
                pass
        self.created_ids.clear()
    
    def test_get_cogs_empty_year(self):
        """Test getting COGS for a year with no data"""
        response = requests.get(f"{BASE_URL}/api/financials/cogs/{TEST_YEAR}")
        assert response.status_code == 200
        data = response.json()
        assert "entries" in data
        assert "total" in data
    
    def test_create_cogs(self):
        """Test creating a COGS entry"""
        payload = {
            "year": TEST_YEAR,
            "date": "2025-02-01",
            "source": "TEST_Estate Sale",
            "description": "Vintage items",
            "amount": 150.00,
            "item_count": 10
        }
        response = requests.post(f"{BASE_URL}/api/financials/cogs", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "COGS entry created"
        entry = data["entry"]
        assert entry["amount"] == 150.00
        assert entry["source"] == "TEST_Estate Sale"
        assert entry["item_count"] == 10
        self.created_ids.append(entry["id"])
        
        # Verify via GET
        get_response = requests.get(f"{BASE_URL}/api/financials/cogs/{TEST_YEAR}")
        get_data = get_response.json()
        assert get_data["total"] == 150.00
    
    def test_update_cogs(self):
        """Test updating a COGS entry"""
        # Create first
        payload = {
            "year": TEST_YEAR,
            "date": "2025-03-01",
            "source": "TEST_Goodwill",
            "amount": 50.00
        }
        create_response = requests.post(f"{BASE_URL}/api/financials/cogs", json=payload)
        entry_id = create_response.json()["entry"]["id"]
        self.created_ids.append(entry_id)
        
        # Update
        update_payload = {
            "year": TEST_YEAR,
            "date": "2025-03-01",
            "source": "TEST_Goodwill Updated",
            "amount": 75.00
        }
        update_response = requests.put(
            f"{BASE_URL}/api/financials/cogs/{entry_id}",
            json=update_payload
        )
        assert update_response.status_code == 200
        
        # Verify via GET
        get_response = requests.get(f"{BASE_URL}/api/financials/cogs/{TEST_YEAR}")
        get_data = get_response.json()
        updated_entry = next((e for e in get_data["entries"] if e["id"] == entry_id), None)
        assert updated_entry["amount"] == 75.00
    
    def test_delete_cogs(self):
        """Test deleting a COGS entry"""
        payload = {
            "year": TEST_YEAR,
            "date": "2025-04-01",
            "source": "TEST_Delete COGS",
            "amount": 25.00
        }
        create_response = requests.post(f"{BASE_URL}/api/financials/cogs", json=payload)
        entry_id = create_response.json()["entry"]["id"]
        
        delete_response = requests.delete(f"{BASE_URL}/api/financials/cogs/{entry_id}")
        assert delete_response.status_code == 200
        
        # Verify deleted
        get_response = requests.get(f"{BASE_URL}/api/financials/cogs/{TEST_YEAR}")
        get_data = get_response.json()
        deleted_entry = next((e for e in get_data["entries"] if e["id"] == entry_id), None)
        assert deleted_entry is None


class TestFinancialsExpensesAPI:
    """Tests for Expenses endpoints"""
    
    created_ids = []
    
    @pytest.fixture(autouse=True)
    def setup_and_teardown(self):
        yield
        for entry_id in self.created_ids:
            try:
                requests.delete(f"{BASE_URL}/api/financials/expenses/{entry_id}")
            except:
                pass
        self.created_ids.clear()
    
    def test_get_expenses_empty_year(self):
        """Test getting expenses for a year with no data"""
        response = requests.get(f"{BASE_URL}/api/financials/expenses/{TEST_YEAR}")
        assert response.status_code == 200
        data = response.json()
        assert "entries" in data
        assert "by_category" in data
        assert "total" in data
        assert "count" in data
    
    def test_create_expense(self):
        """Test creating an expense entry"""
        payload = {
            "year": TEST_YEAR,
            "category": "shipping_supplies",
            "amount": 45.99,
            "date": "2025-03-15",
            "description": "TEST_Poly mailers"
        }
        response = requests.post(f"{BASE_URL}/api/financials/expenses", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Expense entry created"
        entry = data["entry"]
        assert entry["amount"] == 45.99
        assert entry["category"] == "shipping_supplies"
        self.created_ids.append(entry["id"])
        
        # Verify via GET
        get_response = requests.get(f"{BASE_URL}/api/financials/expenses/{TEST_YEAR}")
        get_data = get_response.json()
        assert get_data["total"] == 45.99
        assert "shipping_supplies" in get_data["by_category"]
    
    def test_get_expenses_summary(self):
        """Test getting expense summary by category"""
        # Create expense first
        payload = {
            "year": TEST_YEAR,
            "category": "software_subscriptions",
            "amount": 29.99,
            "date": "2025-03-20",
            "description": "TEST_Software"
        }
        create_response = requests.post(f"{BASE_URL}/api/financials/expenses", json=payload)
        entry_id = create_response.json()["entry"]["id"]
        self.created_ids.append(entry_id)
        
        # Get summary
        response = requests.get(f"{BASE_URL}/api/financials/expenses/{TEST_YEAR}/summary")
        assert response.status_code == 200
        data = response.json()
        assert "summary" in data
        assert "total" in data
        
        # Find software_subscriptions in summary
        software_cat = next((s for s in data["summary"] if s["category"] == "software_subscriptions"), None)
        assert software_cat is not None
        assert software_cat["total"] == 29.99
    
    def test_update_expense(self):
        """Test updating an expense entry"""
        payload = {
            "year": TEST_YEAR,
            "category": "equipment",
            "amount": 100.00,
            "date": "2025-04-01",
            "description": "TEST_Camera"
        }
        create_response = requests.post(f"{BASE_URL}/api/financials/expenses", json=payload)
        entry_id = create_response.json()["entry"]["id"]
        self.created_ids.append(entry_id)
        
        update_payload = {
            "year": TEST_YEAR,
            "category": "equipment",
            "amount": 150.00,
            "date": "2025-04-01",
            "description": "TEST_Camera Updated"
        }
        update_response = requests.put(
            f"{BASE_URL}/api/financials/expenses/{entry_id}",
            json=update_payload
        )
        assert update_response.status_code == 200
        
        # Verify
        get_response = requests.get(f"{BASE_URL}/api/financials/expenses/{TEST_YEAR}")
        get_data = get_response.json()
        updated_entry = next((e for e in get_data["entries"] if e["id"] == entry_id), None)
        assert updated_entry["amount"] == 150.00
    
    def test_delete_expense(self):
        """Test deleting an expense entry"""
        payload = {
            "year": TEST_YEAR,
            "category": "office_supplies",
            "amount": 20.00,
            "date": "2025-05-01",
            "description": "TEST_Delete expense"
        }
        create_response = requests.post(f"{BASE_URL}/api/financials/expenses", json=payload)
        entry_id = create_response.json()["entry"]["id"]
        
        delete_response = requests.delete(f"{BASE_URL}/api/financials/expenses/{entry_id}")
        assert delete_response.status_code == 200
        
        # Verify deleted
        get_response = requests.get(f"{BASE_URL}/api/financials/expenses/{TEST_YEAR}")
        get_data = get_response.json()
        deleted_entry = next((e for e in get_data["entries"] if e["id"] == entry_id), None)
        assert deleted_entry is None


class TestFinancialsMileageAPI:
    """Tests for Mileage endpoints"""
    
    created_ids = []
    
    @pytest.fixture(autouse=True)
    def setup_and_teardown(self):
        yield
        for entry_id in self.created_ids:
            try:
                requests.delete(f"{BASE_URL}/api/financials/mileage/{entry_id}")
            except:
                pass
        self.created_ids.clear()
    
    def test_get_mileage_empty_year(self):
        """Test getting mileage for a year with no data"""
        response = requests.get(f"{BASE_URL}/api/financials/mileage/{TEST_YEAR}")
        assert response.status_code == 200
        data = response.json()
        assert "entries" in data
        assert "total_miles" in data
        assert "irs_rate" in data
        assert "deduction" in data
    
    def test_create_mileage(self):
        """Test creating a mileage entry"""
        payload = {
            "year": TEST_YEAR,
            "date": "2025-03-10",
            "miles": 25.5,
            "purpose": "TEST_Sourcing trip"
        }
        response = requests.post(f"{BASE_URL}/api/financials/mileage", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Mileage entry created"
        entry = data["entry"]
        assert entry["miles"] == 25.5
        assert entry["purpose"] == "TEST_Sourcing trip"
        self.created_ids.append(entry["id"])
        
        # Verify via GET
        get_response = requests.get(f"{BASE_URL}/api/financials/mileage/{TEST_YEAR}")
        get_data = get_response.json()
        assert get_data["total_miles"] == 25.5
        # IRS rate for 2025 is $0.70
        assert get_data["deduction"] == round(25.5 * 0.70, 2)
    
    def test_mileage_deduction_calculation(self):
        """Test that mileage deduction is calculated correctly"""
        # Create multiple mileage entries
        entries = [
            {"year": TEST_YEAR, "date": "2025-03-11", "miles": 10.0, "purpose": "TEST_Trip 1"},
            {"year": TEST_YEAR, "date": "2025-03-12", "miles": 15.0, "purpose": "TEST_Trip 2"},
        ]
        for payload in entries:
            response = requests.post(f"{BASE_URL}/api/financials/mileage", json=payload)
            self.created_ids.append(response.json()["entry"]["id"])
        
        # Verify total
        get_response = requests.get(f"{BASE_URL}/api/financials/mileage/{TEST_YEAR}")
        get_data = get_response.json()
        assert get_data["total_miles"] == 25.0
        # IRS rate for 2025 is $0.70
        expected_deduction = round(25.0 * 0.70, 2)
        assert get_data["deduction"] == expected_deduction
    
    def test_delete_mileage(self):
        """Test deleting a mileage entry"""
        payload = {
            "year": TEST_YEAR,
            "date": "2025-04-01",
            "miles": 5.0,
            "purpose": "TEST_Delete trip"
        }
        create_response = requests.post(f"{BASE_URL}/api/financials/mileage", json=payload)
        entry_id = create_response.json()["entry"]["id"]
        
        delete_response = requests.delete(f"{BASE_URL}/api/financials/mileage/{entry_id}")
        assert delete_response.status_code == 200
        
        # Verify deleted
        get_response = requests.get(f"{BASE_URL}/api/financials/mileage/{TEST_YEAR}")
        get_data = get_response.json()
        deleted_entry = next((e for e in get_data["entries"] if e["id"] == entry_id), None)
        assert deleted_entry is None


class TestTaxPrepProgressAPI:
    """Tests for Tax Prep Progress endpoints"""
    
    # Use a unique test year to avoid conflicts
    PROGRESS_TEST_YEAR = 2098
    
    def test_get_progress_new_year(self):
        """Test getting progress for a year with no progress"""
        response = requests.get(f"{BASE_URL}/api/financials/tax-prep/progress/{self.PROGRESS_TEST_YEAR}")
        assert response.status_code == 200
        data = response.json()
        assert data["year"] == self.PROGRESS_TEST_YEAR
        # Check that the response has the expected structure
        assert "step1_complete" in data or data.get("completion_percentage") is not None
        assert "completion_percentage" in data
    
    def test_update_progress_step1(self):
        """Test updating progress for step 1"""
        response = requests.put(
            f"{BASE_URL}/api/financials/tax-prep/progress/{self.PROGRESS_TEST_YEAR}?step=1&complete=true"
        )
        assert response.status_code == 200
        
        # Verify
        get_response = requests.get(f"{BASE_URL}/api/financials/tax-prep/progress/{self.PROGRESS_TEST_YEAR}")
        get_data = get_response.json()
        assert get_data["step1_complete"] == True
        
        # Reset
        requests.put(f"{BASE_URL}/api/financials/tax-prep/progress/{self.PROGRESS_TEST_YEAR}?step=1&complete=false")
    
    def test_completion_percentage_calculation(self):
        """Test that completion percentage is calculated correctly"""
        # Reset all steps first
        for step in [1, 2, 3, 4, 5]:
            requests.put(f"{BASE_URL}/api/financials/tax-prep/progress/{self.PROGRESS_TEST_YEAR}?step={step}&complete=false")
        
        # Complete steps 1, 2, 3
        for step in [1, 2, 3]:
            requests.put(f"{BASE_URL}/api/financials/tax-prep/progress/{self.PROGRESS_TEST_YEAR}?step={step}&complete=true")
        
        get_response = requests.get(f"{BASE_URL}/api/financials/tax-prep/progress/{self.PROGRESS_TEST_YEAR}")
        get_data = get_response.json()
        assert get_data["completion_percentage"] == 60  # 3/5 = 60%
        
        # Reset
        for step in [1, 2, 3]:
            requests.put(f"{BASE_URL}/api/financials/tax-prep/progress/{self.PROGRESS_TEST_YEAR}?step={step}&complete=false")


class TestFinancialSummaryAPI:
    """Tests for Financial Summary endpoints"""
    
    created_income_ids = []
    created_cogs_ids = []
    created_expense_ids = []
    created_mileage_ids = []
    
    @pytest.fixture(autouse=True)
    def setup_and_teardown(self):
        yield
        # Cleanup
        for entry_id in self.created_income_ids:
            try:
                requests.delete(f"{BASE_URL}/api/financials/income/{entry_id}")
            except:
                pass
        for entry_id in self.created_cogs_ids:
            try:
                requests.delete(f"{BASE_URL}/api/financials/cogs/{entry_id}")
            except:
                pass
        for entry_id in self.created_expense_ids:
            try:
                requests.delete(f"{BASE_URL}/api/financials/expenses/{entry_id}")
            except:
                pass
        for entry_id in self.created_mileage_ids:
            try:
                requests.delete(f"{BASE_URL}/api/financials/mileage/{entry_id}")
            except:
                pass
        self.created_income_ids.clear()
        self.created_cogs_ids.clear()
        self.created_expense_ids.clear()
        self.created_mileage_ids.clear()
    
    def test_get_summary_empty_year(self):
        """Test getting summary for a year with no data"""
        response = requests.get(f"{BASE_URL}/api/financials/summary/{TEST_YEAR}")
        assert response.status_code == 200
        data = response.json()
        assert data["year"] == TEST_YEAR
        assert "income" in data
        assert "cogs" in data
        assert "gross_profit" in data
        assert "deductions" in data
        assert "net_profit" in data
    
    def test_summary_calculations(self):
        """Test that summary calculations are correct"""
        # Create test data
        # Income: $1000 (1099) + $500 (other) = $1500
        income1 = requests.post(f"{BASE_URL}/api/financials/income", json={
            "year": TEST_YEAR, "platform": "ebay", "amount": 1000.00, "is_1099": True
        }).json()["entry"]["id"]
        self.created_income_ids.append(income1)
        
        income2 = requests.post(f"{BASE_URL}/api/financials/income", json={
            "year": TEST_YEAR, "platform": "poshmark", "amount": 500.00, "is_1099": False
        }).json()["entry"]["id"]
        self.created_income_ids.append(income2)
        
        # COGS: $200
        cogs1 = requests.post(f"{BASE_URL}/api/financials/cogs", json={
            "year": TEST_YEAR, "date": "2025-01-01", "source": "TEST_Source", "amount": 200.00
        }).json()["entry"]["id"]
        self.created_cogs_ids.append(cogs1)
        
        # Expenses: $100
        expense1 = requests.post(f"{BASE_URL}/api/financials/expenses", json={
            "year": TEST_YEAR, "category": "shipping_supplies", "amount": 100.00, "date": "2025-01-01"
        }).json()["entry"]["id"]
        self.created_expense_ids.append(expense1)
        
        # Mileage: 100 miles @ $0.70 = $70
        mileage1 = requests.post(f"{BASE_URL}/api/financials/mileage", json={
            "year": TEST_YEAR, "date": "2025-01-01", "miles": 100.0, "purpose": "TEST_Trip"
        }).json()["entry"]["id"]
        self.created_mileage_ids.append(mileage1)
        
        # Get summary
        response = requests.get(f"{BASE_URL}/api/financials/summary/{TEST_YEAR}")
        data = response.json()
        
        # Verify calculations
        assert data["income"]["total"] == 1500.00
        assert data["income"]["from_1099"] == 1000.00
        assert data["income"]["other"] == 500.00
        assert data["cogs"] == 200.00
        assert data["gross_profit"] == 1300.00  # 1500 - 200
        assert data["deductions"]["expenses"] == 100.00
        assert data["deductions"]["mileage"] == 70.00  # 100 * 0.70
        assert data["deductions"]["total"] == 170.00  # 100 + 70
        assert data["net_profit"] == 1130.00  # 1300 - 170
    
    def test_get_comparison(self):
        """Test getting year comparison data"""
        response = requests.get(f"{BASE_URL}/api/financials/comparison/{TEST_YEAR}")
        assert response.status_code == 200
        data = response.json()
        assert data["current_year"] == TEST_YEAR
        assert data["previous_year"] == TEST_YEAR - 1
        assert "current" in data
        assert "previous" in data
        assert "gross_sales" in data["current"]
        assert "profit" in data["current"]
    
    def test_get_monthly_data(self):
        """Test getting monthly breakdown data"""
        response = requests.get(f"{BASE_URL}/api/financials/monthly/{TEST_YEAR}")
        assert response.status_code == 200
        data = response.json()
        assert data["year"] == TEST_YEAR
        assert "monthly" in data
        assert len(data["monthly"]) == 12
        
        # Verify month structure
        jan = data["monthly"][0]
        assert jan["month"] == "Jan"
        assert jan["month_num"] == 1
        assert "gross_sales" in jan
        assert "cogs" in jan
        assert "expenses" in jan
        assert "profit" in jan


class TestVendooImportAPI:
    """Tests for Vendoo CSV Import endpoint"""
    
    created_income_ids = []
    created_cogs_ids = []
    created_expense_ids = []
    
    @pytest.fixture(autouse=True)
    def setup_and_teardown(self):
        yield
        # Cleanup created entries
        for entry_id in self.created_income_ids:
            try:
                requests.delete(f"{BASE_URL}/api/financials/income/{entry_id}")
            except:
                pass
        for entry_id in self.created_cogs_ids:
            try:
                requests.delete(f"{BASE_URL}/api/financials/cogs/{entry_id}")
            except:
                pass
        for entry_id in self.created_expense_ids:
            try:
                requests.delete(f"{BASE_URL}/api/financials/expenses/{entry_id}")
            except:
                pass
        self.created_income_ids.clear()
        self.created_cogs_ids.clear()
        self.created_expense_ids.clear()
    
    def test_get_vendoo_template(self):
        """Test getting Vendoo template information"""
        response = requests.get(f"{BASE_URL}/api/financials/vendoo/template")
        assert response.status_code == 200
        data = response.json()
        assert "description" in data
        assert "instructions" in data
        assert "required_columns" in data
        assert "optional_columns" in data
        assert "supported_platforms" in data
        assert "ebay" in data["supported_platforms"]
        assert "poshmark" in data["supported_platforms"]
    
    def test_import_income_only(self):
        """Test importing Vendoo CSV with income only"""
        # Create test CSV
        csv_content = """Title,Platform Sold,Sold Date,Price Sold,Cost of Goods,Marketplace Fees
TEST_Item1,eBay,2097-01-15,100.00,20.00,10.00
TEST_Item2,Poshmark,2097-01-20,200.00,40.00,20.00
TEST_Item3,Mercari,2097-02-10,150.00,30.00,15.00"""
        
        files = {'file': ('test.csv', csv_content, 'text/csv')}
        data = {
            'year': '2097',
            'import_income': 'true',
            'import_cogs': 'false',
            'import_fees_as_expense': 'false'
        }
        
        response = requests.post(
            f"{BASE_URL}/api/financials/vendoo/import",
            files=files,
            data=data
        )
        assert response.status_code == 200
        result = response.json()
        assert result["success"] == True
        assert result["details"]["rows_processed"] == 3
        assert result["details"]["income_entries_created"] == 3
        assert result["details"]["cogs_entries_created"] == 0
        assert result["details"]["fee_expenses_created"] == 0
        assert result["details"]["total_sales"] == 450.00
        
        # Verify income entries via GET
        income_response = requests.get(f"{BASE_URL}/api/financials/income/2097")
        income_data = income_response.json()
        assert income_data["total"] == 450.00
        
        # Track for cleanup
        for entry in income_data["entries"]:
            self.created_income_ids.append(entry["id"])
    
    def test_import_with_cogs(self):
        """Test importing Vendoo CSV with COGS"""
        csv_content = """Title,Platform Sold,Sold Date,Price Sold,Cost of Goods,Marketplace Fees
TEST_Item1,eBay,2096-01-15,100.00,20.00,10.00
TEST_Item2,eBay,2096-01-20,200.00,40.00,20.00"""
        
        files = {'file': ('test.csv', csv_content, 'text/csv')}
        data = {
            'year': '2096',
            'import_income': 'true',
            'import_cogs': 'true',
            'import_fees_as_expense': 'false'
        }
        
        response = requests.post(
            f"{BASE_URL}/api/financials/vendoo/import",
            files=files,
            data=data
        )
        assert response.status_code == 200
        result = response.json()
        assert result["success"] == True
        assert result["details"]["cogs_entries_created"] > 0
        
        # Verify COGS entries via GET
        cogs_response = requests.get(f"{BASE_URL}/api/financials/cogs/2096")
        cogs_data = cogs_response.json()
        assert cogs_data["total"] == 60.00  # 20 + 40
        
        # Track for cleanup
        income_response = requests.get(f"{BASE_URL}/api/financials/income/2096")
        for entry in income_response.json()["entries"]:
            self.created_income_ids.append(entry["id"])
        for entry in cogs_data["entries"]:
            self.created_cogs_ids.append(entry["id"])
    
    def test_import_with_fees_as_expense(self):
        """Test importing Vendoo CSV with fees as expense"""
        csv_content = """Title,Platform Sold,Sold Date,Price Sold,Cost of Goods,Marketplace Fees
TEST_Item1,eBay,2095-01-15,100.00,20.00,10.00
TEST_Item2,Poshmark,2095-01-20,200.00,40.00,25.00"""
        
        files = {'file': ('test.csv', csv_content, 'text/csv')}
        data = {
            'year': '2095',
            'import_income': 'true',
            'import_cogs': 'false',
            'import_fees_as_expense': 'true'
        }
        
        response = requests.post(
            f"{BASE_URL}/api/financials/vendoo/import",
            files=files,
            data=data
        )
        assert response.status_code == 200
        result = response.json()
        assert result["success"] == True
        assert result["details"]["fee_expenses_created"] == 1
        
        # Verify expense entry via GET
        expenses_response = requests.get(f"{BASE_URL}/api/financials/expenses/2095")
        expenses_data = expenses_response.json()
        assert expenses_data["total"] == 35.00  # 10 + 25
        
        # Track for cleanup
        income_response = requests.get(f"{BASE_URL}/api/financials/income/2095")
        for entry in income_response.json()["entries"]:
            self.created_income_ids.append(entry["id"])
        for entry in expenses_data["entries"]:
            self.created_expense_ids.append(entry["id"])
    
    def test_import_all_options(self):
        """Test importing Vendoo CSV with all options enabled"""
        csv_content = """Title,Platform Sold,Sold Date,Price Sold,Cost of Goods,Marketplace Fees
TEST_Item1,eBay,2094-01-15,100.00,20.00,10.00
TEST_Item2,Poshmark,2094-02-20,200.00,40.00,25.00
TEST_Item3,Mercari,2094-03-10,150.00,30.00,15.00"""
        
        files = {'file': ('test.csv', csv_content, 'text/csv')}
        data = {
            'year': '2094',
            'import_income': 'true',
            'import_cogs': 'true',
            'import_fees_as_expense': 'true'
        }
        
        response = requests.post(
            f"{BASE_URL}/api/financials/vendoo/import",
            files=files,
            data=data
        )
        assert response.status_code == 200
        result = response.json()
        assert result["success"] == True
        assert result["details"]["rows_processed"] == 3
        assert result["details"]["income_entries_created"] == 3
        assert result["details"]["cogs_entries_created"] > 0
        assert result["details"]["fee_expenses_created"] == 1
        assert result["details"]["total_sales"] == 450.00
        
        # Track for cleanup
        income_response = requests.get(f"{BASE_URL}/api/financials/income/2094")
        for entry in income_response.json()["entries"]:
            self.created_income_ids.append(entry["id"])
        cogs_response = requests.get(f"{BASE_URL}/api/financials/cogs/2094")
        for entry in cogs_response.json()["entries"]:
            self.created_cogs_ids.append(entry["id"])
        expenses_response = requests.get(f"{BASE_URL}/api/financials/expenses/2094")
        for entry in expenses_response.json()["entries"]:
            self.created_expense_ids.append(entry["id"])
    
    def test_import_year_filtering(self):
        """Test that import filters by year correctly"""
        csv_content = """Title,Platform Sold,Sold Date,Price Sold
TEST_Item1,eBay,2093-01-15,100.00
TEST_Item2,eBay,2092-01-20,200.00
TEST_Item3,eBay,2093-02-10,150.00"""
        
        files = {'file': ('test.csv', csv_content, 'text/csv')}
        data = {
            'year': '2093',
            'import_income': 'true',
            'import_cogs': 'false',
            'import_fees_as_expense': 'false'
        }
        
        response = requests.post(
            f"{BASE_URL}/api/financials/vendoo/import",
            files=files,
            data=data
        )
        assert response.status_code == 200
        result = response.json()
        assert result["success"] == True
        assert result["details"]["rows_processed"] == 2  # Only 2093 rows
        assert result["details"]["rows_skipped"] == 1  # 2092 row skipped
        assert result["details"]["total_sales"] == 250.00  # 100 + 150
        
        # Track for cleanup
        income_response = requests.get(f"{BASE_URL}/api/financials/income/2093")
        for entry in income_response.json()["entries"]:
            self.created_income_ids.append(entry["id"])
    
    def test_import_non_csv_file_error(self):
        """Test that non-CSV files are rejected"""
        files = {'file': ('test.txt', 'not a csv', 'text/plain')}
        data = {
            'year': '2098',
            'import_income': 'true',
            'import_cogs': 'false',
            'import_fees_as_expense': 'false'
        }
        
        response = requests.post(
            f"{BASE_URL}/api/financials/vendoo/import",
            files=files,
            data=data
        )
        assert response.status_code == 400
        assert "CSV" in response.json()["detail"]
    
    def test_import_missing_price_column_error(self):
        """Test that CSV without price column is rejected"""
        csv_content = """Title,Platform Sold,Sold Date
TEST_Item1,eBay,2098-01-15"""
        
        files = {'file': ('test.csv', csv_content, 'text/csv')}
        data = {
            'year': '2098',
            'import_income': 'true',
            'import_cogs': 'false',
            'import_fees_as_expense': 'false'
        }
        
        response = requests.post(
            f"{BASE_URL}/api/financials/vendoo/import",
            files=files,
            data=data
        )
        assert response.status_code == 500  # Import failed error
        assert "price" in response.json()["detail"].lower()
    
    def test_import_no_valid_sales_error(self):
        """Test that CSV with no valid sales for year is rejected"""
        csv_content = """Title,Platform Sold,Sold Date,Price Sold
TEST_Item1,eBay,2091-01-15,100.00"""
        
        files = {'file': ('test.csv', csv_content, 'text/csv')}
        data = {
            'year': '2098',  # Different year than CSV data
            'import_income': 'true',
            'import_cogs': 'false',
            'import_fees_as_expense': 'false'
        }
        
        response = requests.post(
            f"{BASE_URL}/api/financials/vendoo/import",
            files=files,
            data=data
        )
        assert response.status_code == 500  # Import failed error
        assert "No valid sales" in response.json()["detail"]
    
    def test_import_platform_mapping(self):
        """Test that platforms are correctly mapped"""
        csv_content = """Title,Platform Sold,Sold Date,Price Sold
TEST_Item1,eBay,2092-01-15,100.00
TEST_Item2,Facebook Marketplace,2092-01-20,200.00
TEST_Item3,Depop,2092-02-10,150.00
TEST_Item4,Unknown Platform,2092-02-15,50.00"""
        
        files = {'file': ('test.csv', csv_content, 'text/csv')}
        data = {
            'year': '2092',
            'import_income': 'true',
            'import_cogs': 'false',
            'import_fees_as_expense': 'false'
        }
        
        response = requests.post(
            f"{BASE_URL}/api/financials/vendoo/import",
            files=files,
            data=data
        )
        assert response.status_code == 200
        result = response.json()
        assert result["success"] == True
        
        # Verify platform mapping via GET
        income_response = requests.get(f"{BASE_URL}/api/financials/income/2092")
        income_data = income_response.json()
        
        platforms = [e["platform"] for e in income_data["entries"]]
        assert "ebay" in platforms
        assert "fb_marketplace" in platforms
        assert "depop" in platforms
        assert "other" in platforms  # Unknown platform maps to other
        
        # Track for cleanup
        for entry in income_data["entries"]:
            self.created_income_ids.append(entry["id"])




class Test1099NECAPI:
    """Tests for 1099-NEC generation endpoints"""
    
    def test_get_1099_eligible_empty(self):
        """Test getting 1099 eligible recipients when none exist"""
        # Use a test year where no consignment payments exist
        response = requests.get(f"{BASE_URL}/api/financials/1099/eligible/2099")
        assert response.status_code == 200
        data = response.json()
        assert data["year"] == 2099
        assert data["threshold"] == 600
        assert "eligible_count" in data
        assert "eligible_recipients" in data
        assert "below_threshold_count" in data
        assert "total_to_report" in data
    
    def test_get_1099_eligible_structure(self):
        """Test that 1099 eligible endpoint returns correct structure"""
        response = requests.get(f"{BASE_URL}/api/financials/1099/eligible/2025")
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "year" in data
        assert "threshold" in data
        assert "eligible_count" in data
        assert "eligible_recipients" in data
        assert "below_threshold_count" in data
        assert "total_to_report" in data
        
        # If there are eligible recipients, verify their structure
        if data["eligible_count"] > 0:
            recipient = data["eligible_recipients"][0]
            assert "email" in recipient
            assert "name" in recipient
            assert "total_paid" in recipient
            assert "payment_count" in recipient
            assert recipient["total_paid"] >= 600
    
    def test_generate_1099_nonexistent_consignor(self):
        """Test generating 1099 for non-existent consignor returns 404"""
        response = requests.get(f"{BASE_URL}/api/financials/1099/generate/2025/nonexistent@test.com")
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()
    
    def test_batch_1099_no_eligible(self):
        """Test batch 1099 generation when no eligible recipients"""
        # Use a test year where no consignment payments exist
        response = requests.get(f"{BASE_URL}/api/financials/1099/batch/2099")
        assert response.status_code == 404
        assert "No recipients" in response.json()["detail"]


class TestTaxSummaryDownloadAPI:
    """Tests for Tax Summary download endpoints"""
    
    def test_download_tax_summary_csv(self):
        """Test downloading tax summary as CSV"""
        response = requests.get(f"{BASE_URL}/api/financials/tax-summary/2025/download?format=csv")
        assert response.status_code == 200
        assert "text/csv" in response.headers.get("content-type", "")
        
        # Verify CSV content structure
        content = response.text
        assert "Thrifty Curator Tax Summary" in content
        assert "Gross Income" in content
        assert "Cost of Goods Sold" in content
        assert "GROSS PROFIT" in content
        assert "NET PROFIT" in content
    
    def test_download_tax_summary_pdf(self):
        """Test downloading tax summary as PDF"""
        response = requests.get(f"{BASE_URL}/api/financials/tax-summary/2025/download?format=pdf")
        assert response.status_code == 200
        assert "application/pdf" in response.headers.get("content-type", "")
        
        # Verify it's a valid PDF (starts with %PDF)
        assert response.content[:4] == b'%PDF'
    
    def test_download_tax_summary_default_format(self):
        """Test that default format is PDF"""
        response = requests.get(f"{BASE_URL}/api/financials/tax-summary/2025/download")
        assert response.status_code == 200
        assert "application/pdf" in response.headers.get("content-type", "")
    
    def test_download_tax_summary_empty_year(self):
        """Test downloading tax summary for year with no data"""
        response = requests.get(f"{BASE_URL}/api/financials/tax-summary/2099/download?format=csv")
        assert response.status_code == 200
        
        # Should still return valid CSV with zero values
        content = response.text
        assert "Thrifty Curator Tax Summary" in content
        assert "$0.00" in content
    
    def test_download_tax_summary_pdf_empty_year(self):
        """Test downloading PDF tax summary for year with no data"""
        response = requests.get(f"{BASE_URL}/api/financials/tax-summary/2099/download?format=pdf")
        assert response.status_code == 200
        assert "application/pdf" in response.headers.get("content-type", "")
        assert response.content[:4] == b'%PDF'


class TestUpdateTINAPI:
    """Tests for TIN update endpoint"""
    
    def test_update_tin(self):
        """Test updating TIN for a recipient"""
        response = requests.post(
            f"{BASE_URL}/api/financials/1099/update-tin",
            data={
                "email": "test_tin@example.com",
                "tin": "123-45-6789",
                "tin_type": "SSN"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "TIN updated successfully"
        assert data["email"] == "test_tin@example.com"
    
    def test_update_tin_ein(self):
        """Test updating TIN with EIN type"""
        response = requests.post(
            f"{BASE_URL}/api/financials/1099/update-tin",
            data={
                "email": "test_ein@example.com",
                "tin": "12-3456789",
                "tin_type": "EIN"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "TIN updated successfully"
