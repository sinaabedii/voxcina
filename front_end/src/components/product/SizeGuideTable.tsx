"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface SizeGuideRow {
  size: string;
  chest?: string;
  waist?: string;
  hips?: string;
  height?: string;
  [key: string]: string | undefined;
}

interface SizeGuideTableProps {
  isOpen: boolean;
  rows?: SizeGuideRow[];
  columns?: { key: string; label: string }[];
  note?: string;
  className?: string;
}

const defaultRows: SizeGuideRow[] = [
  { size: "S", chest: "88-90", waist: "76-78", hips: "94-96", height: "160-165" },
  { size: "M", chest: "90-94", waist: "78-82", hips: "96-100", height: "165-170" },
  { size: "L", chest: "94-98", waist: "82-86", hips: "100-104", height: "170-175" },
  { size: "XL", chest: "98-102", waist: "86-90", hips: "104-108", height: "175-180" },
];

const defaultColumns = [
  { key: "size", label: "سایز" },
  { key: "chest", label: "سینه (cm)" },
  { key: "waist", label: "کمر (cm)" },
  { key: "hips", label: "باسن (cm)" },
  { key: "height", label: "قد (cm)" },
];

const SizeGuideTable: React.FC<SizeGuideTableProps> = ({
  isOpen,
  rows = defaultRows,
  columns = defaultColumns,
  note = "روش اندازه‌گیری: لطفاً از متر نواری استفاده کنید و اندازه‌ها را در حالت ایستاده و بدون کشش اندازه‌گیری کنید.",
  className,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={cn(
            "mt-2 p-4 border border-border/20 rounded-xl bg-card/90 shadow-soft backdrop-blur-sm mb-6",
            className
          )}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3 }}
        >
          <h4 className="font-medium mb-3 text-foreground">راهنمای سایز</h4>

          <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-secondary/50">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/20">
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      className="p-2 text-right text-foreground font-medium"
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIndex) => (
                  <tr
                    key={rowIndex}
                    className={cn(
                      "hover:bg-secondary/30 transition-colors",
                      rowIndex < rows.length - 1 && "border-b border-border/10"
                    )}
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={cn(
                          "p-2",
                          col.key === "size"
                            ? "text-foreground font-medium"
                            : "text-muted-foreground"
                        )}
                      >
                        {row[col.key] || "-"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {note && (
            <div className="mt-3 text-xs text-muted-foreground">
              <p>{note}</p>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SizeGuideTable;
