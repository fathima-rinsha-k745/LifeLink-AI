import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  className = '',
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  disabled,
  ...props
}) => {
  const baseStyle = 'inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary/30 disabled:opacity-50 disabled:pointer-events-none rounded-[20px]';

  const variants = {
    primary: 'bg-brand-primary text-white hover:bg-brand-primary/90 shadow-premium shadow-brand-primary/20',
    secondary: 'bg-brand-secondary text-white hover:bg-brand-secondary/90 shadow-premium shadow-brand-secondary/15',
    accent: 'bg-brand-accent text-white hover:bg-brand-accent/90 shadow-premium shadow-brand-accent/15',
    outline: 'border border-brand-border text-brand-text-primary bg-white hover:bg-brand-surface hover:border-brand-primary/50',
    ghost: 'text-brand-text-secondary hover:bg-brand-surface hover:text-brand-primary',
    danger: 'bg-brand-danger text-white hover:bg-brand-danger/90 shadow-premium shadow-brand-danger/10',
    success: 'bg-brand-success text-white hover:bg-brand-success/90 shadow-premium shadow-brand-success/10',
  };

  const sizes = {
    sm: 'px-4 py-2 text-xs gap-1.5',
    md: 'px-5 py-2.5 text-sm gap-2',
    lg: 'px-7 py-3 text-base gap-2.5',
  };

  return (
    <motion.button
      whileHover={!disabled && !loading ? { y: -2 } : undefined}
      whileTap={!disabled && !loading ? { scale: 0.98 } : undefined}
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...(props as any)}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        icon && <span className="flex-shrink-0">{icon}</span>
      )}
      <span>{children}</span>
    </motion.button>
  );
};
