import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, 
  MapPin, 
  Bell, 
  ChevronRight, 
  ChevronLeft, 
  X,
  CheckCircle,
  Fingerprint,
  Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const EMPLOYEE_STEPS = [
  {
    icon: Clock,
    title: "Clock In & Out",
    description: "Tap the clock button to start and end your shift. Your hours are automatically tracked.",
    color: "#10B981"
  },
  {
    icon: MapPin,
    title: "GPS Mileage Tracking",
    description: "Track your business trips for tax deductions. Start a trip before you drive, stop when you arrive.",
    color: "#00D4FF"
  },
  {
    icon: Fingerprint,
    title: "Quick Login with Face ID",
    description: "After your first login, you can use Face ID or Touch ID for faster access.",
    color: "#8B5CF6"
  },
  {
    icon: Bell,
    title: "Stay Notified",
    description: "Receive important updates and reminders from your manager.",
    color: "#F59E0B"
  }
];

const CONSIGNOR_STEPS = [
  {
    icon: CheckCircle,
    title: "Track Your Items",
    description: "View the status of all your consigned items - from pending approval to sold.",
    color: "#10B981"
  },
  {
    icon: Calendar,
    title: "Payment History",
    description: "See all your payments with dates and amounts. Filter by month or year.",
    color: "#00D4FF"
  },
  {
    icon: Bell,
    title: "Get Updates",
    description: "Receive notifications when your items sell or when payments are processed.",
    color: "#F59E0B"
  },
  {
    icon: Fingerprint,
    title: "Secure Access",
    description: "Set up a password and use Face ID for quick, secure access to your account.",
    color: "#8B5CF6"
  }
];

export default function OnboardingModal({ userType = 'employee', onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [visible, setVisible] = useState(false);
  
  const steps = userType === 'consignor' ? CONSIGNOR_STEPS : EMPLOYEE_STEPS;
  const storageKey = `onboarding_${userType}_completed`;

  useEffect(() => {
    // Check if user has already seen onboarding
    const hasSeenOnboarding = localStorage.getItem(storageKey);
    if (!hasSeenOnboarding) {
      // Small delay to let the main UI load first
      setTimeout(() => setVisible(true), 500);
    }
  }, [storageKey]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem(storageKey, 'true');
    setVisible(false);
    onComplete?.();
  };

  const handleSkip = () => {
    localStorage.setItem(storageKey, 'true');
    setVisible(false);
    onComplete?.();
  };

  if (!visible) return null;

  const CurrentIcon = steps[currentStep].icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-white/10"
        >
          {/* Header */}
          <div className="flex justify-between items-center p-4 border-b border-white/10">
            <span className="text-white/60 text-sm">
              {currentStep + 1} of {steps.length}
            </span>
            <button
              onClick={handleSkip}
              className="text-white/60 hover:text-white transition-colors p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="text-center"
              >
                {/* Icon */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.1 }}
                  className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
                  style={{ backgroundColor: `${steps[currentStep].color}20` }}
                >
                  <CurrentIcon 
                    className="w-10 h-10" 
                    style={{ color: steps[currentStep].color }}
                  />
                </motion.div>

                {/* Title */}
                <h2 className="text-2xl font-bold text-white mb-3">
                  {steps[currentStep].title}
                </h2>

                {/* Description */}
                <p className="text-white/70 text-base leading-relaxed">
                  {steps[currentStep].description}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Progress dots */}
          <div className="flex justify-center gap-2 pb-4">
            {steps.map((_, index) => (
              <motion.div
                key={index}
                className="w-2 h-2 rounded-full transition-colors"
                animate={{
                  backgroundColor: index === currentStep ? '#10B981' : 'rgba(255,255,255,0.3)',
                  scale: index === currentStep ? 1.2 : 1
                }}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="flex gap-3 p-4 border-t border-white/10">
            <Button
              onClick={handlePrev}
              disabled={currentStep === 0}
              variant="outline"
              className="flex-1 border-white/20 text-white hover:bg-white/10 disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            
            <Button
              onClick={handleNext}
              className="flex-1 bg-[#10B981] hover:bg-[#059669] text-white"
            >
              {currentStep === steps.length - 1 ? (
                <>
                  Get Started
                  <CheckCircle className="w-4 h-4 ml-1" />
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
