"use client";

import { useEffect, useRef, useState } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Sparkles, ShoppingBag, History, User, Send, RotateCcw, ChevronLeft, Bot } from "lucide-react";
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
    <motion.div 
      whileHover={{ scale: 1.02, y: -2 }}
      transition={{ duration: 0.2 }}
      className="rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-voxcina-blue/10 dark:border-white/10 p-3 sm:p-4 flex flex-col gap-2 shadow-lg shadow-voxcina-blue/5 dark:shadow-black/20 hover:border-voxcina-blue/20 dark:hover:border-cyan-500/30 hover:bg-white/80 dark:hover:bg-slate-900/80 cursor-default backdrop-blur-sm"
    >
      <div className="inline-flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-voxcina-blue/20 to-cyan-500/20 text-voxcina-blue dark:text-cyan-300 border border-voxcina-blue/20 dark:border-cyan-500/20">
        {icon}
      </div>
      <div className="space-y-1">
        <div className="text-sm font-semibold text-voxcina-blue dark:text-slate-50">{title}</div>
        <p className="text-[11px] sm:text-xs text-voxcina-blue/60 dark:text-slate-300 leading-relaxed">{text}</p>
      </div>
    </motion.div>
  );
}

// Quick suggestion chips
const quickSuggestions = [
  "یه مانتو شیک برای مهمونی می‌خوام",
  "ست لباس راحتی خونه",
  "کفش اسپرت زنانه زیر 500",
  "لباس رسمی برای محل کار",
];

// Product Card Component - cleaner design like the reference
function ProductCardChat({ product }: { product: Product }) {
  const imageSrc = product.mainImages?.[0] || product.colorVariants?.[0]?.images?.[0];
  
  return (
    <motion.a
      href={`/products/${product.id}`}
      target="_blank"
      rel="noreferrer"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className="group block rounded-2xl bg-white/80 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-800/80 border border-voxcina-blue/5 dark:border-white/5 hover:border-voxcina-blue/20 dark:hover:border-cyan-500/20 overflow-hidden transition-all duration-300 shadow-sm hover:shadow-md"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-voxcina-cream/50 dark:bg-slate-900/50">
        {imageSrc ? (
          <Image
            src={imageSrc}
            alt={product.name}
            fill
            sizes="200px"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingBag className="w-8 h-8 text-voxcina-blue/20 dark:text-slate-700" />
          </div>
        )}
      </div>
      <div className="p-3 space-y-1.5">
        <h4 className="text-[11px] sm:text-xs font-medium text-voxcina-blue dark:text-slate-200 line-clamp-2 leading-relaxed">
          {product.name}
        </h4>
        {product.brand && (
          <p className="text-[10px] text-voxcina-blue/50 dark:text-slate-500">{product.brand}</p>
        )}
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs font-bold text-voxcina-blue dark:text-cyan-400">
            {product.price.toLocaleString("fa-IR")} <span className="text-[10px] font-normal text-voxcina-blue/50 dark:text-slate-500">تومان</span>
          </span>
          <span className="text-[10px] text-voxcina-blue/50 dark:text-slate-500 group-hover:text-voxcina-blue dark:group-hover:text-cyan-400 transition-colors flex items-center gap-0.5">
            مشاهده
            <ChevronLeft className="w-3 h-3" />
          </span>
        </div>
      </div>
    </motion.a>
  );
}

