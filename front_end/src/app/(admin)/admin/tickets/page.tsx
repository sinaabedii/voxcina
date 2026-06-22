"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useTicketStore } from "@/store/ticket-store";
import { Ticket, TicketStatus, TicketPriority } from "@/types/ticket";
import {
  Ticket as TicketIcon,
  Search,
  SlidersHorizontal,
  Calendar,
  User,
  MessageCircle,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";

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

  const paginate = (page: number) => {
    if (!pagination) {
      setCurrentPage(page);
      return;
    }
    if (page > 0 && page <= pagination.totalPages) {
      setCurrentPage(page);
    }
  };

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

  const getStatusClass = (status: TicketStatus): string => {
    switch (status) {
      case "open":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400";
      case "pending":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400";
      case "answered":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400";
      case "closed":
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
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

  const getPriorityClass = (priority: TicketPriority): string => {
    switch (priority) {
      case "low":
        return "bg-sky-100 text-sky-800 dark:bg-sky-900/20 dark:text-sky-400";
      case "medium":
        return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400";
      case "high":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400";
      case "urgent":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
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
      <motion.div
        className="flex flex-col md:flex-row md:items-center justify-between mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-2xl md:text-3xl font-bold text-voxcina-blue dark:text-voxcina-cream mb-4 md:mb-0 relative inline-block">
          <span className="relative z-10">مدیریت تیکت‌های پشتیبانی</span>
          <span className="absolute bottom-1 left-0 w-full h-3 bg-voxcina-cream dark:bg-voxcina-blue/20 rounded-full -z-0 opacity-40"></span>
        </h1>

        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:flex-none md:w-64">
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <Search className="w-4 h-4 text-voxcina-blue/50 dark:text-voxcina-cream/50" />
            </div>
            <input
              type="text"
              className="bg-white dark:bg-voxcina-blue/30 border border-voxcina-cream/50 dark:border-voxcina-blue/50 text-voxcina-blue dark:text-voxcina-cream rounded-xl block w-full pr-9 pl-3 py-2 text-sm placeholder-voxcina-blue/50 dark:placeholder-voxcina-cream/50 focus:outline-none focus:border-voxcina-blue/60 dark:focus:border-voxcina-cream/60 shadow-sm"
              placeholder="جستجوی شماره تیکت یا عنوان..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl border-voxcina-blue/20 text-voxcina-blue dark:border-voxcina-blue/30 dark:text-voxcina-cream hover:bg-voxcina-blue/5 dark:hover:bg-voxcina-blue/20"
            onClick={() => setIsFilterOpen((prev) => !prev)}
          >
            <SlidersHorizontal className="w-4 h-4 ml-1" />
            فیلترها
          </Button>
        </div>
      </motion.div>

      {isFilterOpen && (
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
        >
          <Card className="border border-voxcina-cream dark:border-voxcina-blue/20 shadow-sm overflow-hidden rounded-2xl backdrop-blur-sm bg-white/90 dark:bg-voxcina-blue/10">
            <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <h3 className="text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-2">
                  وضعیت تیکت
                </h3>
                <select
                  className="bg-white dark:bg-voxcina-blue/30 border border-voxcina-cream/50 dark:border-voxcina-blue/50 text-voxcina-blue dark:text-voxcina-cream rounded-lg w-full p-2 text-sm focus:outline-none"
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
                </select>
              </div>
              <div>
                <h3 className="text-sm font-medium text-voxcina-blue dark:text-voxcina-cream mb-2">
                  اولویت
                </h3>
                <select
                  className="bg-white dark:bg-voxcina-blue/30 border border-voxcina-cream/50 dark:border-voxcina-blue/50 text-voxcina-blue dark:text-voxcina-cream rounded-lg w-full p-2 text-sm focus:outline-none"
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
                </select>
              </div>
              <div className="flex items-end justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl border-red-200 dark:border-red-900/30 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10"
                  onClick={() => {
                    setStatusFilter("all");
                    setPriorityFilter("all");
                    setSearchTerm("");
                    setCurrentPage(1);
                  }}
                >
                  پاک کردن فیلترها
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <Card className="border border-voxcina-cream dark:border-voxcina-blue/30 rounded-2xl bg-white/90 dark:bg-voxcina-blue/10 shadow-soft overflow-hidden">
        <CardContent className="p-0">
          {isLoading && tickets.length === 0 ? (
            <div className="p-6 text-center text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70">
              در حال بارگذاری تیکت‌ها...
            </div>
          ) : error && tickets.length === 0 ? (
            <div className="p-6 text-center text-sm text-red-600">{error}</div>
          ) : tickets.length === 0 ? (
            <div className="p-6 text-center text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70">
              هیچ تیکتی با این فیلترها پیدا نشد.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-voxcina-cream/40 dark:bg-voxcina-blue/40">
                  <tr>
                    <th className="text-right p-3 text-voxcina-blue/70 dark:text-voxcina-cream/70 font-medium">
                      شماره تیکت
                    </th>
                    <th className="text-right p-3 text-voxcina-blue/70 dark:text-voxcina-cream/70 font-medium">
                      عنوان
                    </th>
                    <th className="text-right p-3 text-voxcina-blue/70 dark:text-voxcina-cream/70 font-medium">
                      کاربر
                    </th>
                    <th className="text-right p-3 text-voxcina-blue/70 dark:text-voxcina-cream/70 font-medium">
                      وضعیت
                    </th>
                    <th className="text-right p-3 text-voxcina-blue/70 dark:text-voxcina-cream/70 font-medium">
                      اولویت
                    </th>
                    <th className="text-right p-3 text-voxcina-blue/70 dark:text-voxcina-cream/70 font-medium">
                      آخرین بروزرسانی
                    </th>
                    <th className="p-3" />
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-voxcina-blue/5 divide-y divide-voxcina-cream/40 dark:divide-voxcina-blue/30">
                  {tickets.map((ticket: Ticket) => (
                    <tr
                      key={ticket.id}
                      className="hover:bg-voxcina-cream/20 dark:hover:bg-voxcina-blue/20 transition-colors"
                    >
                      <td className="p-3 font-semibold text-voxcina-blue dark:text-voxcina-cream whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <TicketIcon className="w-4 h-4" />
                          <span>{ticket.ticket_number}</span>
                        </div>
                      </td>
                      <td className="p-3 text-voxcina-blue/80 dark:text-voxcina-cream/80 max-w-xs truncate">
                        {ticket.subject}
                      </td>
                      <td className="p-3 text-voxcina-blue/70 dark:text-voxcina-cream/70 text-xs whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          <span className="font-mono text-[11px]">
                            {ticket.user_id.slice(0, 6)}...{ticket.user_id.slice(-4)}
                          </span>
                        </div>
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs inline-flex items-center ${getStatusClass(
                            ticket.status,
                          )}`}
                        >
                          {getStatusLabel(ticket.status)}
                        </span>
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs inline-flex items-center ${getPriorityClass(
                            ticket.priority,
                          )}`}
                        >
                          {getPriorityLabel(ticket.priority)}
                        </span>
                      </td>
                      <td className="p-3 text-voxcina-blue/70 dark:text-voxcina-cream/70 flex items-center gap-1 text-xs whitespace-nowrap">
                        <Calendar className="w-3 h-3 text-voxcina-blue/50 dark:text-voxcina-cream/50" />
                        {new Date(ticket.updated_at).toLocaleString("fa-IR", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                        })}
                      </td>
                      <td className="p-3 text-left">
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-center mt-8">
          <div className="flex items-center space-x-1 space-x-reverse bg-white dark:bg-voxcina-blue/30 rounded-xl p-1 shadow-sm">
            <Button
              variant="ghost"
              size="sm"
              className={`rounded-lg ${
                currentPage === 1
                  ? "text-voxcina-blue/40 dark:text-voxcina-cream/40 cursor-not-allowed"
                  : "text-voxcina-blue dark:text-voxcina-cream"
              }`}
              onClick={() => paginate(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>

            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(
              (number) => (
                <Button
                  key={number}
                  variant={currentPage === number ? "primary" : "ghost"}
                  size="sm"
                  className={`rounded-lg ${
                    currentPage === number
                      ? "bg-voxcina-blue text-white dark:bg-voxcina-cream dark:text-voxcina-blue"
                      : "text-voxcina-blue dark:text-voxcina-cream"
                  }`}
                  onClick={() => paginate(number)}
                >
                  {number}
                </Button>
              ),
            )}

            <Button
              variant="ghost"
              size="sm"
              className={`rounded-lg ${
                currentPage === pagination.totalPages
                  ? "text-voxcina-blue/40 dark:text-voxcina-cream/40 cursor-not-allowed"
                  : "text-voxcina-blue dark:text-voxcina-cream"
              }`}
              onClick={() => paginate(currentPage + 1)}
              disabled={currentPage === pagination.totalPages}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
