import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from './Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-lg',
}) => {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-brand-text-primary/40 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', duration: 0.4 }}
            className={`relative w-full ${maxWidth} bg-white rounded-[20px] shadow-2xl border border-brand-border z-10 overflow-hidden flex flex-col`}
          >
            {/* Header */}
            <div className="flex items-start justify-between px-6 py-5 border-b border-brand-border">
              <div>
                <h3 className="text-lg font-bold text-brand-text-primary">{title}</h3>
                {subtitle && <p className="text-xs text-brand-text-secondary mt-1">{subtitle}</p>}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="!p-1.5 !rounded-lg text-brand-text-secondary hover:text-brand-primary"
                onClick={onClose}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Content Body */}
            <div className="px-6 py-5 overflow-y-auto max-h-[70vh]">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
