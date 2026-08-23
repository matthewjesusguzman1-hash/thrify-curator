import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, ChevronRight, ChevronLeft, Clock, FileText, 
  Lock, DollarSign, MessageSquare, CheckCircle, Play
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const WALKTHROUGH_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to the Employee Portal!',
    description: 'This quick walkthrough will help you get started with your new dashboard. Let\'s explore the key features together.',
    icon: Play,
    color: 'from-purple-500 to-indigo-500'
  },
  {
    id: 'clock',
    title: 'Clock In & Out',
    description: 'Use the clock button at the top to track your work hours. Simply tap "Clock In" when you start working and "Clock Out" when you\'re done. Your hours are automatically tracked and calculated.',
    icon: Clock,
    color: 'from-green-500 to-emerald-500',
    tips: [
      'Clock in when you start your shift',
      'Clock out when you finish',
      'Your hours are automatically saved',
      'View your time entries in the dashboard'
    ]
  },
  {
    id: 'forms',
    title: 'Required Forms',
    description: 'You\'ll need to complete some important forms to get set up. Look for sections with "Action Required" labels.',
    icon: FileText,
    color: 'from-blue-500 to-cyan-500',
    tips: [
      'Contractor Agreement - Sign to confirm your contractor status',
      'W-9 (US workers) or W-8BEN (Remote/foreign workers) - Tax documentation',
      'Complete these forms as soon as possible'
    ]
  },
  {
    id: 'password',
    title: 'Set Your Password',
    description: 'For added security, we recommend setting up a password. Go to Account Settings to create your password and optionally enable Face ID/biometric login.',
    icon: Lock,
    color: 'from-orange-500 to-amber-500',
    tips: [
      'Tap "Account Settings" in the menu',
      'Choose "Set Password"',
      'Create a secure password',
      'Enable Face ID for quick login (optional)'
    ]
  },
  {
    id: 'payperiods',
    title: 'Pay Periods',
    description: 'Your earnings are tracked per pay period. Check the dashboard to see your current period earnings, hours worked, and payment history.',
    icon: DollarSign,
    color: 'from-emerald-500 to-teal-500',
    tips: [
      'View your current pay period summary',
      'Check your hourly rate',
      'See payment history in the Payments section',
      'Tax documents (1099) available at year end'
    ]
  },
  {
    id: 'messages',
    title: 'Messages & Communication',
    description: 'Stay connected! Check the Messages section for important updates from management. You can also request time off or submit questions through the portal.',
    icon: MessageSquare,
    color: 'from-pink-500 to-rose-500',
    tips: [
      'Check messages regularly for updates',
      'Use the portal for time-off requests',
      'Contact management through the messaging system'
    ]
  },
  {
    id: 'complete',
    title: 'You\'re All Set!',
    description: 'You now know the basics of the Employee Portal. Remember to complete your required forms and set your password. If you need help, contact your supervisor.',
    icon: CheckCircle,
    color: 'from-green-500 to-emerald-500'
  }
];

export default function EmployeeWalkthrough({ show, onClose, onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (show) {
      setCurrentStep(0);
    }
  }, [show]);

  const handleNext = () => {
    if (currentStep < WALKTHROUGH_STEPS.length - 1) {
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
    // Save to localStorage so we don't show it again
    localStorage.setItem('employee_walkthrough_completed', 'true');
    onComplete?.();
    onClose();
  };

  const handleSkip = () => {
    localStorage.setItem('employee_walkthrough_completed', 'true');
    onClose();
  };

  if (!show) return null;

  const step = WALKTHROUGH_STEPS[currentStep];
  const StepIcon = step.icon;
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === WALKTHROUGH_STEPS.length - 1;

  return ReactDOM.createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]"
        onClick={handleSkip}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-gradient-to-br from-[#1A1A2E] via-[#16213E] to-[#0F3460] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-white/10"
          onClick={e => e.stopPropagation()}
        >
          {/* Progress bar */}
          <div className="h-1 bg-white/10">
            <motion.div 
              className={`h-full bg-gradient-to-r ${step.color}`}
              initial={{ width: 0 }}
              animate={{ width: `${((currentStep + 1) / WALKTHROUGH_STEPS.length) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          {/* Header */}
          <div className="p-6 pb-4 flex items-start justify-between">
            <div className={`w-14 h-14 rounded-xl bg-gradient-to-r ${step.color} flex items-center justify-center shadow-lg`}>
              <StepIcon className="w-7 h-7 text-white" />
            </div>
            <button 
              onClick={handleSkip}
              className="text-white/40 hover:text-white/70 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 pb-4">
            <h2 className="text-xl font-bold text-white mb-2">{step.title}</h2>
            <p className="text-white/70 text-sm leading-relaxed">{step.description}</p>
            
            {step.tips && (
              <div className="mt-4 space-y-2">
                {step.tips.map((tip, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                    <span className="text-white/60 text-sm">{tip}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Step indicators */}
          <div className="px-6 py-3 flex justify-center gap-1.5">
            {WALKTHROUGH_STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentStep(i)}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === currentStep 
                    ? 'w-6 bg-white' 
                    : i < currentStep 
                      ? 'bg-white/50' 
                      : 'bg-white/20'
                }`}
              />
            ))}
          </div>

          {/* Footer */}
          <div className="p-6 pt-4 border-t border-white/10 flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={handlePrev}
              disabled={isFirstStep}
              className="text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>

            <div className="flex gap-2">
              {!isLastStep && (
                <Button
                  variant="ghost"
                  onClick={handleSkip}
                  className="text-white/40 hover:text-white/60"
                >
                  Skip
                </Button>
              )}
              <Button
                onClick={handleNext}
                className={`bg-gradient-to-r ${step.color} text-white hover:opacity-90`}
              >
                {isLastStep ? 'Get Started' : 'Next'}
                {!isLastStep && <ChevronRight className="w-4 h-4 ml-1" />}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}

// Hook to check if walkthrough should be shown
export function useEmployeeWalkthrough(isAdminView = false) {
  // Never show walkthrough in admin view - set initial state to false
  const [showWalkthrough, setShowWalkthrough] = useState(false);

  useEffect(() => {
    // Don't show walkthrough in admin view
    if (isAdminView) {
      setShowWalkthrough(false);
      return;
    }
    
    // Check if user has completed the walkthrough
    const completed = localStorage.getItem('employee_walkthrough_completed');
    if (!completed) {
      // Small delay to let the dashboard load first
      const timer = setTimeout(() => setShowWalkthrough(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [isAdminView]);

  const triggerWalkthrough = () => {
    // Only allow triggering if not in admin view
    if (!isAdminView) {
      setShowWalkthrough(true);
    }
  };
  const closeWalkthrough = () => setShowWalkthrough(false);

  return { showWalkthrough, triggerWalkthrough, closeWalkthrough };
}
