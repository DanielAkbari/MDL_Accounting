import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

type GradientBackgroundProps = React.ComponentProps<'div'> & {
  gradients?: string[];
  animationDuration?: number;
  animationDelay?: number;
  overlay?: boolean;
  overlayOpacity?: number;
};

const Default_Gradients = [
  "linear-gradient(135deg, #060b18 0%, #022325 100%)", // Dark Slate to Dark Teal
  "linear-gradient(135deg, #0b131a 0%, #052636 100%)", // Dark Slate to Dark Cyan
  "linear-gradient(135deg, #050a14 0%, #150f29 100%)", // Dark Slate to Dark Violet
  "linear-gradient(135deg, #060b18 0%, #022325 100%)", // Return loop
];

export function GradientBackground({
  children,
  className = '',
  gradients = Default_Gradients,
  animationDuration = 12, // 12 seconds for slow, premium transition
  animationDelay = 0.1,
  overlay = true,
  overlayOpacity = 0.2,
  ...props
}: GradientBackgroundProps) {
  return (
    <div className={cn('w-full relative min-h-screen overflow-hidden', className)} {...props}>
      {/* Animated gradient background */}
      <motion.div
        className="absolute inset-0 z-0"
        style={{ background: gradients[0] }}
        animate={{ background: gradients }}
        transition={{
          delay: animationDelay,
          duration: animationDuration,
          repeat: Number.POSITIVE_INFINITY,
          ease: 'easeInOut',
        }}
      />

      {/* Optional overlay for contrast */}
      {overlay && (
        <div
          className="absolute inset-0 bg-[#060b18] z-10 pointer-events-none"
          style={{ opacity: overlayOpacity }}
        />
      )}

      {/* Content wrapper */}
      {children && (
        <div className="relative z-20 w-full flex min-h-screen items-center justify-center">
          {children}
        </div>
      )}
    </div>
  );
}
