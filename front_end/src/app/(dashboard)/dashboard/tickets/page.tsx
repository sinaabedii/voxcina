"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Ticket, TicketStatus, TicketPriority } from "@/types/ticket";
import { useTicketStore } from "@/store/ticket-store";
import Button from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Ticket as TicketIcon, MessageSquare, Filter, PlusCircle, Calendar } from "lucide-react";
import Link from "next/link";

const statusTabs: ("all" | TicketStatus)[] = ["all", "open", "pending", "answered", "closed"];

export default function TicketsPage() {
  const {
    tickets,
    isLoading,
    error,
    pagination,
    fetchUserTickets,
  } = useTicketStore();

  const [activeStatus, setActiveStatus] = useState<("all" | TicketStatus)>("all");
  const [showNewTicketForm, setShowNewTicketForm] = useState(false);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState<TicketPriority>("medium");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const filters: Record<string, any> = {};
    if (activeStatus !== "all") filters.status = activeStatus;
    fetchUserTickets(pagination?.currentPage || 1, 10, filters);
  }, [activeStatus, fetchUserTickets, pagination?.currentPage]);

  const handleSubmitNewTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;
    const ticket = await useTicketStore.getState().createTicket({
      subject: subject.trim(),
      category: category || "general",
      priority,
      message: message.trim(),
    });
    if (ticket) {
      setShowNewTicketForm(false);
      setSubject("");
      setCategory("");
      setPriority("medium");
      setMessage("");
    }
  };

  const getStatusLabel = (status: TicketStatus): string => {
    switch (status) {
      case "open":
        return "باز";
      case "pending":
        return "در انتظار پاسخ";
      case "answered":
        return "پاسخ داده شده";
      case "closed":
        return "بسته شده";
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

  const renderPagination = () => {
    if (!pagination || pagination.totalPages <= 1) return null;
    const pages = [];
    for (let i = 1; i <= pagination.totalPages; i++) pages.push(i);
    return (
      <div className="flex items-center justify-center gap-2 mt-6">
        {pages.map((p) => (
          <button
            key={p}
            className={`px-3 py-1 rounded-xl text-sm transition-colors ${
              pagination.currentPage === p
                ? "bg-voxcina-blue text-white"
                : "bg-transparent border border-voxcina-blue/20 text-voxcina-blue hover:bg-voxcina-blue/5"
            }`}
            onClick={() => {
              const filters: Record<string, any> = {};
              if (activeStatus !== "all") filters.status = activeStatus;
              fetchUserTickets(p, 10, filters);
            }}
          >
            {p}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="container py-8 md:py-12 mx-auto px-4 md:px-8">
      <motion.div
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-voxcina-blue dark:text-voxcina-cream">
            تیکت‌های پشتیبانی
          </h1>
          <p className="text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70 mt-1">
            سوالات، مشکلات و درخواست‌های خود را از این بخش با تیم پشتیبانی در میان بگذارید.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl border-voxcina-blue/20 text-voxcina-blue dark:border-voxcina-blue/30 dark:text-voxcina-cream"
          >
            <Filter className="w-4 h-4 ml-2" />
            وضعیت: {activeStatus === "all" ? "همه" : getStatusLabel(activeStatus as TicketStatus)}
          </Button>
          <Button
            variant="primary"
            size="sm"
            className="rounded-xl bg-voxcina-blue hover:bg-voxcina-darkBlue"
            onClick={() => setShowNewTicketForm((prev) => !prev)}
          >
            <PlusCircle className="w-4 h-4 ml-2" />
            تیکت جدید
          </Button>
        </div>
      </motion.div>

      <motion.div
        className="mb-6 overflow-x-auto pb-2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <div className="inline-flex bg-voxcina-cream/30 dark:bg-voxcina-blue/20 rounded-xl p-1 min-w-full sm:min-w-0">
          {statusTabs.map((status) => (
            <button
              key={status}
              className={`px-4 py-2 text-sm rounded-xl transition-all min-w-20 whitespace-nowrap ${
                activeStatus === status
                  ? "bg-white dark:bg-voxcina-blue/40 shadow-soft text-voxcina-blue dark:text-voxcina-cream"
                  : "text-voxcina-blue/60 dark:text-voxcina-cream/60 hover:bg-white/50 dark:hover:bg-voxcina-blue/30"
              }`}
              onClick={() => setActiveStatus(status)}
            >
              {status === "all" ? "همه" : getStatusLabel(status as TicketStatus)}
            </button>
          ))}
        </div>
      </motion.div>

      {showNewTicketForm && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="mb-6"
        >
          <Card className="border border-voxcina-cream dark:border-voxcina-blue/30 rounded-2xl bg-white/90 dark:bg-voxcina-blue/10 shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center text-voxcina-blue dark:text-voxcina-cream">
                <MessageSquare className="w-5 h-5 ml-2" />
                ثبت تیکت جدید
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitNewTicket} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-voxcina-blue/80 dark:text-voxcina-cream/80 mb-1">
                    عنوان تیکت
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-voxcina-blue/20 dark:border-voxcina-blue/40 bg-white/80 dark:bg-voxcina-blue/20 text-sm text-voxcina-blue dark:text-voxcina-cream focus:outline-none focus:ring-2 focus:ring-voxcina-blue/30"
                    placeholder="مثلاً: مشکل در ثبت سفارش"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-voxcina-blue/80 dark:text-voxcina-cream/80 mb-1">
                      دسته‌بندی
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-voxcina-blue/20 dark:border-voxcina-blue/40 bg-white/80 dark:bg-voxcina-blue/20 text-sm text-voxcina-blue dark:text-voxcina-cream focus:outline-none focus:ring-2 focus:ring-voxcina-blue/30"
                    >
                      <option value="">انتخاب کنید</option>
                      <option value="order">مشکلات سفارش</option>
                      <option value="payment">پرداخت و مالی</option>
                      <option value="product">محصولات و موجودی</option>
                      <option value="technical">مشکلات فنی سایت</option>
                      <option value="general">سوالات عمومی</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-voxcina-blue/80 dark:text-voxcina-cream/80 mb-1">
                      اولویت
                    </label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as TicketPriority)}
                      className="w-full px-3 py-2 rounded-xl border border-voxcina-blue/20 dark:border-voxcina-blue/40 bg-white/80 dark:bg-voxcina-blue/20 text-sm text-voxcina-blue dark:text-voxcina-cream focus:outline-none focus:ring-2 focus:ring-voxcina-blue/30"
                    >
                      <option value="low">کم</option>
                      <option value="medium">معمولی</option>
                      <option value="high">بالا</option>
                      <option value="urgent">فوری</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-voxcina-blue/80 dark:text-voxcina-cream/80 mb-1">
                    متن پیام
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 rounded-xl border border-voxcina-blue/20 dark:border-voxcina-blue/40 bg-white/80 dark:bg-voxcina-blue/20 text-sm text-voxcina-blue dark:text-voxcina-cream focus:outline-none focus:ring-2 focus:ring-voxcina-blue/30 resize-none"
                    placeholder="لطفاً مشکل یا سوال خود را با جزئیات توضیح دهید..."
                    required
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-xl border-voxcina-blue/20 text-voxcina-blue dark:border-voxcina-blue/30 dark:text-voxcina-cream"
                    onClick={() => setShowNewTicketForm(false)}
                  >
                    انصراف
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    className="rounded-xl bg-voxcina-blue hover:bg-voxcina-darkBlue"
                    disabled={isLoading}
                  >
                    ثبت تیکت
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {error && !isLoading && tickets.length === 0 && (
        <Card className="border border-red-200 dark:border-red-800/30 rounded-2xl bg-red-50 dark:bg-red-900/10 shadow-soft mb-6">
          <CardContent className="p-4 text-sm text-red-700 dark:text-red-300">
            {error}
          </CardContent>
        </Card>
      )}

      <Card className="border border-voxcina-cream dark:border-voxcina-blue/30 rounded-2xl bg-white/90 dark:bg-voxcina-blue/10 shadow-soft overflow-hidden">
        <CardHeader className="bg-voxcina-cream/40 dark:bg-voxcina-blue/30">
          <CardTitle className="flex items-center text-voxcina-blue dark:text-voxcina-cream text-base md:text-lg">
            <TicketIcon className="w-5 h-5 ml-2" />
            لیست تیکت‌ها
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading && tickets.length === 0 ? (
            <div className="p-6 text-center text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70">
              در حال بارگذاری تیکت‌ها...
            </div>
          ) : tickets.length === 0 ? (
            <div className="p-6 text-center text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70">
              هیچ تیکتی ثبت نشده است.
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
                      دسته‌بندی
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
                    <tr key={ticket.id} className="hover:bg-voxcina-cream/20 dark:hover:bg-voxcina-blue/20 transition-colors">
                      <td className="p-3 font-semibold text-voxcina-blue dark:text-voxcina-cream">
                        {ticket.ticket_number}
                      </td>
                      <td className="p-3 text-voxcina-blue/80 dark:text-voxcina-cream/80 max-w-xs truncate">
                        {ticket.subject}
                      </td>
                      <td className="p-3 text-voxcina-blue/70 dark:text-voxcina-cream/70 text-xs">
                        {ticket.category || "عمومی"}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs inline-flex items-center ${getStatusClass(ticket.status)}`}
                        >
                          {getStatusLabel(ticket.status)}
                        </span>
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs inline-flex items-center ${getPriorityClass(ticket.priority)}`}
                        >
                          {getPriorityLabel(ticket.priority)}
                        </span>
                      </td>
                      <td className="p-3 text-voxcina-blue/70 dark:text-voxcina-cream/70 flex items-center gap-1 text-xs">
                        <Calendar className="w-3 h-3 text-voxcina-blue/50 dark:text-voxcina-cream/50" />
                        {new Date(ticket.updated_at).toLocaleString("fa-IR", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                        })}
                      </td>
                      <td className="p-3 text-left">
                        <Link href={`/dashboard/tickets/${ticket.id}`} legacyBehavior>
                          <a className="text-voxcina-blue dark:text-voxcina-cream text-xs hover:underline">
                            مشاهده
                          </a>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {renderPagination()}
    </div>
  );
}
