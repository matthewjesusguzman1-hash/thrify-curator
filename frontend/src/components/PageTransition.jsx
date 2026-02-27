import { motion } from "framer-motion";

// Simple fade transition
const fadeVariants = {
  initial: {
    opacity: 0
  },
  enter: {
    opacity: 1,
    transition: {
      duration: 0.4,
      ease: "easeOut"
    }
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.3,
      ease: "easeIn"
    }
  }
};

export default function PageTransition({ children }) {
  return (
    <motion.div
      initial="initial"
      animate="enter"
      exit="exit"
      variants={fadeVariants}
      className="w-full min-h-screen"
      style={{ 
        background: 'linear-gradient(135deg, #1A1A2E 0%, #16213E 50%, #0F3460 100%)',
        minHeight: '100vh'
      }}
    >
      {children}
    </motion.div>
  );
}

export { fadeVariants };
