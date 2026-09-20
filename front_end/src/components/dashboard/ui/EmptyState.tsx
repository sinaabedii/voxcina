import { ReactNode } from "react";
import { CardContent } from "@/components/ui/Card";
import DashboardCard from "./DashboardCard";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <DashboardCard hover={false} className={className}>
      <CardContent className="flex flex-col items-center justify-center p-8 text-center sm:p-12">
        <div className="relative mb-6">
          <div className="absolute inset-0 rounded-full bg-voxcina-blue/10 opacity-30 dark:bg-voxcina-blue/20" />
          <div className="relative rounded-full bg-voxcina-blue/5 p-4 shadow-soft dark:bg-voxcina-blue/30">
            {icon}
          </div>
        </div>

        <h3 className="mb-3 text-xl font-bold text-voxcina-blue dark:text-voxcina-cream">
          {title}
        </h3>
        <p className="mb-8 max-w-md text-voxcina-blue/70 dark:text-voxcina-cream/70">
          {description}
        </p>

        {action}
      </CardContent>
    </DashboardCard>
  );
}
