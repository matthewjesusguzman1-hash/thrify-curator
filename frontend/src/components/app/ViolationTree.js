import { useState, useEffect } from "react";
import { ChevronRight, ChevronDown, FolderTree, X, Truck, AlertTriangle, User, Building2, Star } from "lucide-react";
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

export function ViolationTree({ activeClass, activeCategory, activeRegBase, onSelect, className = "", mobile = false, favorites = [], onToggleFavorite, onFavoriteClick, liteMode = false }) {
  const [tree, setTree] = useState({});
  const [loading, setLoading] = useState(true);
  const [favOpen, setFavOpen] = useState(false);
  // Section expand state (Driver, Vehicle, HazMat, Other) — start collapsed
  const [sectionOpen, setSectionOpen] = useState({});
  // Reg section expand state (deepest level)
  const [regOpen, setRegOpen] = useState({});

  useEffect(() => { fetchTree(); }, [liteMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchTree = async () => {
    setLoading(true);
    try {
      const url = liteMode ? `${API}/violations/tree?level_iii=Y` : `${API}/violations/tree`;
      const res = await axios.get(url);
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

  // Lite mode: merge non-"All Other" Vehicle categories into the Driver section
  // so Level III inspectors see one combined list, and drop Vehicle + HazMat
  // as standalone sections. Categories keep parentClass="Vehicle" so clicking
  // them still filters by the correct class.
  const liteDriverData = (() => {
    const driver = tree["Driver"] || { count: 0, categories: [] };
    const vehicle = tree["Vehicle"] || { count: 0, categories: [] };
    const vehCats = vehicle.categories
      .filter((c) => !/all\s+other/i.test(c.name))
      .map((c) => ({ ...c, parentClass: "Vehicle" }));
    const driverCats = driver.categories.map((c) => ({ ...c, parentClass: "Driver" }));
    const cats = [...driverCats, ...vehCats];
    return { count: cats.reduce((s, c) => s + (c.count || 0), 0), categories: cats };
  })();

  const getData = (key) => {
    if (key === "_other") return otherData;
    if (liteMode && key === "Driver") return liteDriverData;
    return tree[key] || { count: 0, categories: [] };
  };

  return (
    <div className={className} data-testid="violation-tree">
      <div className="flex items-center gap-2 px-3 py-2 mb-1">
        <FolderTree className={`${mobile ? "w-4 h-4" : "w-3.5 h-3.5"} text-[#64748B]`} />
        <span className={`font-bold tracking-widest uppercase text-[#64748B] ${mobile ? "text-xs" : "text-[10px]"}`}>Violation Types</span>
      </div>

      {hasFilter && (
        <div className="px-3 mb-2">
          <button onClick={() => onSelect("", "", "")} className="text-[10px] text-[#DC2626] hover:text-[#B91C1C] font-medium" data-testid="tree-clear-filter">
            Clear filter
          </button>
        </div>
      )}

      <div className="space-y-0.5">
        {/* Favorites section */}
        {favorites.length > 0 && (
          <div className="mb-1">
            <button
              onClick={() => setFavOpen(!favOpen)}
              className={`flex items-center gap-2.5 w-full px-4 ${mobile ? "py-3" : "py-2"} rounded-md mx-1 cursor-pointer transition-colors hover:bg-[#D4AF37]/10`}
              data-testid="tree-favorites-toggle"
            >
              {favOpen ? <ChevronDown className="w-3 h-3 text-[#D4AF37]" /> : <ChevronRight className="w-3 h-3 text-[#D4AF37]" />}
              <Star className="w-3.5 h-3.5 fill-[#D4AF37] text-[#D4AF37]" />
              <span className={`font-semibold text-[#D4AF37] ${mobile ? "text-sm" : "text-xs"}`}>Favorites</span>
              <span className={`ml-auto font-mono text-[#D4AF37]/60 ${mobile ? "text-xs" : "text-[10px]"}`}>{favorites.length}</span>
            </button>
            {favOpen && (
              <div className="ml-6 mr-2 space-y-1 mt-0.5">
                {favorites.map((fav) => (
                  <div key={fav.violation_code || fav.regulatory_reference} className="flex items-start gap-1.5 px-2 py-1.5 rounded-md hover:bg-[#F1F5F9] transition-colors">
                    <button
                      onClick={() => onFavoriteClick?.(fav)}
                      className="flex-1 min-w-0 text-left"
                      data-testid={`fav-tree-${fav.violation_code || fav.regulatory_reference}`}
                    >
                      <span className={`font-bold text-[#002855] block ${mobile ? "text-xs" : "text-[11px]"}`}>{fav.regulatory_reference}</span>
                      <span className={`text-[#64748B] block leading-snug ${mobile ? "text-[11px]" : "text-[10px]"}`}>{fav.violation_text?.slice(0, 80)}{fav.violation_text?.length > 80 ? "..." : ""}</span>
                    </button>
                    <button
                      onClick={() => onToggleFavorite?.(fav)}
                      className="p-1.5 text-[#DC2626]/40 hover:text-[#DC2626] hover:bg-[#DC2626]/10 rounded transition-all flex-shrink-0 mt-0.5"
                      title="Remove from favorites"
                      data-testid={`fav-remove-${fav.violation_code || fav.regulatory_reference}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="h-px bg-[#E2E8F0] mx-3 my-1.5" />
          </div>
        )}

        {SECTIONS.filter((s) => !(liteMode && (s.key === "_other" || s.key === "Vehicle" || s.key === "Hazardous Materials"))).map((section) => {
          const data = getData(section.key);
          if (!data || data.count === 0) return null;
          const sKey = section.key;
          const isOpen = sectionOpen[sKey];
          const isActive = sKey !== "_other" && activeClass === sKey && !activeCategory && !activeRegBase;
          const Icon = section.icon;
          const sortedCats = [...data.categories].sort((a, b) => sortCatNum(a.name) - sortCatNum(b.name));
          const displayCount = data.count;
          if (displayCount === 0) return null;

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
                className={`flex items-center gap-2.5 px-4 ${mobile ? "py-3" : "py-2"} rounded-md mx-1 cursor-pointer transition-colors ${isActive ? "bg-[#002855] text-white" : "hover:bg-[#F1F5F9]"}`}
              >
                {/* Chevron — ONLY this toggles open/close */}
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    setSectionOpen((p) => ({ ...p, [sKey]: !p[sKey] }));
                  }}
                  className={`flex-shrink-0 cursor-pointer ${isActive ? "text-white/70" : "text-[#94A3B8]"}`}
                >
                  {isOpen ? <ChevronDown className={`${mobile ? "w-5 h-5" : "w-4 h-4"}`} /> : <ChevronRight className={`${mobile ? "w-5 h-5" : "w-4 h-4"}`} />}
                </span>
                <div className={`flex items-center justify-center ${mobile ? "w-7 h-7" : "w-5 h-5"} rounded flex-shrink-0 ${isActive ? "bg-white/20" : section.color}`}>
                  <Icon className={`${mobile ? "w-4 h-4" : "w-3 h-3"}`} />
                </div>
                <span className={`flex-1 text-left font-semibold ${mobile ? "text-sm" : "text-xs"} ${isActive ? "text-white" : "text-[#334155]"}`}>
                  {section.label}
                </span>
                <span className={`${mobile ? "text-xs" : "text-[9px]"} px-2 py-0.5 rounded-full ${isActive ? "bg-white/20 text-white" : "bg-[#F1F5F9] text-[#64748B]"}`}>{displayCount}</span>
              </div>

              {/* Categories — visible when section is open */}
              {isOpen && (
                <div className={`${mobile ? "ml-6 pl-4" : "ml-5 pl-3"} border-l border-[#E2E8F0] space-y-0.5 mt-0.5 mb-2`}>
                  {sortedCats.map((cat) => {
                    const catClass = cat.parentClass || sKey;
                    const rKey = `${catClass}|${cat.name}`;
                    const isRegsOpen = regOpen[rKey];
                    const isCatActive = activeClass === catClass && activeCategory === cat.name && !activeRegBase;

                    return (
                      <div key={`${catClass}-${cat.name}`}>
                        <div
                          onClick={() => {
                            onSelect(catClass, isCatActive ? "" : cat.name, "");
                            if (cat.sections?.length > 0) {
                              setRegOpen((p) => ({ ...p, [rKey]: true }));
                            }
                          }}
                          className={`flex items-center gap-1.5 px-2 ${mobile ? "py-2.5" : "py-1"} rounded-md cursor-pointer transition-colors ${isCatActive ? "bg-[#002855]/10" : "hover:bg-[#F8FAFC]"}`}
                        >
                          {cat.sections?.length > 0 ? (
                            <span
                              onClick={(e) => { e.stopPropagation(); setRegOpen((p) => ({ ...p, [rKey]: !p[rKey] })); }}
                              className="text-[#CBD5E1] flex-shrink-0 cursor-pointer hover:text-[#64748B]"
                            >
                              {isRegsOpen ? <ChevronDown className={`${mobile ? "w-4 h-4" : "w-3 h-3"}`} /> : <ChevronRight className={`${mobile ? "w-4 h-4" : "w-3 h-3"}`} />}
                            </span>
                          ) : <span className={`${mobile ? "w-4" : "w-3"}`} />}
                          <span className={`flex-1 text-left truncate ${mobile ? "text-[13px]" : "text-[11px]"} ${isCatActive ? "font-semibold text-[#002855]" : "text-[#64748B]"}`}>
                            {cat.name}
                          </span>
                          <span className={`${mobile ? "text-[11px]" : "text-[9px]"} flex-shrink-0 ${isCatActive ? "text-[#002855]" : "text-[#CBD5E1]"}`}>{cat.count}</span>
                        </div>

                        {isRegsOpen && cat.sections?.length > 0 && (
                          <div className={`${mobile ? "ml-5 pl-4" : "ml-4 pl-3"} border-l border-[#F1F5F9] space-y-0.5 my-0.5`}>
                            {cat.sections.map((sec) => {
                              const isSecActive = activeClass === catClass && activeCategory === cat.name && activeRegBase === sec.ref;
                              const vioKey = `v-${catClass}|${cat.name}|${sec.ref}`;
                              const isViosOpen = regOpen[vioKey];
                              const hasVios = sec.violations && sec.violations.length > 0;

                              return (
                                <div key={sec.ref}>
                                  <div
                                    onClick={() => {
                                      onSelect(catClass, cat.name, isSecActive ? "" : sec.ref);
                                      if (hasVios) setRegOpen((p) => ({ ...p, [vioKey]: true }));
                                    }}
                                    className={`px-2 ${mobile ? "py-2" : "py-1"} rounded cursor-pointer transition-colors ${isSecActive ? "bg-[#D4AF37]/15" : "hover:bg-[#F8FAFC]"}`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-1">
                                        {hasVios && (
                                          <span
                                            onClick={(e) => { e.stopPropagation(); setRegOpen((p) => ({ ...p, [vioKey]: !p[vioKey] })); }}
                                            className="text-[#CBD5E1] flex-shrink-0 cursor-pointer"
                                          >
                                            {isViosOpen ? <ChevronDown className={`${mobile ? "w-3.5 h-3.5" : "w-2.5 h-2.5"}`} /> : <ChevronRight className={`${mobile ? "w-3.5 h-3.5" : "w-2.5 h-2.5"}`} />}
                                          </span>
                                        )}
                                        <span className={`${mobile ? "text-xs" : "text-[10px]"} font-mono ${isSecActive ? "text-[#002855] font-semibold" : "text-[#64748B]"}`}>{sec.ref}</span>
                                      </div>
                                      <span className={`${mobile ? "text-[11px]" : "text-[9px]"} ${isSecActive ? "text-[#D4AF37]" : "text-[#E2E8F0]"}`}>{sec.count}</span>
                                    </div>
                                    {sec.label && (
                                      <p className={`${mobile ? "text-[11px]" : "text-[9px]"} leading-tight mt-0.5 ${hasVios ? "ml-4" : ""} ${isSecActive ? "text-[#002855]/70" : "text-[#B0BEC5]"}`}>{sec.label}</p>
                                    )}
                                  </div>

                                  {isViosOpen && hasVios && (
                                    <div className={`${mobile ? "ml-6 pl-3" : "ml-5 pl-2"} border-l border-[#F8FAFC] space-y-0.5 my-0.5`}>
                                      {sec.violations.map((vio, idx) => (
                                        <div
                                          key={vio.id || idx}
                                          className={`px-2 ${mobile ? "py-1.5" : "py-0.5"} rounded ${mobile ? "text-[11px]" : "text-[9px]"} leading-tight text-[#94A3B8] hover:bg-[#F8FAFC] hover:text-[#64748B] cursor-default flex items-start gap-1.5`}
                                        >
                                          {vio.oos === "Y" && (
                                            <span className={`${mobile ? "text-[8px]" : "text-[7px]"} px-1 py-0 bg-[#DC2626] text-white rounded font-bold flex-shrink-0 mt-0.5`}>OOS</span>
                                          )}
                                          <span>{vio.short}</span>
                                        </div>
                                      ))}
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
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ViolationTreeDrawer({ open, onOpenChange, activeClass, activeCategory, activeRegBase, onSelect, favorites = [], onToggleFavorite, onFavoriteClick, liteMode = false }) {
  const [splitPct, setSplitPct] = useState(50);
  const [headerH, setHeaderH] = useState(70);

  useEffect(() => {
    if (open) {
      const h = document.querySelector('[data-testid="app-header"]');
      if (h) setHeaderH(h.getBoundingClientRect().height);
    }
  }, [open]);
  const dragRef = { current: null };

  const handleDragStart = (e) => {
    e.preventDefault();
    const startY = e.touches ? e.touches[0].clientY : e.clientY;
    const startPct = splitPct;
    const vh = window.innerHeight;

    const onMove = (ev) => {
      const y = ev.touches ? ev.touches[0].clientY : ev.clientY;
      const delta = y - startY;
      const newPct = Math.min(75, Math.max(10, startPct + (delta / vh) * 100));
      setSplitPct(Math.round(newPct));
    };
    const onEnd = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onEnd);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onEnd);
      // Auto-close if dragged below 15%
      if (splitPct < 15) onOpenChange(false);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onEnd);
    document.addEventListener("touchmove", onMove, { passive: false });
    document.addEventListener("touchend", onEnd);
  };

  return (
    <>
      {open && (
        <>
          {/* Backdrop — tap to close */}
          <div
            className="fixed inset-0 z-30 lg:hidden"
            onClick={() => onOpenChange(false)}
            data-testid="tree-drawer-backdrop"
          />
          <div className="fixed inset-x-0 z-40 lg:hidden" style={{ top: `${headerH}px`, height: `calc(${splitPct}vh - ${headerH}px)` }}>
            <div className="h-full bg-white flex flex-col shadow-lg">
              <div className="flex items-center justify-between px-4 py-2.5 border-b bg-[#002855] flex-shrink-0">
                <span className="text-sm font-semibold text-white" style={{ fontFamily: "Outfit, sans-serif" }}>Violation Tree</span>
                <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="h-8 px-4 text-white/70 hover:text-white hover:bg-white/10 text-xs font-medium" data-testid="tree-drawer-close">
                  Done
                </Button>
              </div>
            <ScrollArea className="flex-1">
              <ViolationTree
                activeClass={activeClass}
                activeCategory={activeCategory}
                activeRegBase={activeRegBase}
                onSelect={onSelect}
                className="py-2"
                mobile
                favorites={favorites}
                onToggleFavorite={onToggleFavorite}
                onFavoriteClick={onFavoriteClick}
                liteMode={liteMode}
              />
            </ScrollArea>
            {/* Drag handle to resize */}
            <div
              onMouseDown={handleDragStart}
              onTouchStart={handleDragStart}
              className="h-6 flex items-center justify-center cursor-row-resize bg-[#F1F5F9] border-t border-b-2 border-[#D4AF37] flex-shrink-0 active:bg-[#E2E8F0]"
              data-testid="split-drag-handle"
            >
              <div className="w-10 h-1 rounded-full bg-[#94A3B8]" />
            </div>
          </div>
        </div>
        </>
      )}
    </>
  );
}
