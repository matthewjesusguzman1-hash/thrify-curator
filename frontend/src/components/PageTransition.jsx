import { motion } from "framer-motion";

// Blur Fade transition - Pages fade with blur effect
const blurFadeVariants = {
  initial: {
    opacity: 0,
    filter: "blur(20px)",
    scale: 1.02
  },
  enter: {
    opacity: 1,
    filter: "blur(0px)",
    scale: 1,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1]
    }
  },
  exit: {
    opacity: 0,
    filter: "blur(15px)",
    scale: 0.98,
    transition: {
      duration: 0.35,
      ease: [0.22, 1, 0.36, 1]
    }
  }
};

// Slide variant (kept as alternative)
const slideVariants = {
  initial: {
    opacity: 0,
    x: 100
  },
  enter: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1]
    }
  },
  exit: {
    opacity: 0,
    x: -60,
    transition: {
      duration: 0.35,
      ease: [0.22, 1, 0.36, 1]
    }
  }
};

// Fade up variant (kept as alternative)
const fadeUpVariants = {
  initial: {
    opacity: 0,
    y: 60
  },
  enter: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1]
    }
  },
  exit: {
    opacity: 0,
    y: -40,
    transition: {
      duration: 0.35,
      ease: [0.22, 1, 0.36, 1]
    }
  }
};

export default function PageTransition({ children, variant = "default" }) {
  // Default is now blur fade
  const variants = variant === "slide" 
    ? slideVariants 
    : variant === "fadeUp" 
    ? fadeUpVariants 
    : blurFadeVariants;

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
export { blurFadeVariants, slideVariants, fadeUpVariants };
