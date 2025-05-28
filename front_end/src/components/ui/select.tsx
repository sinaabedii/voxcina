"use client";

import React, { createContext, useContext, useRef, useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  value: string;
  onValueChange: (value: string) => void;
}

const SelectContext = createContext<SelectContextType | undefined>(undefined);

const useSelect = () => {
  const context = useContext(SelectContext);
  if (!context) {
    throw new Error('Select components must be used within Select');
  }
  return context;
};

interface SelectProps {
  children: React.ReactNode;
  value: string;
  onValueChange: (value: string) => void;
}

export function Select({ children, value, onValueChange }: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <SelectContext.Provider value={{ isOpen, setIsOpen, value, onValueChange }}>
      <div ref={selectRef} className="relative">
        {children}
      </div>
    </SelectContext.Provider>
  );
}

interface SelectTriggerProps {
  children: React.ReactNode;
  className?: string;
}

export function SelectTrigger({ children, className = '' }: SelectTriggerProps) {
  const { isOpen, setIsOpen } = useSelect();

  const handleClick = () => {
    setIsOpen(!isOpen);
  };

  const baseClasses = 'flex h-10 w-full items-center justify-between rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm ring-offset-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:ring-offset-gray-950 dark:focus:ring-blue-400';

  return (
    <button
      onClick={handleClick}
      className={`${baseClasses} ${className}`}
      type="button"
    >
      {children}
      <ChevronDown className={`h-4 w-4 opacity-50 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
    </button>
  );
}

interface SelectValueProps {
  placeholder?: string;
  className?: string;
}

export function SelectValue({ placeholder, className = '' }: SelectValueProps) {
  const { value } = useSelect();
  
  return (
    <span className={`block truncate ${!value ? 'text-gray-500 dark:text-gray-400' : ''} ${className}`}>
      {value || placeholder}
    </span>
  );
}

interface SelectContentProps {
  children: React.ReactNode;
  className?: string;
}

export function SelectContent({ children, className = '' }: SelectContentProps) {
  const { isOpen } = useSelect();

  if (!isOpen) return null;

  return (
    <div className={`absolute top-full mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-50 py-1 max-h-60 overflow-auto ${className}`}>
      {children}
    </div>
  );
}

interface SelectItemProps {
  children: React.ReactNode;
  value: string;
  className?: string;
}

export function SelectItem({ children, value, className = '' }: SelectItemProps) {
  const { value: selectedValue, onValueChange, setIsOpen } = useSelect();

  const handleClick = () => {
    onValueChange(value);
    setIsOpen(false);
  };

  const isSelected = selectedValue === value;

  return (
    <button
      onClick={handleClick}
      className={`w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center ${isSelected ? 'bg-gray-100 dark:bg-gray-700' : ''} ${className}`}
    >
      {children}
    </button>
  );
} 