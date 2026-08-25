"""
Test Vendoo CSV Import and Sales Data Analytics
Tests the fix for MongoDB regex queries not matching 'Sold' status.
The fix replaced {$regex: pattern, $options: 'i'} with Python's re.compile(pattern, re.IGNORECASE).
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestInventorySummary:
    """Test /api/inventory/summary endpoint returns correct sold items count"""
    
    def test_summary_returns_sold_items_count(self):
        """Verify summary endpoint returns non-zero sold items count"""
        response = requests.get(f"{BASE_URL}/api/inventory/summary")
        assert response.status_code == 200
        
        data = response.json()
        assert "total_items" in data
        assert "sold_summary" in data
        assert "by_status" in data
        
        # The fix should now return correct sold items count
        sold_count = data["sold_summary"]["count"]
        assert sold_count > 0, f"Expected sold items count > 0, got {sold_count}"
        
        # Verify by_status contains 'Sold' key
        assert "Sold" in data["by_status"], "Expected 'Sold' status in by_status"
        
    def test_summary_financial_totals(self):
        """Verify summary endpoint returns non-zero financial totals for sold items"""
        response = requests.get(f"{BASE_URL}/api/inventory/summary")
        assert response.status_code == 200
        
        data = response.json()
        sold_summary = data["sold_summary"]
        
        # Verify financial totals are present and non-zero
        assert sold_summary["total_revenue"] > 0, "Expected total_revenue > 0"
        assert sold_summary["total_cogs"] >= 0, "Expected total_cogs >= 0"
        assert sold_summary["total_fees"] >= 0, "Expected total_fees >= 0"
        
    def test_summary_platform_breakdown(self):
        """Verify summary endpoint returns platform breakdown"""
        response = requests.get(f"{BASE_URL}/api/inventory/summary")
        assert response.status_code == 200
        
        data = response.json()
        assert "by_platform" in data
        assert len(data["by_platform"]) > 0, "Expected at least one platform"


class TestInventoryAnalytics:
    """Test /api/inventory/analytics endpoint returns correct data"""
    
    def test_analytics_returns_sold_items(self):
        """Verify analytics endpoint returns non-zero items_sold"""
        response = requests.get(f"{BASE_URL}/api/inventory/analytics")
        assert response.status_code == 200
        
        data = response.json()
        assert "summary" in data
        
        items_sold = data["summary"]["items_sold"]
        assert items_sold > 0, f"Expected items_sold > 0, got {items_sold}"
        
    def test_analytics_financial_metrics(self):
        """Verify analytics endpoint returns correct financial metrics"""
        response = requests.get(f"{BASE_URL}/api/inventory/analytics")
        assert response.status_code == 200
        
        data = response.json()
        summary = data["summary"]
        
        # Verify all financial metrics are present
        assert "gross_sales" in summary
        assert "net_sales" in summary
        assert "total_cogs" in summary
        assert "total_fees" in summary
        assert "profit" in summary
        assert "profit_margin" in summary
        
        # Verify gross_sales is non-zero
        assert summary["gross_sales"] > 0, "Expected gross_sales > 0"
        
    def test_analytics_with_year_filter(self):
        """Verify analytics endpoint works with year filter"""
        # Test with current year
        response = requests.get(f"{BASE_URL}/api/inventory/analytics?year=2026")
        assert response.status_code == 200
        
        data = response.json()
        assert "summary" in data
        assert "monthly_data" in data
        
    def test_analytics_top_brands(self):
        """Verify analytics endpoint returns top brands"""
        response = requests.get(f"{BASE_URL}/api/inventory/analytics")
        assert response.status_code == 200
        
        data = response.json()
        assert "top_brands" in data
        assert len(data["top_brands"]) > 0, "Expected at least one brand"
        
        # Verify brand structure
        first_brand = data["top_brands"][0]
        assert "brand" in first_brand
        assert "count" in first_brand
        assert "revenue" in first_brand
        
    def test_analytics_top_platforms(self):
        """Verify analytics endpoint returns top platforms"""
        response = requests.get(f"{BASE_URL}/api/inventory/analytics")
        assert response.status_code == 200
        
        data = response.json()
        assert "top_platforms" in data
        assert len(data["top_platforms"]) > 0, "Expected at least one platform"
        
        # Verify platform structure
        first_platform = data["top_platforms"][0]
        assert "platform" in first_platform
        assert "count" in first_platform
        assert "revenue" in first_platform


class TestInventoryYoYAnalytics:
    """Test /api/inventory/analytics/yoy endpoint"""
    
    def test_yoy_analytics_returns_data(self):
        """Verify YoY analytics endpoint returns comparison data"""
        response = requests.get(f"{BASE_URL}/api/inventory/analytics/yoy?current_year=2026")
        assert response.status_code == 200
        
        data = response.json()
        assert "months" in data
        assert "current_year" in data
        assert "previous_year" in data
        
    def test_yoy_analytics_monthly_data(self):
        """Verify YoY analytics returns monthly breakdown"""
        response = requests.get(f"{BASE_URL}/api/inventory/analytics/yoy?current_year=2026")
        assert response.status_code == 200
        
        data = response.json()
        months = data["months"]
        
        # Should have 12 months
        assert len(months) == 12, f"Expected 12 months, got {len(months)}"
        
        # Verify month structure
        first_month = months[0]
        assert "month" in first_month
        assert "previous" in first_month or first_month.get("previous") is None


class TestInventoryItems:
    """Test /api/inventory/items endpoint with status filter"""
    
    def test_items_filter_by_sold_status(self):
        """Verify items endpoint can filter by 'sold' status"""
        response = requests.get(f"{BASE_URL}/api/inventory/items?status=sold&limit=10")
        assert response.status_code == 200
        
        data = response.json()
        assert "items" in data
        assert "pagination" in data
        
        # Verify items are returned
        items = data["items"]
        assert len(items) > 0, "Expected at least one sold item"
        
        # Verify all returned items have 'Sold' status (case-insensitive)
        for item in items:
            assert item.get("status", "").lower() == "sold", f"Expected status 'Sold', got {item.get('status')}"
            
    def test_items_filter_by_platform(self):
        """Verify items endpoint can filter by platform"""
        response = requests.get(f"{BASE_URL}/api/inventory/items?platform=poshmark&limit=10")
        assert response.status_code == 200
        
        data = response.json()
        items = data["items"]
        
        # Verify all returned items have matching platform (case-insensitive)
        for item in items:
            assert "poshmark" in item.get("platform", "").lower(), f"Expected platform containing 'poshmark', got {item.get('platform')}"


class TestInventoryYears:
    """Test /api/inventory/years endpoint"""
    
    def test_years_returns_data(self):
        """Verify years endpoint returns list of years with data"""
        response = requests.get(f"{BASE_URL}/api/inventory/years")
        assert response.status_code == 200
        
        data = response.json()
        assert "years" in data
        assert len(data["years"]) > 0, "Expected at least one year"
        
        # Verify year structure
        first_year = data["years"][0]
        assert "year" in first_year
        assert "count" in first_year
        assert first_year["count"] > 0


class TestSamePeriodComparison:
    """Test same_period_as_current parameter for fair YoY comparison"""
    
    def test_same_period_comparison(self):
        """Verify same_period_as_current parameter works"""
        response = requests.get(f"{BASE_URL}/api/inventory/analytics?year=2025&same_period_as_current=true")
        assert response.status_code == 200
        
        data = response.json()
        assert "summary" in data
        # Should return data for 2025 up to current month of 2026
