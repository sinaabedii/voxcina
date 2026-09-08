"use client";

import Link from "next/link";
import { CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import DashboardCard from "./DashboardCard";
import { ChevronLeft } from "lucide-react";

interface StatCardProps {
  title: string;
  icon: React.ReactNode;
  value: number | string;
  subtitle: string;
  href: string;
  ariaLabel?: string;
}

export default function StatCard({ title, icon, value, subtitle, href, ariaLabel }: StatCardProps) {
  return (
    <Link href={href} className="block" aria-label={ariaLabel || title}>
      <DashboardCard className="cursor-pointer">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center text-voxcina-blue dark:text-voxcina-cream">
            <span className="ml-2">{icon}</span>
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-voxcina-blue dark:text-voxcina-lightCream">{value}</div>
          <div className="flex justify-between items-center">
            <p className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70 mt-1">{subtitle}</p>
            <div className="h-8 w-8 flex items-center justify-center rounded-full bg-voxcina-cream dark:bg-voxcina-blue/30">
              <ChevronLeft className="h-5 w-5 text-voxcina-blue dark:text-voxcina-cream/80" />
            </div>
          </div>
        </CardContent>
      </DashboardCard>
    </Link>
  );
}
