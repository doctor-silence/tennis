import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'glass';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({ 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  children, 
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center rounded-xl font-bold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-95";
  
  const variants = {
    primary: "bg-slate-900 text-white hover:bg-slate-800 focus:ring-slate-900 shadow-lg shadow-slate-900/20 border border-transparent",
    secondary: "bg-lime-400 text-slate-900 hover:bg-lime-500 focus:ring-lime-400 shadow-lg shadow-lime-400/30 border border-transparent",
    outline: "border-2 border-slate-200 text-slate-700 hover:border-slate-900 hover:text-slate-900 bg-transparent",
    ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
    glass: "bg-white/10 backdrop-blur-md text-white border border-white/20 hover:bg-white/20",
  };

  const sizes = {
    sm: "h-9 px-4 text-xs tracking-wide uppercase",
    md: "h-12 px-6 text-sm tracking-wide",
    lg: "h-14 px-8 text-base tracking-wide",
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`} 
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;