import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className = '', onClick }) => {
  return (
    <div 
      onClick={onClick}
      className={`bg-white rounded-2xl shadow-sm border border-slate-100 p-5 ${onClick ? 'cursor-pointer active:bg-slate-50 transition-colors' : ''} ${className}`}
    >
      {children}
    </div>
  );
};