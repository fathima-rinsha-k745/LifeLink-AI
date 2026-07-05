import React from 'react';

interface TableContainerProps extends React.HTMLAttributes<HTMLDivElement> {}

export const TableContainer: React.FC<TableContainerProps> = ({ children, className = '', ...props }) => {
  return (
    <div className={`w-full overflow-x-auto rounded-xl border border-brand-border bg-white ${className}`} {...props}>
      {children}
    </div>
  );
};

interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {}

export const Table: React.FC<TableProps> = ({ children, className = '', ...props }) => {
  return (
    <table className={`w-full min-w-[600px] border-collapse text-left text-sm text-brand-text-primary ${className}`} {...props}>
      {children}
    </table>
  );
};

interface ThProps extends React.ThHTMLAttributes<HTMLTableCellElement> {}

export const Th: React.FC<ThProps> = ({ children, className = '', ...props }) => {
  return (
    <th className={`px-4 md:px-6 py-3 md:py-4 font-semibold text-xs text-brand-text-secondary uppercase tracking-wider border-b border-brand-border bg-brand-surface/40 ${className}`} {...props}>
      {children}
    </th>
  );
};

interface TdProps extends React.TdHTMLAttributes<HTMLTableCellElement> {}

export const Td: React.FC<TdProps> = ({ children, className = '', ...props }) => {
  return (
    <td className={`px-4 md:px-6 py-3 md:py-4 border-b border-brand-border font-medium text-brand-text-primary align-middle ${className}`} {...props}>
      {children}
    </td>
  );
};

interface TrProps extends React.HTMLAttributes<HTMLTableRowElement> {
  hoverable?: boolean;
}

export const Tr: React.FC<TrProps> = ({ children, className = '', hoverable = true, ...props }) => {
  return (
    <tr className={`transition-colors duration-150 ${hoverable ? 'hover:bg-brand-surface/40' : ''} ${className}`} {...props}>
      {children}
    </tr>
  );
};
