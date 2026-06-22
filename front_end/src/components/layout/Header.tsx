"use client";

import HeaderClient, { NavItem } from "./HeaderClient";
import { useContext } from "react";
import { NavigationContext } from "@/context/navigation";

export default function Header() {
  const navItems = (useContext(NavigationContext) as NavItem[]) || [];
  return <HeaderClient navItems={navItems} />;
}