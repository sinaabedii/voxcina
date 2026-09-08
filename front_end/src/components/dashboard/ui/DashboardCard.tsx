import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

interface DashboardCardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

export default function DashboardCard({ className, hover = true, children, ...props }: DashboardCardProps) {
  return (
    <Card
      className={cn(
        "border border-voxcina-cream dark:border-voxcina-blue/20 shadow-sm rounded-2xl backdrop-blur-sm bg-white/90 dark:bg-voxcina-blue/10 overflow-hidden",
        hover && "hover:shadow-md hover:border-voxcina-blue/20 dark:hover:border-voxcina-cream/20 transition-all",
        className,
      )}
      {...props}
    >
      {children}
    </Card>
  );
}
