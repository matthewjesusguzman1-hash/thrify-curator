import { useState, useEffect } from "react";
import { ChevronRight, ChevronDown, FolderTree, X, Truck, AlertTriangle, User, Building2 } from "lucide-react";
import { Button } from "../ui/button";
import { ScrollArea } from "../ui/scroll-area";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Top-level sections in order
const SECTIONS = [
  { key: "Driver", label: "Driver", icon: User, color: "text-blue-600 bg-blue-50" },
  { key: "Vehicle", label: "Vehicle", icon: Truck, color: "text-emerald-600 bg-emerald-50" },
  { key: "Hazardous Materials", label: "HazMat", icon: AlertTriangle, color: "text-amber-600 bg-amber-50" },
  { key: "_other", label: "Other", icon: Building2, color: "text-slate-600 bg-slate-50" },
];

function sortCategoryNum(name) {
  const m = name.match(/^(\d+)/);
  return m ? parseInt(m[1], 10) : 9999;
}

export function ViolationTree({ activeClass, activeCategory, activeRegBase, onSelect, className = "" }) {
  const [tree, setTree] = useState({});
  const [expanded, setExpanded] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchTree(); }, []);

  const fetchTree = async () => {
    try {
      const res = await axios.get(`${API}/violations/tree`);
      setTree(res.data.tree || {});
    } catch {
      console.error("Failed to load tree");
    } finally {
      setLoading(false);
    }
  };

  const toggle = (key) => {
    setExpanded((p) => ({ ...p, [key]: !p[key] }));
  };

  const hasActiveFilter = activeClass || activeCategory || activeRegBase;

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-8 ${className}`}>
        <div className="w-5 h-5 border-2 border-[#002855] border-t-transparent rounded-full loading-spin" />
      </div>
    );
  }

  // Group tree data into sections
  const mainKeys = ["Driver", "Vehicle", "Hazardous Materials"];
  const otherKeys = Object.keys(tree).filter((k) => !mainKeys.includes(k)).sort();
  const otherData = {
    count: otherKeys.reduce((sum, k) => sum + (tree[k]?.count || 0), 0),
    categories: otherKeys.flatMap((k) =>
      (tree[k]?.categories || []).map((c) => ({ ...c, parentClass: k }))
    ),
  };

  const getSectionData = (key) => {
    if (key === "_other") return otherData;
    return tree[key] || { count: 0, categories: [] };
  };

  return (
    <div className={className} data-testid="violation-tree">
      <div className="flex items-center gap-2 px-3 py-2 mb-1">
        <FolderTree className="w-3.5 h-3.5 text-[#64748B]" />
        <span className="text-[10px] font-bold tracking-widest uppercase text-[#64748B]">Violation Types</span>
      </div>

      {hasActiveFilter && (
        <div className="px-3 mb-2">
          <button
            onClick={() => onSelect("", "", "")}
            className="text-[10px] text-[#DC2626] hover:text-[#B91C1C] font-medium"
            data-testid="tree-clear-filter"
          >
            Clear tree filter
          </button>
        </div>
      )}

      <div className="space-y-0.5">
        {SECTIONS.map((section) => {
          const data = getSectionData(section.key);
          if (!data || data.count === 0) return null;

          const sectionKey = `s-${section.key}`;
          const isExpanded = expanded[sectionKey];
          const isSectionActive = section.key !== "_other"
            ? activeClass === section.key && !activeCategory && !activeRegBase
            : false;
          const Icon = section.icon;

          // Sort categories by leading number
          const sortedCats = [...data.categories].sort(
            (a, b) => sortCategoryNum(a.name) - sortCategoryNum(b.name)
          );

          return (
            <div key={section.key}>
              {/* Section header */}
              <div
                className={`flex items-center gap-2 px-3 py-2 rounded-md mx-1 transition-colors ${
                  isSectionActive ? "bg-[#002855] text-white" : "hover:bg-[#F1F5F9]"
                }`}
              >
                <button onClick={() => toggle(sectionKey)} className={`flex-shrink-0 ${isSectionActive ? "text-white/70" : "text-[#94A3B8]"}`}>
                  {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                </button>
                <div className={`flex items-center justify-center w-5 h-5 rounded flex-shrink-0 ${isSectionActive ? "bg-white/20" : section.color}`}>
                  <Icon className="w-3 h-3" />
                </div>
                <button
                  onClick={() => {
                    if (section.key !== "_other") {
                      onSelect(isSectionActive ? "" : section.key, "", "");
                    }
                    if (!isExpanded) toggle(sectionKey);
                  }}
                  className={`flex-1 text-left text-xs font-semibold ${isSectionActive ? "text-white" : "text-[#334155]"}`}
                >
                  {section.label}
                </button>
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${isSectionActive ? "bg-white/20 text-white" : "bg-[#F1F5F9] text-[#64748B]"}`}>
                  {data.count}
                </span>
              </div>

              {/* Categories */}
              {isExpanded && (
                <div className="ml-5 pl-3 border-l border-[#E2E8F0] space-y-0.5 my-0.5">
                  {sortedCats.map((cat) => {
                    const catClass = cat.parentClass || section.key;
                    const catKey = `c-${catClass}|${cat.name}`;
                    const isCatExpanded = expanded[catKey];
                    const isCatActive = activeClass === catClass && activeCategory === cat.name && !activeRegBase;

                    return (
                      <div key={cat.name}>
                        {/* Category row */}
                        <div className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md transition-colors ${isCatActive ? "bg-[#002855]/10" : "hover:bg-[#F8FAFC]"}`}>
                          {cat.sections && cat.sections.length > 0 ? (
                            <button onClick={() => toggle(catKey)} className="text-[#CBD5E1] flex-shrink-0">
                              {isCatExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                            </button>
                          ) : (
                            <span className="w-3" />
                          )}
                          <button
                            onClick={() => {
                              onSelect(catClass, isCatActive ? "" : cat.name, "");
                              if (!isCatExpanded && cat.sections?.length) toggle(catKey);
                            }}
                            className={`flex-1 text-left text-[11px] truncate ${isCatActive ? "font-semibold text-[#002855]" : "text-[#64748B]"}`}
                          >
                            {cat.name}
                          </button>
                          <span className={`text-[9px] flex-shrink-0 ${isCatActive ? "text-[#002855]" : "text-[#CBD5E1]"}`}>
                            {cat.count}
                          </span>
                        </div>

                        {/* Regulation sections */}
                        {isCatExpanded && cat.sections && cat.sections.length > 0 && (
                          <div className="ml-4 pl-3 border-l border-[#F1F5F9] space-y-0.5 my-0.5">
                            {cat.sections.map((sec) => {
                              const isSecActive = activeClass === catClass && activeCategory === cat.name && activeRegBase === sec.ref;
                              return (
                                <button
                                  key={sec.ref}
                                  onClick={() => onSelect(catClass, cat.name, isSecActive ? "" : sec.ref)}
                                  className={`w-full text-left flex items-center justify-between px-2 py-1 rounded transition-colors ${
                                    isSecActive
                                      ? "bg-[#D4AF37]/15 text-[#002855] font-semibold"
                                      : "text-[#94A3B8] hover:bg-[#F8FAFC] hover:text-[#64748B]"
                                  }`}
                                >
                                  <span className="text-[10px] font-mono">{sec.ref}</span>
                                  <span className={`text-[9px] ${isSecActive ? "text-[#D4AF37]" : "text-[#E2E8F0]"}`}>{sec.count}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ViolationTreeDrawer({ open, onOpenChange, activeClass, activeCategory, activeRegBase, onSelect }) {
  return (
    <>
      {open && <div className="fixed inset-0 bg-black/30 z-40 sm:hidden" onClick={() => onOpenChange(false)} />}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-[280px] bg-white border-r shadow-lg transform transition-transform duration-200 sm:hidden ${open ? "translate-x-0" : "-translate-x-full"}`}
        data-testid="tree-drawer"
      >
        <div className="flex items-center justify-between px-3 py-3 border-b bg-[#002855]">
          <span className="text-sm font-semibold text-white" style={{ fontFamily: "Outfit, sans-serif" }}>Browse by Type</span>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="h-7 w-7 p-0 text-white/70 hover:text-white hover:bg-white/10" data-testid="tree-drawer-close">
            <X className="w-4 h-4" />
          </Button>
        </div>
        <ScrollArea className="h-[calc(100vh-50px)]">
          <ViolationTree
            activeClass={activeClass}
            activeCategory={activeCategory}
            activeRegBase={activeRegBase}
            onSelect={(cls, cat, regBase) => {
              onSelect(cls, cat, regBase);
              onOpenChange(false);
            }}
            className="py-2"
          />
        </ScrollArea>
      </div>
    </>
  );
}
