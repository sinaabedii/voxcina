"use client";

import type { ReactNode } from "react";
import { BedDouble, Briefcase, Home, Loader2, MapPin, Pencil, Trash2 } from "lucide-react";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/badge";
import DashboardCard from "@/components/dashboard/ui/DashboardCard";
import { cn } from "@/lib/utils";
import { addressTypeFromTitle, type AddressType } from "@/lib/address";
import type { Address } from "@/types/user";

const TYPE_ICONS: Record<AddressType, ReactNode> = {
  home: <Home className="h-4 w-4" />,
  work: <Briefcase className="h-4 w-4" />,
  dorm: <BedDouble className="h-4 w-4" />,
};

interface AddressCardProps {
  address: Address;
  isBusy: boolean;
  onEdit: (address: Address) => void;
  onDelete: (address: Address) => void;
  onSetDefault: (address: Address) => void;
}

export default function AddressCard({
  address,
  isBusy,
  onEdit,
  onDelete,
  onSetDefault,
}: AddressCardProps) {
  const type = addressTypeFromTitle(address.title);
  const addressLine = [address.province, address.city, address.address]
    .filter(Boolean)
    .join("، ");

  return (
    <DashboardCard
      className={cn(
        "h-full",
        address.isDefault &&
          "border-voxcina-blue/30 bg-gradient-to-br from-voxcina-blue/5 to-voxcina-cream/60 dark:from-voxcina-blue/20 dark:to-voxcina-blue/5",
      )}
    >
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2 pt-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-voxcina-cream text-voxcina-blue dark:bg-voxcina-blue/30 dark:text-voxcina-cream">
            {TYPE_ICONS[type]}
          </span>
          <CardTitle className="flex flex-wrap items-center gap-2 text-lg text-voxcina-blue dark:text-voxcina-cream">
            {address.title || "آدرس"}
            {address.isDefault && (
              <Badge className="bg-voxcina-blue text-white dark:bg-voxcina-cream dark:text-voxcina-blue">
                پیش‌فرض
              </Badge>
            )}
          </CardTitle>
        </div>

        <div className="flex items-center gap-1">
          <IconActionButton
            label="ویرایش آدرس"
            onClick={() => onEdit(address)}
            disabled={isBusy}
            className="text-voxcina-blue hover:bg-voxcina-blue/10 dark:text-voxcina-cream dark:hover:bg-voxcina-blue/30"
          >
            {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
          </IconActionButton>
          <IconActionButton
            label="حذف آدرس"
            onClick={() => onDelete(address)}
            disabled={isBusy}
            className="text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
          >
            {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </IconActionButton>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pb-6">
        <p className="font-medium text-voxcina-blue dark:text-voxcina-cream">
          {address.firstName} {address.lastName}
        </p>

        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-voxcina-blue/60 dark:text-voxcina-cream/60" />
          <p className="text-sm leading-relaxed text-voxcina-blue/70 dark:text-voxcina-cream/70">
            {addressLine}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <InfoBox label="کد پستی" value={address.postalCode} />
          <InfoBox label="شماره تماس" value={address.phoneNumber} ltr />
        </div>

        {!address.isDefault && (
          <Button
            variant="outline"
            size="sm"
            fullWidth
            isLoading={isBusy}
            onClick={() => onSetDefault(address)}
          >
            تنظیم به عنوان آدرس پیش‌فرض
          </Button>
        )}
      </CardContent>
    </DashboardCard>
  );
}

interface IconActionButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}

function IconActionButton({ label, onClick, disabled, className, children }: IconActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(
        "rounded-full p-2 transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
    >
      {children}
    </button>
  );
}

function InfoBox({ label, value, ltr }: { label: string; value: string; ltr?: boolean }) {
  return (
    <div className="rounded-lg bg-voxcina-cream/60 p-2.5 dark:bg-voxcina-blue/15">
      <span className="mb-1 block text-xs text-voxcina-blue/50 dark:text-voxcina-cream/50">{label}</span>
      <span
        dir={ltr ? "ltr" : undefined}
        className="block font-mono tracking-wide text-voxcina-blue dark:text-voxcina-cream"
      >
        {value}
      </span>
    </div>
  );
}
