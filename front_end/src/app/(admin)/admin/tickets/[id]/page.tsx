"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { useTicketStore } from "@/store/ticket-store";
import { Ticket, TicketMessage, TicketStatus, TicketPriority } from "@/types/ticket";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import {
  ArrowRight,
  MessageCircle,
  User,
  HeadphonesIcon,
  Clock,
  SlidersHorizontal,
} from "lucide-react";

export default function AdminTicketDetailPage() {
  const params = useParams<{ id: string }>();
  const ticketId = params?.id as string;

  const {
    currentTicket,
    isLoading,
    error,
    fetchTicketById,
    addTicketMessage,
    adminUpdateTicketStatus,
  } = useTicketStore();

  const [localTicket, setLocalTicket] = useState<Ticket | null>(null);
  const [reply, setReply] = useState("");
  const [editingStatus, setEditingStatus] = useState<TicketStatus | "">("");
  const [editingPriority, setEditingPriority] = useState<TicketPriority | "">("");

  useEffect(() => {
    if (!ticketId) return;
    (async () => {
      const t = await fetchTicketById(ticketId);
      if (t) {
        setLocalTicket(t);
        setEditingStatus(t.status);
        setEditingPriority(t.priority);
      }
    })();
  }, [ticketId, fetchTicketById]);

  useEffect(() => {
    if (currentTicket && currentTicket.id === ticketId) {
      setLocalTicket(currentTicket);
      setEditingStatus(currentTicket.status);
      setEditingPriority(currentTicket.priority);
    }
  }, [currentTicket, ticketId]);

  if (!ticketId) {
    return <div className="p-6 text-sm text-red-600">شناسه تیکت نامعتبر است.</div>;
  }

  if (isLoading && !localTicket) {
    return (
      <div className="p-6 text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70">
        در حال بارگذاری تیکت...
      </div>
    );
  }

  if (error && !localTicket) {
    return <div className="p-6 text-sm text-red-600">{error}</div>;
  }

  if (!localTicket) {
    return (
      <div className="p-6 text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70">
        تیکت پیدا نشد.
      </div>
    );
  }

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply.trim()) return;
    await addTicketMessage(ticketId, reply.trim());
    setReply("");
  };

  const handleUpdateMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStatus) return;
    await adminUpdateTicketStatus(ticketId, editingStatus, editingPriority || undefined);
  };

  const messages: TicketMessage[] = localTicket.messages || [];

  return (
    <div className="container py-8 md:py-12 mx-auto px-4 md:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-voxcina-blue dark:text-voxcina-cream flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            تیکت {localTicket.ticket_number}
          </h1>
          <p className="text-xs sm:text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70 mt-1">
            {localTicket.subject}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="rounded-xl border-voxcina-blue/20 text-voxcina-blue dark:border-voxcina-blue/30 dark:text-voxcina-cream"
          onClick={() => history.back()}
        >
          <ArrowRight className="w-4 h-4 ml-1" />
          بازگشت
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border border-voxcina-cream dark:border-voxcina-blue/30 rounded-2xl bg-white/90 dark:bg-voxcina-blue/10 shadow-soft flex flex-col max-h-[70vh]">
          <CardHeader className="border-b border-voxcina-cream/60 dark:border-voxcina-blue/40">
            <CardTitle className="text-sm sm:text-base text-voxcina-blue dark:text-voxcina-cream flex items-center gap-2">
              <HeadphonesIcon className="w-4 h-4" />
              گفتگو با کاربر
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto space-y-4 py-4">
            {messages.length === 0 ? (
              <div className="text-xs sm:text-sm text-voxcina-blue/70 dark:text-voxcina-cream/70">
                هنوز پیامی در این تیکت ثبت نشده است.
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id || msg.created_at}
                  className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs sm:text-sm leading-relaxed shadow-sm border ${
                      msg.sender === "user"
                        ? "bg-voxcina-blue text-white border-voxcina-blue/60"
                        : "bg-white/90 dark:bg-voxcina-blue/30 text-voxcina-blue dark:text-voxcina-cream border-voxcina-cream/60 dark:border-voxcina-blue/50"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1 text-[10px] opacity-80">
                      {msg.sender === "user" ? (
                        <>
                          <User className="w-3 h-3" />
                          <span>کاربر</span>
                        </>
                      ) : (
                        <>
                          <HeadphonesIcon className="w-3 h-3" />
                          <span>پشتیبانی</span>
                        </>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(msg.created_at).toLocaleString("fa-IR", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p>{msg.body}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
          <CardContent className="border-t border-voxcina-cream/60 dark:border-voxcina-blue/40 pt-3 pb-4">
            <form onSubmit={handleSendReply} className="flex flex-col sm:flex-row gap-2">
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={2}
                className="flex-1 px-3 py-2 rounded-xl border border-voxcina-blue/20 dark:border-voxcina-blue/40 bg-white/90 dark:bg-voxcina-blue/20 text-xs sm:text-sm text-voxcina-blue dark:text-voxcina-cream focus:outline-none focus:ring-2 focus:ring-voxcina-blue/30 resize-none"
                placeholder="پاسخ خود را برای کاربر بنویسید..."
              />
              <Button
                type="submit"
                variant="primary"
                size="sm"
                className="rounded-xl bg-voxcina-blue hover:bg-voxcina-darkBlue px-4 py-2 whitespace-nowrap"
                disabled={isLoading}
              >
                ارسال پاسخ
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border border-voxcina-cream dark:border-voxcina-blue/30 rounded-2xl bg-white/90 dark:bg-voxcina-blue/10 shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm sm:text-base text-voxcina-blue dark:text-voxcina-cream flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4" />
              مدیریت تیکت
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-xs sm:text-sm text-voxcina-blue/80 dark:text-voxcina-cream/80">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>وضعیت فعلی:</span>
                <span className="font-medium">{localTicket.status}</span>
              </div>
              <div className="flex justify-between">
                <span>اولویت فعلی:</span>
                <span className="font-medium">{localTicket.priority}</span>
              </div>
            </div>

            <form onSubmit={handleUpdateMeta} className="space-y-3 pt-2 border-t border-dashed border-voxcina-cream/60 dark:border-voxcina-blue/40">
              <div>
                <label className="block mb-1 text-xs font-medium">تغییر وضعیت</label>
                <select
                  className="w-full px-3 py-2 rounded-xl border border-voxcina-blue/20 dark:border-voxcina-blue/40 bg-white/80 dark:bg-voxcina-blue/20 text-xs sm:text-sm text-voxcina-blue dark:text-voxcina-cream focus:outline-none"
                  value={editingStatus}
                  onChange={(e) => setEditingStatus(e.target.value as TicketStatus)}
                >
                  <option value="open">باز</option>
                  <option value="pending">در انتظار</option>
                  <option value="answered">پاسخ داده شده</option>
                  <option value="closed">بسته</option>
                </select>
              </div>
              <div>
                <label className="block mb-1 text-xs font-medium">تغییر اولویت</label>
                <select
                  className="w-full px-3 py-2 rounded-xl border border-voxcina-blue/20 dark:border-voxcina-blue/40 bg-white/80 dark:bg-voxcina-blue/20 text-xs sm:text-sm text-voxcina-blue dark:text-voxcina-cream focus:outline-none"
                  value={editingPriority}
                  onChange={(e) => setEditingPriority(e.target.value as TicketPriority)}
                >
                  <option value="low">کم</option>
                  <option value="medium">معمولی</option>
                  <option value="high">بالا</option>
                  <option value="urgent">فوری</option>
                </select>
              </div>
              <Button
                type="submit"
                variant="outline"
                size="sm"
                className="w-full rounded-xl border-voxcina-blue/30 text-voxcina-blue dark:border-voxcina-blue/40 dark:text-voxcina-cream flex items-center justify-center gap-2"
                disabled={isLoading}
              >
                بروزرسانی وضعیت
              </Button>
            </form>

            <div className="pt-2 border-t border-dashed border-voxcina-cream/60 dark:border-voxcina-blue/40 space-y-2">
              <div className="flex justify-between">
                <span>شناسه کاربر:</span>
                <span className="font-mono text-[11px]">
                  {localTicket.user_id}
                </span>
              </div>
              <div className="flex justify-between">
                <span>تاریخ ایجاد:</span>
                <span className="font-medium">
                  {new Date(localTicket.created_at).toLocaleString("fa-IR", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                  })}
                </span>
              </div>
              <div className="flex justify-between">
                <span>آخرین بروزرسانی:</span>
                <span className="font-medium">
                  {new Date(localTicket.updated_at).toLocaleString("fa-IR", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                  })}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
