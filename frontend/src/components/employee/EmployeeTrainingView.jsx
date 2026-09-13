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
  { title: "1. Starting in Vendoo", icon: Package, steps: [
    "Go to Vendoo and open the Drafts section",
    "Open one of the listings — if the listing has a price entered, it is ready to list",
    "Once you have opened the listing, start with the eBay tab"
  ]},
  { title: "2. eBay", icon: Monitor, steps: [
    "Scroll down and make sure the category is correct",
    "Complete any category/item specifics that eBay requires:",
    "Department: Select Women or Men depending on the item",
    "Exterior Color: Look at the item and select the closest matching color. If the exact color is not available, choose the option that matches best",
    "Material, Silhouette, Shape, etc.: If you do not know the answer, select Other when that option is available. Do not guess",
    "Style: Start typing the appropriate style and select the correct option when it populates. For example, if the purse is a crossbody, type Crossbody and select it",
    "Once everything required is completed, scroll down and click List on eBay"
  ]},
  { title: "3. Poshmark", icon: ShoppingBag, steps: [
    "Next, go to the Poshmark tab",
    "Everything should already be populated, so double-check that the information is correct",
    "If everything looks good, click List on Poshmark"
  ]},
  { title: "4. Mercari", icon: ShoppingBag, steps: [
    "Next, go to the Mercari tab",
    "Check the information and fix anything Mercari does not accept",
    "For example, Mercari may not accept Vintage as a brand — if this happens, select No Brand/Not Sure and continue",
    "Next, check the shipping",
    "Always choose the cheapest appropriate shipping option",
    "For most items, use USPS Ground Advantage — this will usually be one of the first/top shipping options",
    "If the item is heavy, UPS may be the better option. However, most items will ship using USPS Ground Advantage",
    "Once everything is correct, click List on Mercari"
  ]},
  { title: "5. Depop", icon: ShoppingBag, steps: [
    "Next, go to the Depop tab",
    "Most of the information should automatically populate",
    "Check for anything that did not populate correctly. For example, if the brand is Vintage and Depop does not recognize it, select Other for the brand",
    "Make sure the size is entered",
    "You will also need to select the correct package weight/shipping weight",
    "If you are unsure of the item's weight, go back to the main Vendoo form and scroll down — the package weight will be listed there",
    "Use that weight to select the appropriate shipping option on Depop. For example, if the package weighs one pound, select the appropriate up to/under one-pound option",
    "Once everything is correct, list the item on Depop"
  ]},
  { title: "6. Finish", icon: FileText, steps: [
    "After the listing has been posted to all of the platforms, go back to Inventory in Vendoo",
    "Then move on to the next item and repeat the process"
  ]}
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
