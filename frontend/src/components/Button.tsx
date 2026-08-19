import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  ...props
}) => {
  const base =
    'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-150 ' +
    'focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    // Primary = white text on dark (gradient accent)
    primary:
      'bg-gradient-to-r from-gray-300 via-white to-gray-300 text-black ' +
      'hover:brightness-105 hover:shadow-lg hover:shadow-white/10 focus:ring-white/40',
    // Secondary = dark glass
    secondary:
      'bg-slate-800/50 text-white hover:bg-slate-700/50 border border-slate-700 focus:ring-white/30',
    outline:
      'border border-slate-700 text-gray-300 hover:text-white hover:bg-slate-800/30 focus:ring-white/30',
    ghost:
      'text-gray-400 hover:text-white hover:bg-slate-800/30 focus:ring-white/30',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-5 py-2.5 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};
