import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { FolderTree, ClipboardCheck, Calculator } from "lucide-react";
import { Header } from "../components/app/Header";
import { SearchBar } from "../components/app/SearchBar";
import { FilterBar } from "../components/app/FilterBar";
import { ActiveFilters } from "../components/app/ActiveFilters";
import { ViolationTable, ALL_COLUMNS } from "../components/app/ViolationTable";
import { UploadDialog } from "../components/app/UploadDialog";
import { SimilarViolationsSheet } from "../components/app/SimilarViolationsSheet";
import { ViolationTree, ViolationTreeDrawer } from "../components/app/ViolationTree";
import { InspectionProcedures } from "../components/app/InspectionProcedures";
import { ScrollArea } from "../components/ui/scroll-area";
import { useNavigate } from "react-router-dom";
import { Toaster, toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const INITIAL_FILTERS = {
  violation_class: "",
  violation_category: "",
  reg_base: "",
  oos: "",
  hazmat: "",
  level_iii: "",
  critical: "",
};

export default function Dashboard() {
  const [keyword, setKeyword] = useState("");
  const [aiMode, setAiMode] = useState(false);
  const [aiKeyword, setAiKeyword] = useState(""); // persists the AI-selected term across filter changes
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
  const [treeDrawerOpen, setTreeDrawerOpen] = useState(false);
  const [proceduresOpen, setProceduresOpen] = useState(false);

  // Favorites — stored in localStorage
  const FAV_KEY = "violation-favorites";
  const [favorites, setFavorites] = useState(() => {
    try { return JSON.parse(localStorage.getItem(FAV_KEY)) || []; } catch { return []; }
  });
  const toggleFavorite = useCallback((v) => {
    setFavorites(prev => {
      const regRef = v.regulatory_reference;
      const exists = prev.some(f => f.regulatory_reference === regRef);
      let next;
      if (exists) {
        next = prev.filter(f => f.regulatory_reference !== regRef);
      } else {
        next = [...prev, { regulatory_reference: v.regulatory_reference, violation_text: v.violation_text, violation_class: v.violation_class, violation_code: v.violation_code, oos_value: v.oos_value }];
      }
      localStorage.setItem(FAV_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  // Load filter options and stats on mount
  useEffect(() => {
    fetchFilterOptions();
    fetchStats();
  }, []);

  // Fetch violations when filters, page, or sort change
  useEffect(() => {
    fetchViolations();
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
    try {
      const params = {
        keyword: searchKeyword !== undefined ? searchKeyword : (aiKeyword || keyword),
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
  }, [keyword, aiKeyword, page, pageSize, filters, sortBy, sortDir]);

  const handleSearch = async (searchKeyword) => {
    setPage(1);
    setAiKeyword(""); // new manual search clears any persisted AI term
    if (aiMode && searchKeyword.trim()) {
      setIsSearching(true);
      setIsLoading(true);
      try {
        const res = await axios.post(`${API}/violations/smart-search`, {
          query: searchKeyword,
          ...Object.fromEntries(
            Object.entries(filters).filter(([, v]) => v !== "")
          ),
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
      setExpandedTerms([]);
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
    setAiKeyword("");
    setExpandedTerms([]);
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

  const handleTreeSelect = (cls, cat, regBase) => {
    setPage(1);
    setFilters((prev) => ({
      ...prev,
      violation_class: cls,
      violation_category: cat,
      reg_base: regBase || "",
      hazmat: "",
    }));
  };

  return (
    <div className="min-h-screen bg-[#EFF2F7]" data-testid="dashboard">
      <Toaster position="top-right" richColors />
      <Header
        onUploadClick={() => setUploadOpen(true)}
        stats={stats}
      />

      <div className="max-w-[1600px] mx-auto flex">
        {/* Desktop tree sidebar */}
        <aside className="hidden lg:block w-[260px] flex-shrink-0 border-r bg-white sticky top-[52px] h-[calc(100vh-52px)]">
          <ScrollArea className="h-full">
            <ViolationTree
              activeClass={filters.violation_class}
              activeCategory={filters.violation_category}
              activeRegBase={filters.reg_base}
              onSelect={handleTreeSelect}
              className="py-3"
              favorites={favorites}
              onToggleFavorite={toggleFavorite}
              onFavoriteClick={handleViolationClick}
            />
          </ScrollArea>
        </aside>

        <main className={`flex-1 min-w-0 px-3 sm:px-6 py-4 sm:py-6 pb-20 space-y-3 sm:space-y-5 transition-all ${treeDrawerOpen ? "lg:pt-4 pt-[52vh]" : ""}`}>
          {/* Mobile tree and procedures buttons + Search */}
          <div className="flex gap-2 items-stretch">
            <button
              onClick={() => setTreeDrawerOpen(!treeDrawerOpen)}
              className={`lg:hidden flex items-center justify-center gap-1.5 h-10 px-3 border rounded-lg transition-colors flex-shrink-0 ${treeDrawerOpen ? "bg-[#001a3a] border-[#001a3a] text-white" : "bg-[#002855] border-[#002855] text-white hover:bg-[#001a3a]"}`}
              data-testid="tree-drawer-btn"
              title="Browse by type"
            >
              <FolderTree className="w-4 h-4" />
              <span className="text-xs font-medium">Tree</span>
            </button>
            <button
              onClick={() => setProceduresOpen(true)}
              className="lg:hidden flex items-center justify-center gap-1.5 h-10 px-3 border border-[#CBD5E1] rounded-lg bg-white text-[#64748B] hover:text-[#002855] hover:border-[#002855] transition-colors flex-shrink-0"
              data-testid="procedures-btn"
              title="Inspection procedures"
            >
              <ClipboardCheck className="w-4 h-4" />
              <span className="text-xs font-medium">Steps</span>
            </button>
            <div className="flex-1">
              <SearchBar
                keyword={keyword}
                onKeywordChange={setKeyword}
                onSearch={handleSearch}
                aiMode={aiMode}
                onAiModeChange={setAiMode}
                isSearching={isSearching}
              />
            </div>
          </div>

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
          onTermClick={(term) => {
            setKeyword(term);
            setAiKeyword(term);
            setAiMode(false);
            setPage(1);
            fetchViolations(term);
          }}
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
          favorites={favorites.map(f => f.regulatory_reference)}
          onToggleFavorite={toggleFavorite}
        />
      </main>
      </div>

      {/* Mobile tree drawer */}
      <ViolationTreeDrawer
        open={treeDrawerOpen}
        onOpenChange={setTreeDrawerOpen}
        activeClass={filters.violation_class}
        activeCategory={filters.violation_category}
        activeRegBase={filters.reg_base}
        onSelect={handleTreeSelect}
        favorites={favorites}
        onToggleFavorite={toggleFavorite}
        onFavoriteClick={handleViolationClick}
      />

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

      {/* Inspection Procedures */}
      <InspectionProcedures
        open={proceduresOpen}
        onOpenChange={setProceduresOpen}
      />
    </div>
  );
}
