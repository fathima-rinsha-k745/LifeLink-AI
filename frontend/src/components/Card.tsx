import React from 'react';
import { motion } from 'framer-motion';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glass?: boolean;
  hoverEffect?: boolean;
  glow?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  glass = false,
  hoverEffect = false,
  glow = false,
  ...props
}) => {
  const baseStyle = 'border border-brand-border rounded-[20px] p-6 transition-all duration-300';
  
  const glassStyle = glass
    ? 'bg-white/80 backdrop-blur-md shadow-glass'
    : 'bg-white shadow-premium';
    
  const glowStyle = glow ? 'shadow-glow border-brand-secondary/40' : '';

  if (hoverEffect) {
    return (
      <motion.div
        whileHover={{ y: -6, boxShadow: '0 25px 50px -12px rgba(236, 72, 153, 0.12)' }}
        className={`${baseStyle} ${glassStyle} ${glowStyle} ${className}`}
        {...(props as any)}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div className={`${baseStyle} ${glassStyle} ${glowStyle} ${className}`} {...props}>
      {children}
    </div>
  );
};
