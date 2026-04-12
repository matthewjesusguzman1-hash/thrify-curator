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

export function ViolationTree({ activeClass, activeCategory, onSelect, className = "" }) {
  const [tree, setTree] = useState({});
  const [expanded, setExpanded] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTree();
  }, []);

  // Auto-expand the active class
  useEffect(() => {
    if (activeClass) {
      setExpanded((prev) => ({ ...prev, [activeClass]: true }));
    }
  }, [activeClass]);

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

  const toggleExpand = (cls) => {
    setExpanded((prev) => ({ ...prev, [cls]: !prev[cls] }));
  };

  const handleClassClick = (cls) => {
    if (activeClass === cls && !activeCategory) {
      onSelect("", "");
    } else {
      onSelect(cls, "");
    }
  };

  const handleCategoryClick = (cls, cat) => {
    if (activeClass === cls && activeCategory === cat) {
      onSelect(cls, "");
    } else {
      onSelect(cls, cat);
    }
  };

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

      {activeClass && (
        <div className="px-3 mb-2">
          <button
            onClick={() => onSelect("", "")}
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
          const isExpanded = expanded[cls];
          const isActive = activeClass === cls && !activeCategory;
          const Icon = CLASS_ICONS[cls] || Truck;
          const colorClass = CLASS_COLORS[cls] || "text-gray-600 bg-gray-50";

          return (
            <div key={cls} data-testid={`tree-class-${cls}`}>
              {/* Class node */}
              <div
                className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors rounded-md mx-1 ${
                  isActive ? "bg-[#002855] text-white" : "hover:bg-[#F1F5F9]"
                }`}
              >
                <button
                  onClick={() => toggleExpand(cls)}
                  className={`flex-shrink-0 ${isActive ? "text-white/70" : "text-[#94A3B8]"}`}
                  data-testid={`tree-expand-${cls}`}
                >
                  {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                </button>
                <div
                  className={`flex items-center justify-center w-5 h-5 rounded flex-shrink-0 ${isActive ? "bg-white/20" : colorClass}`}
                >
                  <Icon className="w-3 h-3" />
                </div>
                <button
                  onClick={() => handleClassClick(cls)}
                  className={`flex-1 text-left text-xs font-medium truncate ${isActive ? "text-white" : "text-[#334155]"}`}
                  data-testid={`tree-select-${cls}`}
                >
                  {cls}
                </button>
                <Badge
                  variant="secondary"
                  className={`text-[9px] px-1.5 py-0 ${isActive ? "bg-white/20 text-white" : "bg-[#F1F5F9] text-[#64748B]"}`}
                >
                  {data.count}
                </Badge>
              </div>

              {/* Categories */}
              {isExpanded && (
                <div className="ml-5 pl-3 border-l border-[#E2E8F0] space-y-0.5 my-0.5">
                  {data.categories.map((cat) => {
                    const isCatActive = activeClass === cls && activeCategory === cat.name;
                    return (
                      <button
                        key={cat.name}
                        onClick={() => handleCategoryClick(cls, cat.name)}
                        className={`w-full text-left flex items-center justify-between px-3 py-1.5 rounded-md transition-colors ${
                          isCatActive
                            ? "bg-[#002855]/10 text-[#002855] font-medium"
                            : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#334155]"
                        }`}
                        data-testid={`tree-cat-${cat.name}`}
                      >
                        <span className="text-[11px] truncate">{cat.name}</span>
                        <span className={`text-[9px] flex-shrink-0 ml-2 ${isCatActive ? "text-[#002855]" : "text-[#CBD5E1]"}`}>
                          {cat.count}
                        </span>
                      </button>
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

export function ViolationTreeDrawer({ open, onOpenChange, activeClass, activeCategory, onSelect }) {
  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/30 z-40 sm:hidden"
          onClick={() => onOpenChange(false)}
        />
      )}
      {/* Drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-[280px] bg-white border-r shadow-lg transform transition-transform duration-200 sm:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        data-testid="tree-drawer"
      >
        <div className="flex items-center justify-between px-3 py-3 border-b bg-[#002855]">
          <span className="text-sm font-semibold text-white" style={{ fontFamily: "Outfit, sans-serif" }}>
            Browse by Type
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-7 w-7 p-0 text-white/70 hover:text-white hover:bg-white/10"
            data-testid="tree-drawer-close"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        <ScrollArea className="h-[calc(100vh-50px)]">
          <ViolationTree
            activeClass={activeClass}
            activeCategory={activeCategory}
            onSelect={(cls, cat) => {
              onSelect(cls, cat);
              onOpenChange(false);
            }}
            className="py-2"
          />
        </ScrollArea>
      </div>
    </>
  );
}
