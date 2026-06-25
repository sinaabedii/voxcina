"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, X, Loader2, ImageIcon } from "lucide-react";
import { CategoryAvatar } from "@/types/category";
import { useCategoryStore } from "@/store/category-store";

interface AvatarPickerProps {
  value: string;
  onChange: (path: string) => void;
}

export default function AvatarPicker({ value, onChange }: AvatarPickerProps) {
  const { avatars, avatarsLoading, fetchAvatars } = useCategoryStore();
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchAvatars();
  }, [fetchAvatars]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return avatars;
    return avatars.filter(
      (a) =>
        a.name.toLowerCase().includes(needle) ||
        a.color.toLowerCase().includes(needle) ||
        a.file.toLowerCase().includes(needle)
    );
  }, [avatars, search]);

  // Group by base name so the white/blue pair sits next to each other
  const grouped = useMemo(() => {
    const map = new Map<string, CategoryAvatar[]>();
    for (const a of filtered) {
      if (!map.has(a.name)) map.set(a.name, []);
      map.get(a.name)!.push(a);
    }
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <div>
      <div className="relative">
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <Search className="w-4 h-4 text-voxcina-blue/50 dark:text-voxcina-cream/50" />
        </div>
        <input
          type="text"
          className="bg-white dark:bg-voxcina-blue/30 border border-voxcina-cream/50 dark:border-voxcina-blue/50 text-voxcina-blue dark:text-voxcina-cream rounded-xl block w-full pr-9 pl-9 p-2 text-sm placeholder-voxcina-blue/50 dark:placeholder-voxcina-cream/50 focus:outline-none focus:border-voxcina-blue/50 dark:focus:border-voxcina-cream/50"
          placeholder="جستجوی آواتار... (مثلاً shirt)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute inset-y-0 left-0 flex items-center pl-2 text-voxcina-blue/50 hover:text-voxcina-blue dark:text-voxcina-cream/50 dark:hover:text-voxcina-cream"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Selected preview */}
      {value && (
        <div className="mt-2 flex items-center gap-2 p-2 rounded-lg bg-voxcina-cream/40 dark:bg-voxcina-blue/20">
          <img
            src={value}
            alt="انتخاب شده"
            className="w-10 h-10 object-contain"
            onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
          />
          <div className="flex-1 text-xs text-voxcina-blue/80 dark:text-voxcina-cream/80 truncate">
            {value}
          </div>
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
            title="حذف آواتار"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Grid */}
      <div className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-voxcina-cream/50 dark:border-voxcina-blue/30 p-2">
        {avatarsLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-voxcina-blue/50 dark:text-voxcina-cream/50" />
          </div>
        ) : grouped.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-voxcina-blue/50 dark:text-voxcina-cream/50">
            <ImageIcon className="w-6 h-6 mb-1" />
            <p className="text-xs">
              {avatars.length === 0
                ? "هیچ آواتاری در پوشه uploads/avatars/categories/ یافت نشد"
                : "نتیجه‌ای برای جستجو یافت نشد"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {grouped.map(([baseName, items]) => (
              <div key={baseName}>
                <div className="text-[10px] uppercase tracking-wide text-voxcina-blue/50 dark:text-voxcina-cream/50 mb-1">
                  {baseName}
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {items.map((a) => {
                    const selected = value === a.path;
                    return (
                      <button
                        key={a.file}
                        type="button"
                        onClick={() => onChange(a.path)}
                        className={`relative aspect-square rounded-lg border-2 p-1.5 flex items-center justify-center transition-all ${
                          selected
                            ? "border-voxcina-blue dark:border-voxcina-cream bg-voxcina-cream/40 dark:bg-voxcina-blue/30 ring-2 ring-voxcina-blue/30"
                            : "border-voxcina-cream/50 dark:border-voxcina-blue/30 hover:border-voxcina-blue/40 dark:hover:border-voxcina-cream/40 bg-white dark:bg-voxcina-blue/10"
                        }`}
                        title={`${a.file}`}
                      >
                        <img
                          src={a.path}
                          alt={a.file}
                          className="w-full h-full object-contain"
                          onError={(e) =>
                            ((e.target as HTMLImageElement).style.display = "none")
                          }
                        />
                        {selected && (
                          <div className="absolute -top-1 -left-1 w-3 h-3 rounded-full bg-voxcina-blue dark:bg-voxcina-cream border-2 border-white dark:border-voxcina-blue/30" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <p className="mt-1 text-[10px] text-voxcina-blue/50 dark:text-voxcina-cream/50">
        برای افزودن آواتار جدید، فایل SVG را در پوشه‌ی uploads/avatars/categories/ سرور قرار دهید و این صفحه را refresh کنید.
      </p>
    </div>
  );
}
