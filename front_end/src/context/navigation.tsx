"use client";

import React, { createContext, useContext, ReactNode } from "react";
import type { NavItem } from "@/components/layout/HeaderClient";

export const NavigationContext = createContext<NavItem[]>([]);

export const useNavigation = () => useContext(NavigationContext);

interface ProviderProps {
  navItems: NavItem[];
  children: ReactNode;
}

export const NavigationProvider: React.FC<ProviderProps> = ({ navItems, children }) => {
  return (
    <NavigationContext.Provider value={navItems}>
      {children}
    </NavigationContext.Provider>
  );
}; 