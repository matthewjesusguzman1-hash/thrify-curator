import { forwardRef } from 'react';
import { Button as ShadcnButton } from './button';
import haptics from '@/lib/haptics';

/**
 * HapticButton - A Button component with built-in haptic feedback
 * 
 * Usage:
 * <HapticButton haptic="medium" onClick={handleClick}>Click Me</HapticButton>
 * 
 * Haptic options: "light" | "medium" | "heavy" | "success" | "warning" | "error" | "selection" | "none"
 */
const HapticButton = forwardRef(({ 
  haptic = "medium", // Default haptic feedback style
  onClick, 
  children, 
  ...props 
}, ref) => {
  
  const handleClick = async (e) => {
    // Trigger haptic feedback based on type
    switch (haptic) {
      case "light":
        await haptics.light();
        break;
      case "medium":
        await haptics.medium();
        break;
      case "heavy":
        await haptics.heavy();
        break;
      case "success":
        await haptics.success();
        break;
      case "warning":
        await haptics.warning();
        break;
      case "error":
        await haptics.error();
        break;
      case "selection":
        await haptics.selection();
        break;
      case "none":
      default:
        // No haptic feedback
        break;
    }
    
    // Call the original onClick handler if provided
    if (onClick) {
      onClick(e);
    }
  };
  
  return (
    <ShadcnButton ref={ref} onClick={handleClick} {...props}>
      {children}
    </ShadcnButton>
  );
});

HapticButton.displayName = 'HapticButton';

export { HapticButton };
