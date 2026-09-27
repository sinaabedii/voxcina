"use client";

import React from "react";
import { Check, Loader2 } from "lucide-react";
import Button from "@/components/ui/Button";
import SelectableRadioCard from "@/components/checkout/SelectableRadioCard";
import type { Address } from "@/types/user";
import { cn } from "@/lib/utils";

interface AddressCardProps {
  address: Address;
  selected: boolean;
  onSelect: () => void;
  onEdit: (id: string) => void;
  onSetDefault: (id: string) => void;
  operationLoading: string | null;
  typeIcon: React.ReactNode;
}

/**
 * Compact selectable address row.
 * Mobile: tighter padding, smaller lines, 44px touch targets.
 * Desktop: keeps the roomier rhythm.
 */
export default function AddressCard({
  address,
  selected,
  onSelect,
  onEdit,
  onSetDefault,
  operationLoading,
  typeIcon,
}: AddressCardProps) {
  const isBusy = operationLoading === address.id;

  return (
    <SelectableRadioCard
      selected={selected}
      onSelect={onSelect}
      radioId={address.id ? `address-${address.id}` : undefined}
      radioName="checkout-address"
      title={
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="flex items-center gap-1 truncate">
            <span className="shrink-0 text-voxcina-blue/70 dark:text-voxcina-cream/70 [&_svg]:h-4 [&_svg]:w-4">
              {typeIcon}
            </span>
            <span className="truncate">{address.title}</span>
          </span>
          {address.isDefault && (
            <span className="shrink-0 rounded-full bg-voxcina-blue px-2 py-0.5 text-[11px] text-white dark:bg-voxcina-cream dark:text-voxcina-blue">
              پیش‌فرض
            </span>
          )}
        </span>
      }
      action={
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (address.id) onEdit(address.id);
          }}
          aria-label={`ویرایش آدرس ${address.title}`}
          className={cn(
            "shrink-0 rounded-lg px-3 text-xs text-voxcina-blue/70 hover:bg-voxcina-blue/5 hover:text-voxcina-blue",
            "dark:text-voxcina-cream/70 dark:hover:bg-voxcina-cream/5 dark:hover:text-voxcina-cream",
            "max-md:min-h-[44px] max-md:min-w-[44px] max-md:items-center max-md:justify-center max-md:flex"
          )}
        >
          ویرایش
        </button>
      }
      body={
        <div className="mr-7 space-y-0.5 text-[13px] leading-5 text-voxcina-blue/70 dark:text-voxcina-cream/70 md:space-y-1 md:text-sm md:leading-6">
          <p className="font-medium text-voxcina-blue dark:text-voxcina-cream">
            {address.firstName} {address.lastName}
          </p>
          <p className="line-clamp-2">
            {address.province}، {address.city}، {address.address}
          </p>
          <p>کد پستی: {address.postalCode}</p>
          <p className="text-voxcina-blue dark:text-voxcina-cream">
            شماره تماس: {address.phoneNumber}
          </p>
        </div>
      }
      footer={
        !address.isDefault ? (
          <div className="mr-7 md:mr-7" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="outline"
              size="sm"
              className="w-full rounded-lg border-voxcina-blue/20 text-xs text-voxcina-blue hover:bg-voxcina-blue/5 max-md:min-h-[44px] dark:border-voxcina-cream/20 dark:text-voxcina-cream dark:hover:bg-voxcina-cream/5"
              onClick={() => {
                if (address.id) onSetDefault(address.id);
              }}
              disabled={isBusy}
            >
              {isBusy ? (
                <Loader2 className="ml-1 h-3 w-3 animate-spin" />
              ) : (
                <Check className="ml-1 h-3 w-3" />
              )}
              {isBusy ? "در حال تنظیم..." : "تنظیم به عنوان پیش‌فرض"}
            </Button>
          </div>
        ) : undefined
      }
    />
  );
}
