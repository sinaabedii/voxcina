"use client";

import { AlertCircle, LucideIcon } from "lucide-react";
import { Loader2 } from "lucide-react";
import Button from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

export function AdminLoading({ message = "در حال بارگذاری..." }: { message?: string }) {
  return (
    <Card className="border border-voxcina-cream dark:border-voxcina-blue/20 rounded-2xl bg-white/90 dark:bg-voxcina-blue/10">
      <CardContent className="p-8 flex items-center justify-center gap-3 text-voxcina-blue dark:text-voxcina-cream">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span className="text-sm font-medium">{message}</span>
      </CardContent>
    </Card>
  );
}

export function AdminError({
  message,
  onRetry,
  className,
}: {
  message: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-6 p-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-xl flex items-center justify-between gap-3",
        className
      )}
    >
      <span className="inline-flex items-center gap-2 text-sm">
        <AlertCircle className="w-4 h-4 shrink-0" />
        {message}
      </span>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="rounded-xl border-red-300 text-red-600 dark:border-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 shrink-0"
        >
          تلاش مجدد
        </Button>
      )}
    </div>
  );
}

interface AdminEmptyProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function AdminEmpty({ icon: Icon, title, description, action }: AdminEmptyProps) {
  return (
    <Card className="border border-voxcina-cream dark:border-voxcina-blue/20 rounded-2xl bg-white/90 dark:bg-voxcina-blue/10">
      <CardContent className="p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-voxcina-cream dark:bg-voxcina-blue/30 flex items-center justify-center mx-auto mb-4">
          <Icon className="w-8 h-8 text-voxcina-blue/60 dark:text-voxcina-cream/60" />
        </div>
        <h3 className="text-lg font-bold text-voxcina-blue dark:text-voxcina-cream mb-2">
          {title}
        </h3>
        {description && (
          <p className="text-sm text-voxcina-blue/60 dark:text-voxcina-cream/60 mb-6 leading-relaxed">
            {description}
          </p>
        )}
        {action}
      </CardContent>
    </Card>
  );
}
