import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

export default function DashboardGroup({
  title,
  icon: Icon,
  gradient,
  defaultOpen = false,
  badge,
  children,
  testId,
  forceOpen = false,  // External control to force open
  onOpenChange        // Callback when open state changes
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  // Allow external control via forceOpen prop
  useEffect(() => {
    if (forceOpen && !isOpen) {
      setIsOpen(true);
      if (onOpenChange) onOpenChange(true);
    }
  }, [forceOpen]);

  const handleToggle = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    if (onOpenChange) onOpenChange(newState);
  };

  return (
    <div 
      className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden transition-all duration-300 shadow-xl shadow-black/20"
      data-testid={testId}
    >
      {/* Group Header */}
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between p-5 cursor-pointer hover:bg-white/5 transition-colors"
        data-testid={`${testId}-toggle`}
      >
        <div className="flex items-center gap-4">
          {/* Icon with gradient background */}
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${gradient} flex items-center justify-center shadow-lg`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          
          {/* Title and badge */}
          <div className="text-left">
            <h2 className="text-xl font-bold text-white">{title}</h2>
            {badge && (
              <span className="text-sm text-white/60">{badge}</span>
            )}
          </div>
        </div>

        {/* Expand/collapse indicator */}
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
        >
          <ChevronDown className="w-5 h-5 text-white/80" />
        </motion.div>
      </button>

      {/* Collapsible Content */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="p-5 pt-0 space-y-6 border-t border-white/10 mt-0">
              {/* Top gradient line */}
              <div className={`h-0.5 bg-gradient-to-r ${gradient} -mx-5 mb-5`} />
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
