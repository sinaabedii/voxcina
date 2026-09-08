import { cn } from "@/lib/utils";

type SectionSpacing = "default" | "compact" | "none";
type SectionWidth = "default" | "narrow" | "full";

interface SectionProps {
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
  spacing?: SectionSpacing;
  width?: SectionWidth;
  id?: string;
  as?: "section" | "div";
}

const spacingMap: Record<SectionSpacing, string> = {
  default: "mb-16 md:mb-24",
  compact: "mb-8 md:mb-12",
  none: "",
};

const widthMap: Record<SectionWidth, string> = {
  default: "container px-4 md:px-8",
  narrow: "container max-w-4xl px-4 md:px-8",
  full: "w-full",
};

/**
 * Reusable page section wrapper.
 * Centralises the repeated `container px-4 md:px-8 mb-16 md:mb-24` pattern
 * that was copy-pasted across every home section.
 */
export default function Section({
  children,
  className,
  containerClassName,
  spacing = "default",
  width = "default",
  id,
  as: Tag = "section",
}: SectionProps) {
  return (
    <Tag id={id} className={cn(spacingMap[spacing], "animate-slideUp", className)}>
      <div className={cn(widthMap[width], containerClassName)}>{children}</div>
    </Tag>
  );
}
