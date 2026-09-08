"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import { useTicketStore } from "@/store/ticket-store";
import { Ticket, TicketStatus, TicketPriority } from "@/types/ticket";
import {
  Ticket as TicketIcon,
  Calendar,
  User,
  MessageCircle,
} from "lucide-react";
import {
  AdminPageHeader,
  AdminToolbar,
  AdminTable,
  AdminTh,
  AdminTd,
  AdminBadge,
  AdminLoading,
  AdminError,
  AdminEmpty,
  AdminPagination,
  AdminField,
  AdminSelect,
  AdminFormGrid,
  type AdminBadgeTone,
} from "@/components/admin/ui";

const statusTones: Record<TicketStatus, AdminBadgeTone> = {
  open: "warning",
  pending: "warning",
  answered: "success",
  closed: "neutral",
};

const priorityTones: Record<TicketPriority, AdminBadgeTone> = {
  low: "info",
  medium: "violet",
  high: "warning",
  urgent: "danger",
};

export default function AdminTicketsPage() {
  const {
    tickets,
    isLoading,
    error,
    pagination,
    fetchAdminTickets,
    adminUpdateTicketStatus,
  } = useTicketStore();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | TicketStatus>("all");
  const [priorityFilter, setPriorityFilter] =
    useState<"all" | TicketPriority>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  useEffect(() => {
    const filters: Record<string, any> = {};
    if (statusFilter !== "all") filters.status = statusFilter;
    if (priorityFilter !== "all") filters.priority = priorityFilter;
    if (searchTerm.trim()) filters.search = searchTerm.trim();

    fetchAdminTickets(currentPage, 20, filters);
  }, [currentPage, statusFilter, priorityFilter, searchTerm, fetchAdminTickets]);

  const clearFilters = () => {
    setStatusFilter("all");
    setPriorityFilter("all");
    setSearchTerm("");
    setCurrentPage(1);
  };

  const hasActiveFilters =
    statusFilter !== "all" || priorityFilter !== "all" || searchTerm.trim() !== "";

  const getStatusLabel = (status: TicketStatus): string => {
    switch (status) {
      case "open":
        return "باز";
      case "pending":
        return "در انتظار";
      case "answered":
        return "پاسخ داده شده";
      case "closed":
        return "بسته";
      default:
        return status;
    }
  };

  const getPriorityLabel = (priority: TicketPriority): string => {
    switch (priority) {
      case "low":
        return "کم";
      case "medium":
        return "معمولی";
      case "high":
        return "بالا";
      case "urgent":
        return "فوری";
      default:
        return priority;
    }
  };

  const handleQuickClose = async (ticket: Ticket) => {
    if (ticket.status === "closed") {
      await adminUpdateTicketStatus(ticket.id, "open");
    } else {
      await adminUpdateTicketStatus(ticket.id, "closed");
    }
  };

  return (
    <div className="py-8 md:py-12 transition-all duration-500 ease-in-out">
      <AdminPageHeader title="مدیریت تیکت‌های پشتیبانی" />

      <AdminToolbar
        searchValue={searchTerm}
        onSearchChange={(v) => {
          setSearchTerm(v);
          setCurrentPage(1);
        }}
        searchPlaceholder="جستجوی شماره تیکت یا عنوان..."
        filterOpen={isFilterOpen}
        onToggleFilters={() => setIsFilterOpen((prev) => !prev)}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearFilters}
      >
        <AdminFormGrid>
          <AdminField label="وضعیت تیکت">
            <AdminSelect
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setCurrentPage(1);
              }}
            >
              <option value="all">همه وضعیت‌ها</option>
              <option value="open">باز</option>
              <option value="pending">در انتظار</option>
              <option value="answered">پاسخ داده شده</option>
              <option value="closed">بسته</option>
            </AdminSelect>
          </AdminField>
          <AdminField label="اولویت">
            <AdminSelect
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value as any);
                setCurrentPage(1);
              }}
            >
              <option value="all">همه اولویت‌ها</option>
              <option value="low">کم</option>
              <option value="medium">معمولی</option>
              <option value="high">بالا</option>
              <option value="urgent">فوری</option>
            </AdminSelect>
          </AdminField>
        </AdminFormGrid>
      </AdminToolbar>

      {isLoading && tickets.length === 0 ? (
        <AdminLoading message="در حال بارگذاری تیکت‌ها..." />
      ) : error && tickets.length === 0 ? (
        <AdminError message={error} />
      ) : tickets.length === 0 ? (
        <AdminEmpty
          icon={TicketIcon}
          title="تیکتی پیدا نشد"
          description="هیچ تیکتی با این فیلترها پیدا نشد."
        />
      ) : (
        <AdminTable
          head={
            <>
              <AdminTh>شماره تیکت</AdminTh>
              <AdminTh>عنوان</AdminTh>
              <AdminTh>کاربر</AdminTh>
              <AdminTh>وضعیت</AdminTh>
              <AdminTh>اولویت</AdminTh>
              <AdminTh>آخرین بروزرسانی</AdminTh>
              <AdminTh />
            </>
          }
        >
          {tickets.map((ticket: Ticket) => (
            <tr
              key={ticket.id}
              className="hover:bg-voxcina-cream/20 dark:hover:bg-voxcina-blue/20 transition-colors"
            >
              <AdminTd className="font-semibold whitespace-nowrap">
                <div className="flex items-center gap-2">
                  <TicketIcon className="w-4 h-4" />
                  <span>{ticket.ticket_number}</span>
                </div>
              </AdminTd>
              <AdminTd className="max-w-xs truncate">
                {ticket.subject}
              </AdminTd>
              <AdminTd className="text-xs whitespace-nowrap">
                <div className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  <span className="font-mono text-[11px]">
                    {ticket.user_id.slice(0, 6)}...{ticket.user_id.slice(-4)}
                  </span>
                </div>
              </AdminTd>
              <AdminTd>
                <AdminBadge tone={statusTones[ticket.status] ?? "neutral"}>
                  {getStatusLabel(ticket.status)}
                </AdminBadge>
              </AdminTd>
              <AdminTd>
                <AdminBadge tone={priorityTones[ticket.priority] ?? "neutral"}>
                  {getPriorityLabel(ticket.priority)}
                </AdminBadge>
              </AdminTd>
              <AdminTd className="text-xs whitespace-nowrap">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 opacity-50" />
                  {new Date(ticket.updated_at).toLocaleString("fa-IR", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                  })}
                </span>
              </AdminTd>
              <AdminTd className="text-left">
                <div className="flex items-center gap-2 justify-end">
                  <Link href={`/admin/tickets/${ticket.id}`} legacyBehavior>
                    <a className="inline-flex items-center text-xs text-voxcina-blue dark:text-voxcina-cream hover:underline">
                      <MessageCircle className="w-3 h-3 ml-1" />
                      مشاهده و پاسخ
                    </a>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs rounded-xl text-voxcina-blue dark:text-voxcina-cream"
                    onClick={() => handleQuickClose(ticket)}
                  >
                    {ticket.status === "closed" ? "باز کردن" : "بستن"}
                  </Button>
                </div>
              </AdminTd>
            </tr>
          ))}
        </AdminTable>
      )}

      <AdminPagination
        page={currentPage}
        totalPages={pagination?.totalPages ?? 1}
        onChange={setCurrentPage}
      />
    </div>
  );
}
