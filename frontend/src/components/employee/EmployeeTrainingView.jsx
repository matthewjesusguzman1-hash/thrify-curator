/**
 * Employee Training View — shows assigned training guides loaded from DB
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera, BookOpen, ChevronDown, ChevronUp, Package, Tag,
  FileText, FolderOpen, Monitor, ShoppingBag, Loader2, ArrowLeft
} from "lucide-react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ICON_MAP = {
  Package, Camera, FileText, Tag, FolderOpen, Monitor, ShoppingBag, BookOpen
};

function StepSection({ section, color }) {
  const IconComp = ICON_MAP[section.icon] || FileText;
  return (
    <div className="bg-white/5 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-2">
        <IconComp className="w-4 h-4" style={{ color }} />
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

function GuideCard({ guide, color, defaultOpen }) {
  const [expanded, setExpanded] = useState(defaultOpen || false);
  const IconComp = guide.guide_type === "photography" ? Camera : BookOpen;

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-4 hover:bg-white/5 transition-colors"
      >
        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}25` }}>
          <IconComp className="w-4.5 h-4.5" style={{ color }} />
        </div>
        <span className="font-medium text-sm text-white flex-1 text-left">{guide.title}</span>
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
              {guide.sections.map((section, i) => (
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
  const [guides, setGuides] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [assignRes, guidesRes] = await Promise.all([
          axios.get(`${API}/training-assignments/my`, getAuthHeader()),
          axios.get(`${API}/training-content/`, getAuthHeader()),
        ]);
        setAssignments(assignRes.data.assignments || []);
        setGuides(guidesRes.data.guides || []);
      } catch {
        setAssignments([]);
        setGuides([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const hasPhotography = assignments.some(a => a.training_type === "photography");
  const hasListing = assignments.some(a => a.training_type === "listing");
  const photoGuide = guides.find(g => g.guide_type === "photography");
  const listingGuide = guides.find(g => g.guide_type === "listing");

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-white/40" />
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="employee-training-view">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-white/60 hover:text-white text-sm transition-colors"
        data-testid="training-back-btn"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </button>

      {hasPhotography && photoGuide && (
        <GuideCard
          guide={photoGuide}
          color="#F59E0B"
          defaultOpen={true}
        />
      )}

      {hasListing && listingGuide && (
        <GuideCard
          guide={listingGuide}
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
