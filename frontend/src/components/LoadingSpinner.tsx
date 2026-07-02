import React from 'react';
import { Heart } from 'lucide-react';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Loading details...',
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
  };

  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
      <div className="relative flex items-center justify-center mb-4">
        {/* Pulsing glow ring */}
        <div className={`absolute rounded-full bg-brand-primary/10 animate-ping ${
          size === 'sm' ? 'w-10 h-10' : size === 'md' ? 'w-16 h-16' : 'w-24 h-24'
        }`} />
        
        {/* Heart icon beating */}
        <div className={`flex items-center justify-center rounded-2xl bg-brand-primary/15 text-brand-primary ${
          size === 'sm' ? 'p-1.5' : size === 'md' ? 'p-3' : 'p-4'
        }`}>
          <Heart className={`animate-pulse fill-brand-primary ${sizeClasses[size]}`} />
        </div>
      </div>
      {message && <p className="text-sm font-medium text-brand-text-secondary">{message}</p>}
    </div>
  );
};
