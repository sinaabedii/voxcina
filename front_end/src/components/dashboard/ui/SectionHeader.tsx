import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  title: string;
  icon?: React.ReactNode;
  className?: string;
  titleClassName?: string;
}

export default function SectionHeader({ title, icon, className, titleClassName }: SectionHeaderProps) {
  return (
    <h2 className={cn("text-xl font-semibold flex items-center text-voxcina-blue dark:text-voxcina-cream", className)}>
      {icon && <span className="ml-2">{icon}</span>}
      {title}
    </h2>
  );
}
