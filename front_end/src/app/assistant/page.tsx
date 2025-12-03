"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import AnimatedBackground from "@/components/ui/AnimatedBackground";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Sparkles, ShoppingBag, History, User, Send } from "lucide-react";
import Image from "next/image";
import { Product } from "@/types/product";

interface AssistantMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  time: string;
  isAIGenerated?: boolean;
  products?: Product[];
}

interface UserInfo {
  id: string;
  name: string;
}

type FeatureCardProps = {
  icon: JSX.Element;
  title: string;
  text: string;
};

function FeatureCard({ icon, title, text }: FeatureCardProps) {
  return (
    <div className="rounded-2xl bg-slate-900/60 border border-white/10 p-3 sm:p-4 flex flex-col gap-2 shadow-[0_10px_30px_rgba(15,23,42,0.7)]">
      <div className="inline-flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-800/80 text-cyan-300 border border-white/10">
        {icon}
      </div>
      <div className="space-y-1">
        <div className="text-sm font-semibold text-slate-50">{title}</div>
        <p className="text-[11px] sm:text-xs text-slate-300 leading-relaxed">{text}</p>
      </div>
    </div>
  );
}

const initialMessages: AssistantMessage[] = [
  {
    id: "welcome",
    role: "assistant",
    text:
      "سلام 👋 من دستیار هوشمند خرید وکسینا هستم. بر اساس سلیقه، بودجه و استایل شما، بهترین محصولات رو پیشنهاد می‌دم.",
    time: new Date().toLocaleTimeString("fa-IR", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    isAIGenerated: false,
  },
];

export default function AssistantPage() {
  const [messages, setMessages] = useState<AssistantMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const endOfMessagesRef = useRef<HTMLDivElement | null>(null);

  // Initialize chat id from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("assistantChatId");
    if (stored) {
      setChatId(stored);
    } else {
      const id = `assistant_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 9)}`;
      localStorage.setItem("assistantChatId", id);
      setChatId(id);
    }
  }, []);

  // Load authenticated user (if any)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkUser = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setUser(null);
          return;
        }

        const res = await fetch("/api/users/profile", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.ok) {
          const data = await res.json();
          setUser({ id: data.user_id || data.id, name: data.name || data.username });
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      }
    };

    checkUser();
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    if (endOfMessagesRef.current) {
      endOfMessagesRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping]);

  const lastRecommendation = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.role === "assistant" && msg.products && msg.products.length > 0) {
        return msg;
      }
    }
    return null;
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !chatId) return;

    const text = input.trim();
    setInput("");
    setError(null);

    const time = new Date().toLocaleTimeString("fa-IR", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const userMessage: AssistantMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text,
      time,
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsSending(true);
    setIsTyping(true);

    // Save user message to chat history
    void saveMessageToDB(userMessage, chatId, user);

    try {
      const body: any = {
        message: text,
        chat_id: chatId,
      };
      if (user?.id) body.user_id = user.id;

      const res = await fetch("/api/chat/recommend", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        throw new Error(`status ${res.status}`);
      }

      const data = await res.json();

      const botMessage: AssistantMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        text:
          data.response ||
          "بر اساس جستجوی شما، این محصولات رو پیشنهاد می‌کنم:",
        time: new Date().toLocaleTimeString("fa-IR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        isAIGenerated: Boolean(data.is_ai_generated),
        products: Array.isArray(data.products) ? data.products : [],
      };

      setMessages((prev) => [...prev, botMessage]);

      // Save assistant message as well
      void saveMessageToDB(botMessage, chatId, user);
    } catch (e) {
      console.error("Assistant error", e);
      setError("متأسفیم، دستیار هوشمند موقتاً در دسترس نیست. لطفاً بعداً دوباره تلاش کنید.");

      const fallback: AssistantMessage = {
        id: `assistant-fallback-${Date.now()}`,
        role: "assistant",
        text:
          "در حال حاضر به مشکل فنی برخوردیم، اما می‌توانید از پشتیبانی آنلاین یا جستجوی محصولات استفاده کنید.",
        time: new Date().toLocaleTimeString("fa-IR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        isAIGenerated: false,
      };
      setMessages((prev) => [...prev, fallback]);
    } finally {
      setIsSending(false);
      setIsTyping(false);
    }
  };

  return (
    <>
      <Header />
      <AnimatedBackground />
      <div className="relative z-10 min-h-screen bg-gradient-to-br from-[#0b1020] via-[#0f172a] to-[#1e293b] text-white pb-16">
        <section className="max-w-6xl mx-auto px-4 pt-24 pb-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col lg:flex-row gap-10 lg:gap-14 items-start"
          >
            {/* Left: Hero & context */}
            <div className="flex-1 space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs sm:text-sm backdrop-blur-md">
                <Sparkles className="w-4 h-4 text-yellow-300" />
                <span>دستیار هوشمند خرید Voxcina</span>
              </div>

              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black leading-tight">
                استایل بعدی‌ات رو
                <span className="block mt-1 bg-gradient-to-r from-voxcina-blue to-cyan-400 bg-clip-text text-transparent">
                  با هوش مصنوعی پیدا کن
                </span>
              </h1>

              <p className="text-sm sm:text-base md:text-lg text-slate-200/80 max-w-xl leading-relaxed">
                من کل فروشگاه، سبد خرید، علاقه‌مندی‌ها و سابقه جستجو و فعالیت‌هات رو بررسی می‌کنم
                تا دقیق‌ترین پیشنهادها رو برای استایل، بودجه و موقعیت مورد نظرت بدم.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs sm:text-sm">
                <FeatureCard
                  icon={<MessageCircle className="w-4 h-4" />}
                  title="گفتگوی طبیعی"
                  text="به فارسی بنویس، مثل دوستت باهات حرف می‌زنم و پیشنهاد می‌دم."
                />
                <FeatureCard
                  icon={<ShoppingBag className="w-4 h-4" />}
                  title="پیشنهاد شخصی‌سازی‌شده"
                  text="براساس سلیقه، خریدها و بازدیدهای قبلی‌ات، پیشنهاد می‌سازم."
                />
                <FeatureCard
                  icon={<History className="w-4 h-4" />}
                  title="یادآوری هوشمند"
                  text="محصولاتی که قبلاً دیدی یا ذخیره کردی رو فراموش نمی‌کنم."
                />
              </div>

              <div className="hidden lg:flex items-center gap-4 pt-2 text-xs text-slate-300/80">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300 text-xs">
                    <User className="w-3 h-3" />
                  </span>
                  <span>
                    {user ? (
                      <>
                        {user.name}، آماده‌ام بر اساس سلیقه‌ات پیشنهاد بدم.
                      </>
                    ) : (
                      <>برای تجربه شخصی‌تر، وارد حساب کاربری‌ات شو.</>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Chat surface */}
            <div className="flex-1 w-full max-w-xl mx-auto lg:mx-0">
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="relative rounded-3xl bg-slate-900/70 border border-white/10 shadow-[0_18px_60px_rgba(15,23,42,0.8)] overflow-hidden backdrop-blur-xl"
              >
                <div className="absolute inset-0 opacity-40 pointer-events-none">
                  <div className="absolute -top-16 right-0 w-52 h-52 bg-cyan-500/25 blur-3xl" />
                  <div className="absolute -bottom-16 left-0 w-64 h-64 bg-voxcina-blue/25 blur-3xl" />
                </div>

                {/* Chat header */}
                <div className="relative z-10 flex items-center justify-between px-4 sm:px-5 py-3 border-b border-white/10 bg-gradient-to-r from-slate-900/80 via-slate-900/40 to-transparent">
                  <div className="flex items-center gap-3">
                    <div className="relative w-9 h-9 rounded-2xl overflow-hidden border border-white/15 bg-white/5 flex items-center justify-center">
                      <Image
                        src="/images/Logo/WXTransparent-org.png"
                        alt="Voxcina AI"
                        width={32}
                        height={32}
                        className="object-contain"
                      />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold sm:text-sm">دستیار هوشمند Voxcina</span>
                      <span className="text-[10px] text-emerald-300 flex items-center gap-1">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        آنلاین و آماده پیشنهاد دادن
                      </span>
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center gap-2 text-[10px] text-slate-200/70">
                    <span className="px-2 py-1 rounded-full bg-white/5 border border-white/10 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-yellow-300" />
                      <span>نسخه آزمایشی</span>
                    </span>
                  </div>
                </div>

                {/* Messages */}
                <div className="relative z-10 max-h-[420px] min-h-[280px] overflow-y-auto px-4 sm:px-5 py-4 space-y-3 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${
                        msg.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm shadow-sm border backdrop-blur-md ${
                          msg.role === "user"
                            ? "bg-voxcina-blue text-white border-voxcina-blue/60"
                            : "bg-slate-900/80 text-slate-50 border-white/10"
                        }`}
                      >
                        <div className="whitespace-pre-line leading-relaxed">
                          {msg.text}
                        </div>
                        <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-200/60">
                          <span>{msg.time}</span>
                          {msg.role === "assistant" && msg.isAIGenerated && (
                            <span className="inline-flex items-center gap-1 text-cyan-300">
                              <Sparkles className="w-3 h-3" />
                              <span>پاسخ هوش مصنوعی</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}

                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-900/80 border border-white/10 px-3 py-1.5 text-[10px] text-slate-200/80">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" />
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:120ms]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:240ms]" />
                      </div>
                    </div>
                  )}

                  <div ref={endOfMessagesRef} />
                </div>

                {/* Error */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="mx-4 sm:mx-5 mb-2 rounded-xl bg-red-500/10 border border-red-500/40 px-3 py-2 text-[11px] text-red-100"
                    >
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Input */}
                <div className="relative z-10 border-t border-white/10 bg-slate-950/70 px-3 sm:px-4 py-3">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-end gap-2">
                      <div className="flex-1 relative">
                        <textarea
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              handleSend();
                            }
                          }}
                          placeholder="مثلاً: یه مانتوی تابستونی برای مهمونی عصرونه می‌خوام..."
                          rows={1}
                          className="w-full resize-none rounded-2xl bg-slate-900/70 border border-white/10 px-3.5 py-2.5 pr-3 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-400/60 focus:border-cyan-400/60 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent"
                        />
                      </div>
                      <button
                        onClick={handleSend}
                        disabled={!input.trim() || isSending}
                        className="inline-flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-voxcina-blue text-slate-950 shadow-lg shadow-cyan-500/30 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>برای ارسال، Enter را بزنید. برای خط جدید Shift+Enter.</span>
                      <span>هرچه دقیق‌تر توضیح بدی، پیشنهادها بهتر می‌شن.</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </section>

        {/* Recommendation panel */}
        <section className="max-w-6xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-4 rounded-3xl border border-white/10 bg-slate-900/50 backdrop-blur-2xl p-4 sm:p-5 md:p-6 shadow-[0_18px_60px_rgba(15,23,42,0.8)]"
          >
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-cyan-300" />
                <span className="text-sm sm:text-base font-semibold">
                  پیشنهادهای منتخب برای شما
                </span>
              </div>
              <span className="text-[10px] text-slate-400 hidden sm:inline">
                بر اساس آخرین مکالمه با دستیار هوشمند
              </span>
            </div>

            {lastRecommendation && lastRecommendation.products &&
            lastRecommendation.products.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                {lastRecommendation.products.slice(0, 4).map((product) => (
                  <a
                    key={product.id}
                    href={`/products/${product.id}`}
                    className="group rounded-2xl bg-slate-900/80 border border-white/10 overflow-hidden hover:border-cyan-400/60 transition-all duration-200 flex flex-col"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <div className="relative h-28 sm:h-32 overflow-hidden">
                      {(() => {
                        const imageSrc = product.mainImages?.[0] || product.colorVariants?.[0]?.images?.[0];
                        return imageSrc ? (
                          <Image
                            src={imageSrc}
                            alt={product.name}
                            fill
                            sizes="(max-width: 768px) 50vw, 25vw"
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-slate-800 text-[10px] text-slate-400">
                            بدون تصویر
                          </div>
                        );
                      })()}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />
                    </div>
                    <div className="p-2.5 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="text-[11px] sm:text-xs font-medium line-clamp-2 mb-1 text-slate-50">
                          {product.name}
                        </div>
                        {product.brand && (
                          <div className="text-[10px] text-slate-400 mb-1 line-clamp-1">
                            {product.brand}
                          </div>
                        )}
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[11px] sm:text-xs">
                        <span className="font-semibold text-cyan-300">
                          {product.price.toLocaleString("fa-IR")} تومان
                        </span>
                        <span className="opacity-0 group-hover:opacity-100 text-[9px] text-cyan-200 transition-opacity">
                          مشاهده محصول
                        </span>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <div className="text-[11px] sm:text-sm text-slate-300/80 py-4 text-right">
                هنوز محصولی پیشنهاد نشده است. یک سوال از دستیار بپرس تا بر اساس نیازت
                محصولات مناسب را پیشنهاد دهد.
              </div>
            )}
          </motion.div>
        </section>
      </div>
      <Footer />
    </>
  );
}

async function saveMessageToDB(
  message: AssistantMessage,
  chatId: string | null,
  user: UserInfo | null,
) {
  if (!chatId) return;

  try {
    await fetch("/api/chat/save", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        user_id: user?.id || null,
        session_id: chatId,
        message: {
          id: message.id,
          text: message.text,
          sender: message.role === "user" ? "user" : "bot",
          timestamp: new Date().toISOString(),
          is_ai_generated: message.isAIGenerated || false,
          product_ids:
            message.products && message.products.length
              ? message.products.map((p) => p.id)
              : [],
        },
      }),
    });
  } catch {
    // Silent fail – do not block UI
  }
}
