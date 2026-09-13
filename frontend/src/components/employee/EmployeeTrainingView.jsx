/**
 * Employee Training View — shows assigned training guides
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera, BookOpen, ChevronDown, ChevronUp, Package, Tag,
  FileText, FolderOpen, Monitor, ShoppingBag, Loader2, ArrowLeft
} from "lucide-react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PHOTOGRAPHY_STEPS = [
  { title: "1. Prep the Item", icon: Package, steps: ["Remove items from storage bags/bins", "Steam or lint-roll wrinkled items", "Check for stains, damage, or missing parts — note everything"] },
  { title: "2. Set Up for Photos", icon: Camera, steps: ["Use natural light or a lightbox/ring light", "Use a clean, solid-color background (white or neutral)", "Avoid shadows, clutter, or uneven lighting"] },
  { title: "3. Take Required Photos", icon: FileText, steps: ["Front view (full item, centered)", "Back view", "Close-up of brand/label tag", "Close-up of size tag", "Any flaws or damage (stains, holes, pilling)", "Close-up of fabric content/care tag", "Detail shots (zippers, buttons, embroidery, hardware)", "Measurement photo with tape measure (if needed)"] },
  { title: "4. Capture Measurements", icon: Tag, steps: ["Lay item flat on a clean surface", "Use a soft measuring tape", "Common measurements: pit-to-pit (chest), length, sleeve length, waist, inseam, rise", "Record in inches and note if flat or stretched", "For shoes: outsole length, width, insole measurement"] },
  { title: "5. Photo Description", icon: FileText, steps: ["Log item brand, size, color, fabric, and condition in notes or a shared document", "Flag anything notable: stains, missing buttons, stretched elastic"] },
  { title: "6. SKU & Cost Tracking", icon: Tag, steps: ["Assign an internal SKU or lot number", "Record purchase price/cost for profit tracking", "Label storage bins with SKU references"] },
  { title: "7. Bag & Store", icon: FolderOpen, steps: ["Place item in a clear poly bag or labeled storage bin", "Store in a way that keeps it accessible for shipping", "Organize by category, size, or SKU for easy retrieval"] }
];

const LISTING_STEPS = [
  { title: "1. Preparing Items in Vendoo", icon: Package, steps: ["Log into Vendoo (vendoo.co) — the central hub for all cross-listing", "Click 'List an Item' to create a new listing", "Upload all photos taken during the Photography phase", "Fill in: Title, Description, Category, Brand, Size, Color, Condition", "Add SKU number and purchase price for tracking", "Use Vendoo's AI Description feature to auto-generate descriptions"] },
  { title: "2. Cross-List to Poshmark", icon: ShoppingBag, steps: ["In Vendoo, select Poshmark as a marketplace to list on", "Set the listing price (Poshmark takes 20% commission)", "Select the correct category and subcategory", "Add relevant style tags for search visibility", "Set shipping: Poshmark provides a prepaid label for standard packages", "Review and click 'List' — Vendoo pushes the listing to Poshmark"] },
  { title: "3. Cross-List to eBay", icon: Monitor, steps: ["In Vendoo, select eBay as a marketplace", "Choose listing format: Fixed Price (Buy It Now) or Auction", "Set your price — eBay final value fee is ~13%", "Select condition: 'Pre-owned', 'New with tags', etc.", "Fill in item specifics: Brand, Size, Color, Material, Style", "Set shipping: Calculated or flat rate (USPS, FedEx, UPS)", "Add return policy (recommended: 30-day returns for better visibility)", "Review and click 'List'"] },
  { title: "4. Cross-List to Mercari", icon: ShoppingBag, steps: ["In Vendoo, select Mercari as a marketplace", "Set your price — Mercari takes 10% commission", "Select brand, category, and condition", "Choose shipping: Mercari prepaid label or ship on your own", "Smart Pricing: optionally enable auto-price drops for faster sales", "Review and click 'List'"] },
  { title: "5. Cross-List to Depop", icon: ShoppingBag, steps: ["In Vendoo, select Depop as a marketplace", "Set your price — Depop charges no seller fees (buyer pays)", "Add hashtags and style descriptors popular with Depop's audience", "Category and subcategory should match the item type", "Shipping: Set via Depop's shipping options (USPS typically)", "Review and click 'List'"] },
  { title: "6. After Listing — Manage & Delist", icon: FileText, steps: ["When an item sells on one platform, use Vendoo to delist from all others", "Click 'Mark as Sold' in Vendoo — this removes it from active platforms", "Track your sales data in Vendoo's analytics dashboard", "Ship within the required window (typically 3 business days)", "Update inventory CSV if using the Thrifty Curator sales import"] }
];

function StepSection({ section, color }) {
  return (
    <div className="bg-white/5 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-2">
        <section.icon className="w-4 h-4" style={{ color }} />
        <h4 className="font-medium text-sm text-white/90">{section.title}</h4>
      </div>
      <ul className="space-y-1.5 ml-6">
        {section.steps.map((step, j) => (
          <li key={j} className="text-xs text-white/70 flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-white/30 mt-1.5 flex-shrink-0" />
            {step}
          </li>
        ))}
      </ul>
    </div>
  );
}

function GuideCard({ title, icon: Icon, steps, color, defaultOpen }) {
  const [expanded, setExpanded] = useState(defaultOpen || false);

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-4 hover:bg-white/5 transition-colors"
      >
        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}25` }}>
          <Icon className="w-4.5 h-4.5" style={{ color }} />
        </div>
        <span className="font-medium text-sm text-white flex-1 text-left">{title}</span>
        {expanded ? <ChevronUp className="w-4 h-4 text-white/40" /> : <ChevronDown className="w-4 h-4 text-white/40" />}
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3">
              {steps.map((section, i) => (
                <StepSection key={i} section={section} color={color} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function EmployeeTrainingView({ getAuthHeader, onBack }) {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        const { data } = await axios.get(`${API}/training-assignments/my`, getAuthHeader());
        setAssignments(data.assignments || []);
      } catch {
        setAssignments([]);
      } finally {
        setLoading(false);
      }
    };
    fetchAssignments();
  }, []);

  const hasPhotography = assignments.some(a => a.training_type === "photography");
  const hasListing = assignments.some(a => a.training_type === "listing");

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-white/40" />
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="employee-training-view">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-white/60 hover:text-white text-sm transition-colors"
        data-testid="training-back-btn"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </button>

      {hasPhotography && (
        <GuideCard
          title="Photography Training"
          icon={Camera}
          steps={PHOTOGRAPHY_STEPS}
          color="#F59E0B"
          defaultOpen={true}
        />
      )}

      {hasListing && (
        <GuideCard
          title="Listing Training (Vendoo Cross-Listing)"
          icon={BookOpen}
          steps={LISTING_STEPS}
          color="#3B82F6"
          defaultOpen={!hasPhotography}
        />
      )}

      {!hasPhotography && !hasListing && (
        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 text-center">
          <BookOpen className="w-8 h-8 text-white/30 mx-auto mb-2" />
          <p className="text-white/60 text-sm">No training assigned yet</p>
        </div>
      )}
    </div>
  );
}
