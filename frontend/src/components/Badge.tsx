import React from 'react';

interface BadgeProps {
  variant?: 'urgency' | 'status' | 'blood' | 'simple';
  value: string;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ variant = 'simple', value, className = '' }) => {
  const getBadgeStyle = () => {
    const val = value.toLowerCase().trim();

    if (variant === 'urgency') {
      if (val === 'critical' || val === 'high') {
        return 'bg-rose-50 text-rose-600 border border-rose-200 shadow-[0_0_10px_rgba(244,63,94,0.15)] font-semibold';
      }
      if (val === 'medium') {
        return 'bg-amber-50 text-amber-600 border border-amber-200 font-medium';
      }
      return 'bg-emerald-50 text-emerald-600 border border-emerald-200 font-medium';
    }

    if (variant === 'status') {
      if (val === 'available' || val === 'active') {
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium flex items-center gap-1.5';
      }
      return 'bg-gray-100 text-gray-500 border border-gray-200 font-medium flex items-center gap-1.5';
    }

    if (variant === 'blood') {
      return 'bg-brand-primary/10 text-brand-primary border border-brand-primary/20 font-bold px-2.5 py-1 text-xs rounded-lg shadow-sm';
    }

    return 'bg-brand-surface text-brand-primary border border-brand-border font-medium';
  };

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs border ${getBadgeStyle()} ${className}`}>
      {variant === 'status' && (
        <span className={`w-1.5 h-1.5 rounded-full ${
          value.toLowerCase() === 'available' || value.toLowerCase() === 'active'
            ? 'bg-emerald-500 animate-pulse-glow'
            : 'bg-gray-400'
        }`} />
      )}
      {value}
    </span>
  );
};
