import React from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
  label?: string;
  error?: string;
  helperText?: string;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
  variant?: 'default' | 'minimal';
}

function Input({ 
  className = '', 
  label, 
  error, 
  helperText, 
  leftElement, 
  rightElement, 
  variant = 'default',
  ...props 
}: InputProps) {
  const baseClasses = cn(
    'flex w-full bg-transparent text-gray-900 dark:text-gray-100',
    'placeholder:text-gray-400 dark:placeholder:text-gray-500',
    'focus:outline-none disabled:cursor-not-allowed disabled:opacity-50',
    'transition-all duration-200',
    variant === 'default' && [
      'h-12 px-4 rounded-xl',
      'border-2 border-gray-200 dark:border-gray-700',
      'focus:border-voxcina-blue dark:focus:border-voxcina-blue',
      'hover:border-gray-300 dark:hover:border-gray-600',
    ],
    variant === 'minimal' && [
      'h-11 px-0 py-2',
      'border-b-2 border-gray-200 dark:border-gray-700 rounded-none',
      'focus:border-voxcina-blue dark:focus:border-voxcina-blue',
    ],
    error && 'border-red-400 focus:border-red-500 dark:border-red-500',
  );

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        {leftElement && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            {leftElement}
          </div>
        )}
        <input
          className={cn(
            baseClasses,
            leftElement && 'pl-11',
            rightElement && 'pr-11',
            className
          )}
          {...props}
        />
        {rightElement && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            {rightElement}
          </div>
        )}
      </div>
      {error && (
        <p className="text-xs text-red-500 mt-1">{error}</p>
      )}
      {helperText && !error && (
        <p className="text-xs text-gray-400 mt-1">{helperText}</p>
      )}
    </div>
  );
}

export default Input;
export { Input }; 