import { cn } from "@/lib/utils";

interface DashboardCardHeaderProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  className?: string;
}

export default function DashboardCardHeader({ icon, title, description, className }: DashboardCardHeaderProps) {
  return (
    <div
      className={cn(
        "border-b border-voxcina-cream/70 bg-gradient-to-l from-voxcina-cream/80 via-white to-white px-5 py-5 dark:border-voxcina-blue/30 dark:from-voxcina-blue/25 dark:via-voxcina-blue/10 dark:to-transparent md:px-7",
        className,
      )}
    >
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-voxcina-blue text-white shadow-sm dark:bg-voxcina-cream dark:text-voxcina-blue">
          {icon}
        </div>
        <div>
          <h2 className="text-lg font-bold text-voxcina-blue dark:text-voxcina-cream">{title}</h2>
          {description && (
            <p className="mt-1 text-sm text-voxcina-blue/65 dark:text-voxcina-cream/65">{description}</p>
          )}
        </div>
      </div>
    </div>
  );
}
