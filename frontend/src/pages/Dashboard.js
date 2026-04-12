import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Header } from "../components/app/Header";
import { SearchBar } from "../components/app/SearchBar";
import { FilterBar } from "../components/app/FilterBar";
import { ActiveFilters } from "../components/app/ActiveFilters";
import { ViolationTable, ALL_COLUMNS } from "../components/app/ViolationTable";
import { UploadDialog } from "../components/app/UploadDialog";
import { SimilarViolationsSheet } from "../components/app/SimilarViolationsSheet";
import { Toaster, toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const INITIAL_FILTERS = {
  violation_class: "",
  oos: "",
  hazmat: "",
  level_iii: "",
  critical: "",
};

export default function Dashboard() {
  const [keyword, setKeyword] = useState("");
  const [aiMode, setAiMode] = useState(false);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [filterOptions, setFilterOptions] = useState({
    violation_classes: [],
    violation_categories: [],
    cfr_parts: [],
    oos_values: [],
  });
  const [violations, setViolations] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [expandedTerms, setExpandedTerms] = useState([]);
  const [stats, setStats] = useState(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [sortBy, setSortBy] = useState("");
  const [sortDir, setSortDir] = useState("asc");
  const [selectedViolation, setSelectedViolation] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [columnOrder, setColumnOrder] = useState(
    ALL_COLUMNS.map((c) => c.key)
  );

  // Load filter options and stats on mount
  useEffect(() => {
    fetchFilterOptions();
    fetchStats();
  }, []);

  // Fetch violations when filters, page, or sort change
  useEffect(() => {
    if (!aiMode) {
      fetchViolations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, page, sortBy, sortDir]);

  // Initial load
  useEffect(() => {
    fetchViolations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchFilterOptions = async () => {
    try {
      const res = await axios.get(`${API}/violations/filters`);
      setFilterOptions(res.data);
    } catch (err) {
      console.error("Failed to fetch filter options:", err);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API}/violations/stats`);
      setStats(res.data);
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    }
  };

  const fetchViolations = useCallback(async (searchKeyword) => {
    setIsLoading(true);
    setExpandedTerms([]);
    try {
      const params = {
        keyword: searchKeyword !== undefined ? searchKeyword : keyword,
        page,
        page_size: pageSize,
        ...Object.fromEntries(
          Object.entries(filters).filter(([, v]) => v !== "")
        ),
      };
      if (sortBy) {
        params.sort_by = sortBy;
        params.sort_dir = sortDir;
      }
      const res = await axios.get(`${API}/violations`, { params });
      setViolations(res.data.violations);
      setTotal(res.data.total);
      setTotalPages(res.data.total_pages);
    } catch (err) {
      console.error("Failed to fetch violations:", err);
      toast.error("Failed to load violations");
    } finally {
      setIsLoading(false);
    }
  }, [keyword, page, pageSize, filters, sortBy, sortDir]);

  const handleSearch = async (searchKeyword) => {
    setPage(1);
    if (aiMode && searchKeyword.trim()) {
      setIsSearching(true);
      setIsLoading(true);
      try {
        const res = await axios.post(`${API}/violations/smart-search`, {
          query: searchKeyword,
        });
        setViolations(res.data.violations);
        setTotal(res.data.total);
        setExpandedTerms(res.data.expanded_terms || []);
        setTotalPages(1);
        toast.success(`AI found ${res.data.total} matching violations`);
      } catch (err) {
        console.error("Smart search failed:", err);
        toast.error("AI search failed. Falling back to basic search.");
        fetchViolations(searchKeyword);
      } finally {
        setIsSearching(false);
        setIsLoading(false);
      }
    } else {
      fetchViolations(searchKeyword);
    }
  };

  const handleFilterChange = (key, value) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleClearFilter = (key) => {
    setFilters((prev) => ({ ...prev, [key]: "" }));
    setPage(1);
  };

  const handleClearAllFilters = () => {
    setFilters(INITIAL_FILTERS);
    setPage(1);
  };

  const handleUploadSuccess = () => {
    fetchFilterOptions();
    fetchStats();
    fetchViolations("");
    toast.success("Data refreshed successfully");
  };

  const handleSort = (field, dir) => {
    setSortBy(field);
    setSortDir(dir);
    setPage(1);
  };

  const handleViolationClick = (violation) => {
    setSelectedViolation(violation);
    setSheetOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#001229]" data-testid="dashboard">
      <Toaster position="top-right" richColors />
      <Header
        onUploadClick={() => setUploadOpen(true)}
        stats={stats}
      />

      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* Search */}
        <SearchBar
          keyword={keyword}
          onKeywordChange={setKeyword}
          onSearch={handleSearch}
          aiMode={aiMode}
          onAiModeChange={setAiMode}
          isSearching={isSearching}
        />

        {/* Filters */}
        <FilterBar
          filters={filters}
          filterOptions={filterOptions}
          onFilterChange={handleFilterChange}
        />

        {/* Active Filters */}
        <ActiveFilters
          filters={filters}
          onClearFilter={handleClearFilter}
          onClearAll={handleClearAllFilters}
          expandedTerms={expandedTerms}
        />

        {/* Results Table */}
        <ViolationTable
          violations={violations}
          total={total}
          page={page}
          pageSize={pageSize}
          totalPages={totalPages}
          onPageChange={setPage}
          isLoading={isLoading}
          sortBy={sortBy}
          sortDir={sortDir}
          onSort={handleSort}
          onViolationClick={handleViolationClick}
          columnOrder={columnOrder}
          onColumnOrderChange={setColumnOrder}
        />
      </main>

      {/* Upload Dialog */}
      <UploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onUploadSuccess={handleUploadSuccess}
      />

      {/* Similar Violations Sheet */}
      <SimilarViolationsSheet
        violation={selectedViolation}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  );
}
