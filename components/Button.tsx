import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  testId?: string;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  testId,
  ...props
}) => {
  // Minimum 44px touch target for accessibility (WCAG 2.1 AA)
  const sizeStyles = {
    sm: "px-3 py-2 min-h-[44px] text-sm",
    md: "px-4 py-3 min-h-[44px]",
    lg: "px-6 py-4 min-h-[52px] text-lg"
  };

  const baseStyle = `${sizeStyles[size]} rounded-xl font-semibold transition-all duration-200 active:scale-95 flex items-center justify-center gap-2`;

  const variants = {
    primary: "bg-blue-600 text-white shadow-lg shadow-blue-200 hover:bg-blue-700",
    secondary: "bg-slate-800 text-white shadow-lg hover:bg-slate-900",
    outline: "border-2 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50",
    ghost: "bg-transparent text-slate-600 hover:bg-slate-100"
  };

  const widthClass = fullWidth ? "w-full" : "";

  return (
    <button
      className={`${baseStyle} ${variants[variant]} ${widthClass} ${className}`}
      data-testid={testId}
      {...props}
    >
      {children}
    </button>
  );
};