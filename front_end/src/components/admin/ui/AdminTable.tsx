"use client";

import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

export function AdminTableCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "border border-voxcina-cream dark:border-voxcina-blue/20 shadow-md overflow-hidden rounded-2xl bg-white/90 dark:bg-voxcina-blue/10",
        className
      )}
    >
      {children}
    </Card>
  );
}

export function AdminTableScroll({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("overflow-x-auto", className)}>{children}</div>
  );
}

export function AdminTh({
  children,
  className,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "text-right px-4 py-3 text-xs font-medium text-voxcina-blue/70 dark:text-voxcina-cream/70 uppercase tracking-wider whitespace-nowrap",
        className
      )}
      {...props}
    >
      {children}
    </th>
  );
}

export function AdminTd({
  children,
  className,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn(
        "px-4 py-3 text-sm text-voxcina-blue/80 dark:text-voxcina-cream/80",
        className
      )}
      {...props}
    >
      {children}
    </td>
  );
}

interface AdminTableProps {
  head: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/**
 * Standard admin data table: card wrapper + scroll container + unified
 * thead/tbody chrome. Row cells use <AdminTd>, header cells <AdminTh>.
 */
export default function AdminTable({ head, children, className }: AdminTableProps) {
  return (
    <AdminTableCard>
      <AdminTableScroll>
        <table className={cn("w-full text-sm", className)}>
          <thead className="bg-voxcina-cream/40 dark:bg-voxcina-blue/20">
            <tr>{head}</tr>
          </thead>
          <tbody className="divide-y divide-voxcina-cream/40 dark:divide-voxcina-blue/10">
            {children}
          </tbody>
        </table>
      </AdminTableScroll>
    </AdminTableCard>
  );
}
