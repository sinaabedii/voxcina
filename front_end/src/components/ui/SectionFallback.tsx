interface SectionFallbackProps {
  height?: string;
  message?: string;
}

export default function SectionFallback({
  height = "h-40",
  message = "در حال بارگذاری...",
}: SectionFallbackProps) {
  return (
    <div className={`${height} flex items-center justify-center text-gray-500`}>
      {message}
    </div>
  );
}
