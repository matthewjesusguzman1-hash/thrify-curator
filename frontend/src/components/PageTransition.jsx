import { motion } from "framer-motion";

// Page transition variants - MORE NOTICEABLE
const pageVariants = {
  initial: {
    opacity: 0,
    y: 40,
    scale: 0.95
  },
  enter: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1]
    }
  },
  exit: {
    opacity: 0,
    y: -30,
    scale: 0.97,
    transition: {
      duration: 0.35,
      ease: [0.22, 1, 0.36, 1]
    }
  }
};

// Slide from right variant - MORE DRAMATIC
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

// Fade up variant - MORE NOTICEABLE
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
