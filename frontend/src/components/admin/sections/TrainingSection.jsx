/**
 * Training Section — Reference guides for Photography and Listing
 * Admin can view guides and assign training to employees by name
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera, BookOpen, GraduationCap, Users, Plus, X, Trash2,
  ChevronDown, ChevronUp, Package, Tag, FileText, FolderOpen,
  Monitor, ShoppingBag, Loader2, Check, UserPlus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// ── Photography Training Content ──────────────────────────

const PHOTOGRAPHY_STEPS = [
  {
    title: "1. Prep the Item",
    icon: Package,
    steps: [
      "Remove items from storage bags/bins",
      "Steam or lint-roll wrinkled items",
      "Check for stains, damage, or missing parts — note everything"
    ]
  },
  {
    title: "2. Set Up for Photos",
    icon: Camera,
    steps: [
      "Use natural light or a lightbox/ring light",
      "Use a clean, solid-color background (white or neutral)",
      "Avoid shadows, clutter, or uneven lighting"
    ]
  },
  {
    title: "3. Take Required Photos",
    icon: FileText,
    steps: [
      "Front view (full item, centered)",
      "Back view",
      "Close-up of brand/label tag",
      "Close-up of size tag",
      "Any flaws or damage (stains, holes, pilling)",
      "Close-up of fabric content/care tag",
      "Detail shots (zippers, buttons, embroidery, hardware)",
      "Measurement photo with tape measure (if needed)"
    ]
  },
  {
    title: "4. Capture Measurements",
    icon: Tag,
    steps: [
      "Lay item flat on a clean surface",
      "Use a soft measuring tape",
      "Common measurements: pit-to-pit (chest), length, sleeve length, waist, inseam, rise",
      "Record in inches and note if flat or stretched",
      "For shoes: outsole length, width, insole measurement"
    ]
  },
  {
    title: "5. Photo Description",
    icon: FileText,
    steps: [
      "Log item brand, size, color, fabric, and condition in notes or a shared document",
      "Flag anything notable: stains, missing buttons, stretched elastic"
    ]
  },
  {
    title: "6. SKU & Cost Tracking",
    icon: Tag,
    steps: [
      "Assign an internal SKU or lot number",
      "Record purchase price/cost for profit tracking",
      "Label storage bins with SKU references"
    ]
  },
  {
    title: "7. Bag & Store",
    icon: FolderOpen,
    steps: [
      "Place item in a clear poly bag or labeled storage bin",
      "Store in a way that keeps it accessible for shipping",
      "Organize by category, size, or SKU for easy retrieval"
    ]
  }
];

// ── Listing Training Content (from Vendoo Guide) ─────────

const LISTING_STEPS = [
  {
    title: "1. Preparing Items in Vendoo",
    icon: Package,
    steps: [
      "Log into Vendoo (vendoo.co) — the central hub for all cross-listing",
      "Click 'List an Item' to create a new listing",
      "Upload all photos taken during the Photography phase",
      "Fill in: Title, Description, Category, Brand, Size, Color, Condition",
      "Add SKU number and purchase price for tracking",
      "Use Vendoo's AI Description feature to auto-generate descriptions"
    ]
  },
  {
    title: "2. Cross-List to Poshmark",
    icon: ShoppingBag,
    steps: [
      "In Vendoo, select Poshmark as a marketplace to list on",
      "Set the listing price (Poshmark takes 20% commission)",
      "Select the correct category and subcategory",
      "Add relevant style tags for search visibility",
      "Set shipping: Poshmark provides a prepaid label for standard packages",
      "Review and click 'List' — Vendoo pushes the listing to Poshmark"
    ]
  },
  {
    title: "3. Cross-List to eBay",
    icon: Monitor,
    steps: [
      "In Vendoo, select eBay as a marketplace",
      "Choose listing format: Fixed Price (Buy It Now) or Auction",
      "Set your price — eBay final value fee is ~13%",
      "Select condition: 'Pre-owned', 'New with tags', etc.",
      "Fill in item specifics: Brand, Size, Color, Material, Style",
      "Set shipping: Calculated or flat rate (USPS, FedEx, UPS)",
      "Add return policy (recommended: 30-day returns for better visibility)",
      "Review and click 'List'"
    ]
  },
  {
    title: "4. Cross-List to Mercari",
    icon: ShoppingBag,
    steps: [
      "In Vendoo, select Mercari as a marketplace",
      "Set your price — Mercari takes 10% commission",
      "Select brand, category, and condition",
      "Choose shipping: Mercari prepaid label or ship on your own",
      "Smart Pricing: optionally enable auto-price drops for faster sales",
      "Review and click 'List'"
    ]
  },
  {
    title: "5. Cross-List to Depop",
    icon: ShoppingBag,
    steps: [
      "In Vendoo, select Depop as a marketplace",
      "Set your price — Depop charges no seller fees (buyer pays)",
      "Add hashtags and style descriptors popular with Depop's audience",
      "Category and subcategory should match the item type",
      "Shipping: Set via Depop's shipping options (USPS typically)",
      "Review and click 'List'"
    ]
  },
  {
    title: "6. After Listing — Manage & Delist",
    icon: FileText,
    steps: [
      "When an item sells on one platform, use Vendoo to delist from all others",
      "Click 'Mark as Sold' in Vendoo — this removes it from active platforms",
      "Track your sales data in Vendoo's analytics dashboard",
      "Ship within the required window (typically 3 business days)",
      "Update inventory CSV if using the Thrifty Curator sales import"
    ]
  }
];

function TrainingGuide({ title, icon: Icon, steps, color }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-[#e5e5e5] rounded-xl overflow-hidden bg-white">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-4 hover:bg-[#fafafa] transition-colors"
      >
        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}15` }}>
          <Icon className="w-4.5 h-4.5" style={{ color }} />
        </div>
        <span className="font-medium text-sm text-[#333] flex-1 text-left">{title}</span>
        {expanded ? <ChevronUp className="w-4 h-4 text-[#aaa]" /> : <ChevronDown className="w-4 h-4 text-[#aaa]" />}
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4">
              {steps.map((section, i) => (
                <div key={i} className="bg-[#fafafa] rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <section.icon className="w-4 h-4" style={{ color }} />
                    <h4 className="font-medium text-sm text-[#333]">{section.title}</h4>
                  </div>
                  <ul className="space-y-1.5 ml-6">
                    {section.steps.map((step, j) => (
                      <li key={j} className="text-xs text-[#555] flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#ccc] mt-1.5 flex-shrink-0" />
                        {step}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AssignmentPanel({ getAuthHeader }) {
  const [employees, setEmployees] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState("");
  const [selectedType, setSelectedType] = useState("photography");

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [empRes, assignRes] = await Promise.all([
        axios.get(`${API}/training-assignments/employees`, getAuthHeader()),
        axios.get(`${API}/training-assignments/`, getAuthHeader()),
      ]);
      setEmployees(empRes.data.employees || []);
      setAssignments(assignRes.data.assignments || []);
    } catch (err) {
      toast.error("Failed to load training data");
    } finally {
      setLoading(false);
    }
  };

  const assign = async () => {
    if (!selectedEmp) { toast.info("Select an employee"); return; }
    setAssigning(true);
    try {
      await axios.post(`${API}/training-assignments/`, {
        employee_id: selectedEmp,
        training_type: selectedType,
      }, getAuthHeader());
      toast.success("Training assigned!");
      setSelectedEmp("");
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to assign");
    } finally {
      setAssigning(false);
    }
  };

  const remove = async (id) => {
    try {
      await axios.delete(`${API}/training-assignments/${id}`, getAuthHeader());
      toast.success("Assignment removed");
      fetchData();
    } catch {
      toast.error("Failed to remove");
    }
  };

  if (loading) return <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-[#aaa]" /></div>;

  return (
    <div className="border border-[#e5e5e5] rounded-xl p-4 bg-white" data-testid="training-assignments-panel">
      <div className="flex items-center gap-2 mb-3">
        <UserPlus className="w-4 h-4 text-[#8B5CF6]" />
        <h3 className="font-medium text-sm text-[#333]">Assign Training</h3>
      </div>

      {/* Assign form */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <select
          value={selectedEmp}
          onChange={(e) => setSelectedEmp(e.target.value)}
          className="text-xs border border-[#ddd] rounded-lg px-2 py-1.5 bg-white flex-1 min-w-[140px]"
          data-testid="assign-employee-select"
        >
          <option value="">Select employee...</option>
          {employees.map(emp => (
            <option key={emp.id} value={emp.id}>{emp.name}</option>
          ))}
        </select>
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="text-xs border border-[#ddd] rounded-lg px-2 py-1.5 bg-white"
          data-testid="assign-type-select"
        >
          <option value="photography">Photography</option>
          <option value="listing">Listing</option>
        </select>
        <Button
          size="sm"
          onClick={assign}
          disabled={assigning || !selectedEmp}
          className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs px-3"
          data-testid="assign-btn"
        >
          {assigning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          Assign
        </Button>
      </div>

      {/* Current assignments */}
      {assignments.length === 0 ? (
        <p className="text-xs text-[#aaa] text-center py-2">No training assigned yet</p>
      ) : (
        <div className="space-y-1.5">
          {assignments.map(a => (
            <div key={a.id} className="flex items-center justify-between px-3 py-2 bg-[#fafafa] rounded-lg" data-testid={`assignment-${a.id}`}>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-[#333]">{a.employee_name}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                  a.training_type === "photography" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                }`}>
                  {a.training_type === "photography" ? "Photography" : "Listing"}
                </span>
              </div>
              <button onClick={() => remove(a.id)} className="text-[#ccc] hover:text-red-500 transition-colors" data-testid={`remove-assignment-${a.id}`}>
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TrainingSection({ getAuthHeader, isAdmin }) {
  return (
    <div className="space-y-4" data-testid="training-section">
      {/* Assign training (admin only) */}
      {isAdmin && <AssignmentPanel getAuthHeader={getAuthHeader} />}

      {/* Photography Guide */}
      <TrainingGuide
        title="Photography Training"
        icon={Camera}
        steps={PHOTOGRAPHY_STEPS}
        color="#F59E0B"
      />

      {/* Listing Guide */}
      <TrainingGuide
        title="Listing Training (Vendoo Cross-Listing)"
        icon={BookOpen}
        steps={LISTING_STEPS}
        color="#3B82F6"
      />
    </div>
  );
}