const getInitialMessages = (): AssistantMessage[] => [
  {
    id: "welcome",
    role: "assistant",
    text: "سلام! 👋\nمن دستیار هوشمند ووکسا هستم.\n\nبهم بگو دنبال چه استایلی هستی، چه مناسبتی داری یا چه بودجه‌ای مد نظرته — بهترین پیشنهادها رو برات پیدا می‌کنم.",
    time: new Date().toLocaleTimeString("fa-IR", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    isAIGenerated: false,
  },
];

export default function AssistantPage() {
  const [messages, setMessages] = useState<AssistantMessage[]>(getInitialMessages);
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

  const handleClearChat = () => {
    setMessages(getInitialMessages());
    setError(null);
    // Generate new chat ID
    const newId = `assistant_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    localStorage.setItem("assistantChatId", newId);
    setChatId(newId);
  };

  const handleQuickSuggestion = (suggestion: string) => {
    setInput(suggestion);
  };

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
      
      {/* Background wrapper */}
      <div className="relative min-h-screen">
        {/* Soft gradient background that matches site theme */}
        <div className="fixed inset-0 bg-gradient-to-br from-voxcina-cream via-white to-voxcina-cream/50 dark:from-voxcina-blue/95 dark:via-slate-900 dark:to-voxcina-blue/90" />
        
        {/* Decorative blobs */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-voxcina-blue/10 dark:bg-cyan-500/10 rounded-full blur-3xl" />
          <div className="absolute top-1/3 -left-20 w-72 h-72 bg-purple-300/10 dark:bg-purple-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-cyan-300/10 dark:bg-voxcina-blue/10 rounded-full blur-3xl" />
        </div>
        
        {/* Content */}
        <div className="relative z-10">
          {/* Main Chat Section - Full Width Centered */}
          <section className="max-w-3xl mx-auto px-4 pt-24 pb-16">
          
          {/* Big Gradient Title */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-8"
          >
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black">
              <span className="bg-gradient-to-r from-voxcina-blue via-cyan-500 to-purple-500 bg-clip-text text-transparent">
                سلام، من دستیار هوشمند ووکسام!
              </span>
            </h1>
            <p className="text-sm text-voxcina-blue/60 dark:text-slate-400 mt-2">
              بهم بگو دنبال چی می‌گردی؟ از من بپرس!
            </p>
          </motion.div>

          {/* Chat Container */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="relative rounded-3xl bg-white/70 dark:bg-slate-900/70 border border-voxcina-blue/10 dark:border-white/10 shadow-2xl shadow-voxcina-blue/5 dark:shadow-black/20 overflow-hidden backdrop-blur-xl"
          >

            {/* Messages Area */}
            <div className="relative z-10 max-h-[500px] min-h-[350px] overflow-y-auto px-5 sm:px-6 py-6 space-y-5 scrollbar-thin scrollbar-thumb-voxcina-blue/20 dark:scrollbar-thumb-slate-700/50 scrollbar-track-transparent">
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`flex gap-3 ${
                    msg.role === "user" ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  {/* Avatar */}
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-md ${
                    msg.role === "user" 
                      ? "bg-gradient-to-br from-voxcina-blue to-purple-500" 
                      : "bg-gradient-to-br from-cyan-500 to-voxcina-blue"
                  }`}>
                    {msg.role === "user" ? (
                      <User className="w-4 h-4 text-white" />
                    ) : (
                      <Bot className="w-4 h-4 text-white" />
                    )}
                  </div>
                  
                  <div className={`flex flex-col gap-3 max-w-[85%] ${
                    msg.role === "user" ? "items-end" : "items-start"
                  }`}>
                    {/* Message Bubble */}
                    <div
                      className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                        msg.role === "user"
                          ? "bg-gradient-to-br from-voxcina-blue to-voxcina-blue/90 text-white rounded-tr-sm"
                          : "bg-voxcina-cream/80 dark:bg-slate-800/80 text-voxcina-blue dark:text-slate-100 border border-voxcina-blue/5 dark:border-white/5 rounded-tl-sm"
                      }`}
                    >
                      <div className="whitespace-pre-line">
                        {msg.text}
                      </div>
                      {msg.role === "assistant" && msg.isAIGenerated && (
                        <div className="mt-2 flex items-center gap-1 text-[10px] text-voxcina-blue/50 dark:text-cyan-400/70">
                          <Sparkles className="w-3 h-3" />
                          <span>پاسخ هوش مصنوعی</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Products Grid - Cleaner Design */}
                    {msg.role === "assistant" && msg.products && msg.products.length > 0 && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="w-full"
                      >
                        <div className="grid grid-cols-2 gap-3">
                          {msg.products.slice(0, 4).map((product) => (
                            <ProductCardChat key={product.id} product={product} />
                          ))}
                        </div>
                        {msg.products.length > 4 && (
                          <a 
                            href="#recommendations"
                            className="mt-3 inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                          >
                            <span>مشاهده همه {msg.products.length} محصول</span>
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              ))}

              {/* Typing indicator */}
              {isTyping && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-3"
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br from-cyan-500 to-voxcina-blue shadow-md">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="inline-flex items-center gap-1.5 rounded-2xl rounded-tl-sm bg-voxcina-cream/80 dark:bg-slate-800/80 border border-voxcina-blue/5 dark:border-white/5 px-4 py-3">
                    <span className="w-2 h-2 rounded-full bg-voxcina-blue dark:bg-cyan-400 animate-bounce" />
                    <span className="w-2 h-2 rounded-full bg-voxcina-blue dark:bg-cyan-400 animate-bounce [animation-delay:150ms]" />
                    <span className="w-2 h-2 rounded-full bg-voxcina-blue dark:bg-cyan-400 animate-bounce [animation-delay:300ms]" />
                  </div>
                </motion.div>
              )}

              {/* Quick suggestions - show only at start */}
              {messages.length === 1 && !isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="pt-4"
                >
                  <div className="flex flex-wrap gap-2 justify-center">
                    {quickSuggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleQuickSuggestion(suggestion)}
                        className="px-4 py-2 rounded-full text-xs bg-white/50 dark:bg-slate-800/40 border border-voxcina-blue/10 dark:border-slate-700/50 text-voxcina-blue/70 dark:text-slate-300 hover:bg-voxcina-blue/10 dark:hover:bg-cyan-500/10 hover:border-voxcina-blue/30 dark:hover:border-cyan-500/30 hover:text-voxcina-blue dark:hover:text-cyan-300 transition-all duration-200"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </motion.div>
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
                  className="mx-5 sm:mx-6 mb-3 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-2.5 text-xs text-red-600 dark:text-red-200"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input Area - Clean Design */}
            <div className="relative z-10 border-t border-voxcina-blue/5 dark:border-white/5 bg-white/50 dark:bg-slate-900/50 px-4 sm:px-5 py-4">
              <div className="flex items-center gap-3">
                {/* Clear chat button */}
                {messages.length > 1 && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={handleClearChat}
                    className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-voxcina-cream dark:bg-slate-800/50 text-voxcina-blue/50 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-500/10 transition-all"
                    title="شروع مکالمه جدید"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </motion.button>
                )}
                
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="چه سوالی داری؟"
                    className="w-full rounded-full bg-voxcina-cream/50 dark:bg-slate-800/50 border border-voxcina-blue/10 dark:border-slate-700/50 px-5 py-3 text-sm text-voxcina-blue dark:text-slate-100 placeholder:text-voxcina-blue/40 dark:placeholder:text-slate-500 focus:outline-none focus:border-voxcina-blue/30 dark:focus:border-cyan-500/50 focus:bg-white dark:focus:bg-slate-800/70 transition-all"
                  />
                </div>
                
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isSending}
                  className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-r from-voxcina-blue to-cyan-500 text-white shadow-lg shadow-voxcina-blue/20 hover:shadow-voxcina-blue/40 hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:scale-100 transition-all duration-200"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>

          {/* Features - Below Chat */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="grid grid-cols-3 gap-4 mt-8"
          >
            <FeatureCard
              icon={<MessageCircle className="w-4 h-4" />}
              title="گفتگوی طبیعی"
              text="به فارسی بنویس، من می‌فهمم."
            />
            <FeatureCard
              icon={<ShoppingBag className="w-4 h-4" />}
              title="پیشنهاد هوشمند"
              text="بر اساس سلیقه‌ات."
            />
            <FeatureCard
              icon={<History className="w-4 h-4" />}
              title="یادآوری"
              text="تاریخچه‌ات رو یادم می‌مونه."
            />
          </motion.div>
        </section>
        </div>
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
