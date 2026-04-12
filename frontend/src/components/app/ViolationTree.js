import { useState, useEffect } from "react";
import { ChevronRight, ChevronDown, FolderTree, X, Truck, AlertTriangle, User, Building2 } from "lucide-react";
import { Button } from "../ui/button";
import { ScrollArea } from "../ui/scroll-area";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SECTIONS = [
  { key: "Driver", label: "Driver", icon: User, color: "text-blue-600 bg-blue-50" },
  { key: "Vehicle", label: "Vehicle", icon: Truck, color: "text-emerald-600 bg-emerald-50" },
  { key: "Hazardous Materials", label: "HazMat", icon: AlertTriangle, color: "text-amber-600 bg-amber-50" },
  { key: "_other", label: "Other", icon: Building2, color: "text-slate-600 bg-slate-50" },
];

function sortCatNum(name) {
  const m = name.match(/^(\d+)/);
  return m ? parseInt(m[1], 10) : 9999;
}

export function ViolationTree({ activeClass, activeCategory, activeRegBase, onSelect, className = "" }) {
  const [tree, setTree] = useState({});
  const [loading, setLoading] = useState(true);
  // Section expand state (Driver, Vehicle, HazMat, Other) — start collapsed
  const [sectionOpen, setSectionOpen] = useState({});
  // Reg section expand state (deepest level)
  const [regOpen, setRegOpen] = useState({});

  useEffect(() => { fetchTree(); }, []);

  const fetchTree = async () => {
    try {
      const res = await axios.get(`${API}/violations/tree`);
      setTree(res.data.tree || {});
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  const hasFilter = activeClass || activeCategory || activeRegBase;

  if (loading) {
    return <div className={`flex items-center justify-center py-8 ${className}`}><div className="w-5 h-5 border-2 border-[#002855] border-t-transparent rounded-full loading-spin" /></div>;
  }

  const mainKeys = ["Driver", "Vehicle", "Hazardous Materials"];
  const otherKeys = Object.keys(tree).filter((k) => !mainKeys.includes(k)).sort();
  const otherData = {
    count: otherKeys.reduce((s, k) => s + (tree[k]?.count || 0), 0),
    categories: otherKeys.flatMap((k) => (tree[k]?.categories || []).map((c) => ({ ...c, parentClass: k }))),
  };
  const getData = (key) => key === "_other" ? otherData : (tree[key] || { count: 0, categories: [] });

  return (
    <div className={className} data-testid="violation-tree">
      <div className="flex items-center gap-2 px-3 py-2 mb-1">
        <FolderTree className="w-3.5 h-3.5 text-[#64748B]" />
        <span className="text-[10px] font-bold tracking-widest uppercase text-[#64748B]">Violation Types</span>
      </div>

      {hasFilter && (
        <div className="px-3 mb-2">
          <button onClick={() => onSelect("", "", "")} className="text-[10px] text-[#DC2626] hover:text-[#B91C1C] font-medium" data-testid="tree-clear-filter">
            Clear filter
          </button>
        </div>
      )}

      <div className="space-y-0.5">
        {SECTIONS.map((section) => {
          const data = getData(section.key);
          if (!data || data.count === 0) return null;
          const sKey = section.key;
          const isOpen = sectionOpen[sKey];
          const isActive = sKey !== "_other" && activeClass === sKey && !activeCategory && !activeRegBase;
          const Icon = section.icon;
          const sortedCats = [...data.categories].sort((a, b) => sortCatNum(a.name) - sortCatNum(b.name));

          return (
            <div key={sKey}>
              {/* Section header */}
              <div
                onClick={() => {
                  // Always open the section when clicking
                  setSectionOpen((p) => ({ ...p, [sKey]: true }));
                  // Set filter
                  if (sKey !== "_other") {
                    onSelect(isActive ? "" : sKey, "", "");
                  }
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-md mx-1 cursor-pointer transition-colors ${isActive ? "bg-[#002855] text-white" : "hover:bg-[#F1F5F9]"}`}
              >
                {/* Chevron — ONLY this toggles open/close */}
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    setSectionOpen((p) => ({ ...p, [sKey]: !p[sKey] }));
                  }}
                  className={`flex-shrink-0 cursor-pointer ${isActive ? "text-white/70" : "text-[#94A3B8]"}`}
                >
                  {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </span>
                <div className={`flex items-center justify-center w-5 h-5 rounded flex-shrink-0 ${isActive ? "bg-white/20" : section.color}`}>
                  <Icon className="w-3 h-3" />
                </div>
                <span className={`flex-1 text-left text-xs font-semibold ${isActive ? "text-white" : "text-[#334155]"}`}>
                  {section.label}
                </span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${isActive ? "bg-white/20 text-white" : "bg-[#F1F5F9] text-[#64748B]"}`}>{data.count}</span>
              </div>

              {/* Categories — visible when section is open */}
              {isOpen && (
                <div className="ml-5 pl-3 border-l border-[#E2E8F0] space-y-0.5 mt-0.5 mb-2">
                  {sortedCats.map((cat) => {
                    const catClass = cat.parentClass || sKey;
                    const rKey = `${catClass}|${cat.name}`;
                    const isRegsOpen = regOpen[rKey];
                    const isCatActive = activeClass === catClass && activeCategory === cat.name && !activeRegBase;

                    return (
                      <div key={`${catClass}-${cat.name}`}>
                        <div
                          onClick={() => onSelect(catClass, isCatActive ? "" : cat.name, "")}
                          className={`flex items-center gap-1.5 px-2 py-1 rounded-md cursor-pointer transition-colors ${isCatActive ? "bg-[#002855]/10" : "hover:bg-[#F8FAFC]"}`}
                        >
                          {cat.sections?.length > 0 ? (
                            <span
                              onClick={(e) => { e.stopPropagation(); setRegOpen((p) => ({ ...p, [rKey]: !p[rKey] })); }}
                              className="text-[#CBD5E1] flex-shrink-0 cursor-pointer hover:text-[#64748B]"
                            >
                              {isRegsOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                            </span>
                          ) : <span className="w-3" />}
                          <span className={`flex-1 text-left text-[11px] truncate ${isCatActive ? "font-semibold text-[#002855]" : "text-[#64748B]"}`}>
                            {cat.name}
                          </span>
                          <span className={`text-[9px] flex-shrink-0 ${isCatActive ? "text-[#002855]" : "text-[#CBD5E1]"}`}>{cat.count}</span>
                        </div>

                        {isRegsOpen && cat.sections?.length > 0 && (
                          <div className="ml-4 pl-3 border-l border-[#F1F5F9] space-y-0.5 my-0.5">
                            {cat.sections.map((sec) => {
                              const isSecActive = activeClass === catClass && activeCategory === cat.name && activeRegBase === sec.ref;
                              return (
                                <div
                                  key={sec.ref}
                                  onClick={() => onSelect(catClass, cat.name, isSecActive ? "" : sec.ref)}
                                  className={`px-2 py-1 rounded cursor-pointer transition-colors ${isSecActive ? "bg-[#D4AF37]/15" : "hover:bg-[#F8FAFC]"}`}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className={`text-[10px] font-mono ${isSecActive ? "text-[#002855] font-semibold" : "text-[#64748B]"}`}>{sec.ref}</span>
                                    <span className={`text-[9px] ${isSecActive ? "text-[#D4AF37]" : "text-[#E2E8F0]"}`}>{sec.count}</span>
                                  </div>
                                  {sec.label && (
                                    <p className={`text-[9px] leading-tight mt-0.5 ${isSecActive ? "text-[#002855]/70" : "text-[#B0BEC5]"}`}>{sec.label}</p>
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
      {open && <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={() => onOpenChange(false)} />}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-[280px] bg-white border-r shadow-lg transform transition-transform duration-200 lg:hidden ${open ? "translate-x-0" : "-translate-x-full"}`}
        data-testid="tree-drawer"
      >
        <div className="flex items-center justify-between px-3 py-3 border-b bg-[#002855]">
          <span className="text-sm font-semibold text-white" style={{ fontFamily: "Outfit, sans-serif" }}>Browse by Type</span>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="h-7 w-7 p-0 text-white/70 hover:text-white hover:bg-white/10" data-testid="tree-drawer-close">
            <X className="w-4 h-4" />
          </Button>
        </div>
        <ScrollArea className="h-[calc(100vh-50px)]">
          {/* Selections do NOT close the drawer — user closes it manually */}
          <ViolationTree
            activeClass={activeClass}
            activeCategory={activeCategory}
            activeRegBase={activeRegBase}
            onSelect={onSelect}
            className="py-2"
          />
        </ScrollArea>
      </div>
    </>
  );
}
