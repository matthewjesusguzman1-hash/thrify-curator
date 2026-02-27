import { motion } from "framer-motion";

// Page transition variants
const pageVariants = {
  initial: {
    opacity: 0,
    y: 20,
    scale: 0.98
  },
  enter: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: [0.22, 1, 0.36, 1], // Custom easing for smooth feel
      staggerChildren: 0.1
    }
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.99,
    transition: {
      duration: 0.25,
      ease: [0.22, 1, 0.36, 1]
    }
  }
};

// Slide from right variant (for forward navigation feel)
const slideVariants = {
  initial: {
    opacity: 0,
    x: 60
  },
  enter: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.4,
      ease: [0.22, 1, 0.36, 1]
    }
  },
  exit: {
    opacity: 0,
    x: -30,
    transition: {
      duration: 0.25,
      ease: [0.22, 1, 0.36, 1]
    }
  }
};

// Fade up variant (subtle and elegant)
const fadeUpVariants = {
  initial: {
    opacity: 0,
    y: 30
  },
  enter: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1]
    }
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      duration: 0.3,
      ease: [0.22, 1, 0.36, 1]
    }
  }
};

export default function PageTransition({ children, variant = "default" }) {
  const variants = variant === "slide" 
    ? slideVariants 
    : variant === "fadeUp" 
    ? fadeUpVariants 
    : pageVariants;

  return (
    <motion.div
      initial="initial"
      animate="enter"
      exit="exit"
      variants={variants}
      className="w-full min-h-screen"
    >
      {children}
    </motion.div>
  );
}

// Export variants for custom use
export { pageVariants, slideVariants, fadeUpVariants };
