import { useState, useEffect } from "react";
import { ChevronRight, ChevronDown, FolderTree, X, Truck, AlertTriangle, User, Building2, Container } from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { ScrollArea } from "../ui/scroll-area";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CLASS_ICONS = {
  "Vehicle": Truck,
  "Hazardous Materials": AlertTriangle,
  "Driver": User,
  "Motor Carrier": Building2,
  "Intermodal Equip Provider": Container,
};

const CLASS_COLORS = {
  "Vehicle": "text-emerald-600 bg-emerald-50",
  "Hazardous Materials": "text-amber-600 bg-amber-50",
  "Driver": "text-blue-600 bg-blue-50",
  "Motor Carrier": "text-purple-600 bg-purple-50",
  "Intermodal Equip Provider": "text-slate-600 bg-slate-50",
};

export function ViolationTree({ activeClass, activeCategory, activeRegBase, onSelect, className = "" }) {
  const [tree, setTree] = useState({});
  const [expandedClasses, setExpandedClasses] = useState({});
  const [expandedCats, setExpandedCats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchTree(); }, []);

  useEffect(() => {
    if (activeClass) setExpandedClasses((p) => ({ ...p, [activeClass]: true }));
    if (activeClass && activeCategory) setExpandedCats((p) => ({ ...p, [`${activeClass}|${activeCategory}`]: true }));
  }, [activeClass, activeCategory]);

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

  const hasActiveTreeFilter = activeClass || activeCategory || activeRegBase;

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-8 ${className}`}>
        <div className="w-5 h-5 border-2 border-[#002855] border-t-transparent rounded-full loading-spin" />
      </div>
    );
  }

  const sortedClasses = Object.keys(tree).sort();

  return (
    <div className={className} data-testid="violation-tree">
      <div className="flex items-center gap-2 px-3 py-2 mb-1">
        <FolderTree className="w-3.5 h-3.5 text-[#64748B]" />
        <span className="text-[10px] font-bold tracking-widest uppercase text-[#64748B]">Violation Types</span>
      </div>

      {hasActiveTreeFilter && (
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
        {sortedClasses.map((cls) => {
          const data = tree[cls];
          const isClassExpanded = expandedClasses[cls];
          const isClassActive = activeClass === cls && !activeCategory && !activeRegBase;
          const Icon = CLASS_ICONS[cls] || Truck;
          const colorClass = CLASS_COLORS[cls] || "text-gray-600 bg-gray-50";

          return (
            <div key={cls}>
              {/* Class level */}
              <div className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors rounded-md mx-1 ${isClassActive ? "bg-[#002855] text-white" : "hover:bg-[#F1F5F9]"}`}>
                <button
                  onClick={() => setExpandedClasses((p) => ({ ...p, [cls]: !p[cls] }))}
                  className={`flex-shrink-0 ${isClassActive ? "text-white/70" : "text-[#94A3B8]"}`}
                >
                  {isClassExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                </button>
                <div className={`flex items-center justify-center w-5 h-5 rounded flex-shrink-0 ${isClassActive ? "bg-white/20" : colorClass}`}>
                  <Icon className="w-3 h-3" />
                </div>
                <button
                  onClick={() => onSelect(cls === activeClass && !activeCategory ? "" : cls, "", "")}
                  className={`flex-1 text-left text-xs font-medium truncate ${isClassActive ? "text-white" : "text-[#334155]"}`}
                >
                  {cls}
                </button>
                <Badge variant="secondary" className={`text-[9px] px-1.5 py-0 ${isClassActive ? "bg-white/20 text-white" : "bg-[#F1F5F9] text-[#64748B]"}`}>
                  {data.count}
                </Badge>
              </div>

              {/* Category level */}
              {isClassExpanded && (
                <div className="ml-5 pl-3 border-l border-[#E2E8F0] space-y-0.5 my-0.5">
                  {data.categories.map((cat) => {
                    const catKey = `${cls}|${cat.name}`;
                    const isCatExpanded = expandedCats[catKey];
                    const isCatActive = activeClass === cls && activeCategory === cat.name && !activeRegBase;

                    return (
                      <div key={cat.name}>
                        <div className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md transition-colors ${isCatActive ? "bg-[#002855]/10 text-[#002855]" : "hover:bg-[#F8FAFC]"}`}>
                          {cat.sections.length > 0 && (
                            <button
                              onClick={() => setExpandedCats((p) => ({ ...p, [catKey]: !p[catKey] }))}
                              className="text-[#CBD5E1] flex-shrink-0"
                            >
                              {isCatExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                            </button>
                          )}
                          {cat.sections.length === 0 && <span className="w-3" />}
                          <button
                            onClick={() => onSelect(cls, cat.name === activeCategory && activeClass === cls ? "" : cat.name, "")}
                            className={`flex-1 text-left text-[11px] truncate ${isCatActive ? "font-medium text-[#002855]" : "text-[#64748B]"}`}
                          >
                            {cat.name}
                          </button>
                          <span className={`text-[9px] flex-shrink-0 ${isCatActive ? "text-[#002855]" : "text-[#CBD5E1]"}`}>
                            {cat.count}
                          </span>
                        </div>

                        {/* Section level */}
                        {isCatExpanded && cat.sections.length > 0 && (
                          <div className="ml-4 pl-3 border-l border-[#F1F5F9] space-y-0.5 my-0.5">
                            {cat.sections.map((sec) => {
                              const isSecActive = activeClass === cls && activeCategory === cat.name && activeRegBase === sec.ref;
                              return (
                                <button
                                  key={sec.ref}
                                  onClick={() => onSelect(cls, cat.name, sec.ref === activeRegBase ? "" : sec.ref)}
                                  className={`w-full text-left flex items-center justify-between px-2 py-1 rounded transition-colors ${
                                    isSecActive
                                      ? "bg-[#D4AF37]/15 text-[#002855] font-medium"
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
      {open && (
        <div className="fixed inset-0 bg-black/30 z-40 sm:hidden" onClick={() => onOpenChange(false)} />
      )}
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
