export default function TryOnLoading() {
  return (
    <div className="container py-20 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 relative">
          <div className="absolute inset-0 border-4 border-voxcina-cream/30 dark:border-voxcina-blue/30 rounded-full animate-pulse-soft" />
          <div className="absolute inset-0 border-4 border-t-voxcina-blue dark:border-t-voxcina-cream border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
        </div>
        <p className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70">
          در حال بارگذاری...
        </p>
      </div>
    </div>
  );
}
