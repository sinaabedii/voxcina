"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  Send,
  X,
  ArrowLeft,
  SmileIcon,
  ChevronUp,
  Bot,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { LuCircleHelp } from "react-icons/lu";

interface Message {
  id: number;
  text: string;
  sender: "user" | "bot";
  time: string;
  emoji?: string;
}

const emojis = {
  greeting: "👋",
  happy: "😊",
  sad: "😔",
  shipping: "🚚",
  help: "🤔",
  thumbsUp: "👍",
  money: "💰",
  return: "↩️",
  time: "⏱️",
  delivery: "📦",
  alert: "⚠️",
  payment: "💳",
};

const initialMessages: Message[] = [
  {
    id: 1,
    text: `سلام ${emojis.greeting} به پشتیبانی هوشمند Voxcina خوش آمدید. چطور می‌توانم امروز به شما کمک کنم؟`,
    sender: "bot",
    time: new Date().toLocaleTimeString("fa-IR", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    emoji: "greeting",
  },
];

const quickResponses: Array<{ text: string; emoji: string }> = [
  { text: "پیگیری سفارش", emoji: emojis.shipping },
  { text: "ثبت شکایت", emoji: emojis.sad },
  { text: "نحوه بازگشت کالا", emoji: emojis.return },
  { text: "سوالات متداول", emoji: emojis.help },
];

const commonQuestions: Array<{ text: string; emoji: string }> = [
  { text: "زمان ارسال سفارش چقدر است؟", emoji: emojis.time },
  { text: "نحوه پرداخت چگونه است؟", emoji: emojis.payment },
  {
    text: "آیا امکان ارسال به خارج از کشور وجود دارد؟",
    emoji: emojis.delivery,
  },
  { text: "سیاست بازگشت کالا چیست؟", emoji: emojis.return },
];

const botResponses = [
  {
    keywords: ["سفارش", "پیگیری"],
    responses: [
      `${emojis.shipping} برای پیگیری سفارش، لطفاً شماره سفارش خود را وارد کنید. می‌توانم وضعیت سفارش، زمان تحویل و موقعیت فعلی آن را برای شما بررسی کنم.`,
      `${emojis.delivery} پیگیری سفارش شما چند لحظه زمان می‌برد. شماره سفارش را وارد کنید تا بتوانم اطلاعات دقیق را برایتان پیدا کنم.`,
      `${emojis.shipping} برای بررسی وضعیت سفارش شما به شماره سفارش نیاز دارم. این شماره در ایمیل تأییدیه سفارش یا در بخش «سفارش‌های من» موجود است.`,
    ],
  },
  {
    keywords: ["بازگشت", "مرجوع", "پس دادن"],
    responses: [
      `${emojis.return} بازگشت کالا در Voxcina آسان است! تا ۷ روز پس از دریافت فرصت دارید. کافیست به بخش «سفارش‌های من» بروید و گزینه «درخواست مرجوعی» را انتخاب کنید.`,
      `${emojis.thumbsUp} برای مرجوع کردن کالا تا ۷ روز فرصت دارید. کالا باید سالم و با همه متعلقات باشد. پس از تأیید، هزینه به حساب یا کیف پول شما برگردانده می‌شود.`,
      `${emojis.return} مطمئن نیستید کالا را نگه دارید؟ نگران نباشید! تا ۷ روز می‌توانید آن را برگردانید. فقط کافیست از بخش سفارش‌ها، مرجوعی ثبت کنید و ما هماهنگی‌های لازم را انجام می‌دهیم.`,
    ],
  },
  {
    keywords: ["شکایت", "نارضایتی", "مشکل"],
    responses: [
      `${emojis.sad} متأسفم که تجربه خوبی نداشتید. لطفاً جزئیات مشکل و شماره سفارش را برایمان بنویسید. تیم پشتیبانی در اسرع وقت موضوع را بررسی می‌کند.`,
      `${emojis.sad} از اینکه تجربه خوبی نداشتید عذرخواهی می‌کنیم. رضایت شما برای ما مهم است. لطفاً شماره سفارش و شرح مشکل را ارسال کنید تا سریعاً پیگیری کنیم.`,
      `${emojis.alert} بازخورد شما برای ما بسیار ارزشمند است. با ارسال جزئیات مشکل و شماره سفارش، به ما کمک می‌کنید خدمات بهتری ارائه دهیم.`,
    ],
  },
  {
    keywords: ["ارسال", "تحویل", "زمان", "چند روز"],
    responses: [
      `${emojis.time} زمان ارسال سفارش‌ها بین ۲ تا ۵ روز کاری است. برای شهرهای بزرگ معمولاً زودتر و حدود ۲-۳ روز زمان می‌برد. می‌توانید همیشه وضعیت سفارش را در حساب کاربری خود پیگیری کنید.`,
      `${emojis.shipping} ارسال سفارش‌ها در تهران ۱-۲ روز و در سایر شهرها ۲-۵ روز کاری زمان می‌برد. سفارش‌های ثبت شده تا ساعت ۱۲ ظهر، همان روز پردازش می‌شوند.`,
      `${emojis.delivery} ما تلاش می‌کنیم سفارش‌ها را در سریع‌ترین زمان ممکن به دست شما برسانیم. در مناطق شهری معمولاً ۲-۳ روز و در مناطق دورتر ۳-۵ روز کاری زمان می‌برد.`,
    ],
  },
  {
    keywords: ["پرداخت", "قیمت", "هزینه"],
    responses: [
      `${emojis.money} می‌توانید از طریق درگاه بانکی، کیف پول، یا پرداخت در محل (برای برخی مناطق) هزینه سفارش را پرداخت کنید. همه تراکنش‌ها امن و با پروتکل‌های استاندارد انجام می‌شود.`,
      `${emojis.payment} روش‌های پرداخت متنوعی داریم: کارت بانکی آنلاین، پرداخت از کیف پول، و در برخی مناطق امکان پرداخت در محل. برای سفارش‌های بالای ۵۰۰ هزار تومان، گزینه پرداخت اقساطی هم فعال است.`,
      `${emojis.money} پرداخت در Voxcina کاملاً امن و انعطاف‌پذیر است. می‌توانید با کارت بانکی، کیف پول یا در برخی مناطق به صورت حضوری پرداخت کنید.`,
    ],
  },
  {
    keywords: ["تخفیف", "کد تخفیف", "حراج"],
    responses: [
      `${emojis.happy} برای اطلاع از آخرین تخفیف‌ها می‌توانید در خبرنامه ما عضو شوید یا ما را در شبکه‌های اجتماعی دنبال کنید. کدهای تخفیف ویژه‌ای برای مشتریان دائمی ارسال می‌کنیم.`,
      `${emojis.money} کدهای تخفیف معمولاً از طریق ایمیل یا پیامک برای مشتریان ارسال می‌شوند. همچنین می‌توانید برای اطلاع از حراجی‌های فصلی ما را در اینستاگرام و تلگرام دنبال کنید.`,
      `${emojis.thumbsUp} تخفیف‌های ویژه‌ای در مناسبت‌های مختلف سال داریم. برای دریافت کد تخفیف، در سایت ثبت‌نام کنید و عضو خبرنامه ما شوید.`,
    ],
  },
  {
    keywords: ["سایز", "اندازه", "سایزبندی"],
    responses: [
      `${emojis.help} سایزبندی محصولات ما در صفحه هر محصول قابل مشاهده است. راهنمای سایزبندی کامل نیز در بخش «راهنمای خرید» سایت موجود است. اگر بین دو سایز مردد هستید، پیشنهاد می‌کنیم سایز بزرگتر را انتخاب کنید.`,
      `${emojis.help} برای انتخاب سایز مناسب، به جدول سایزبندی در صفحه محصول مراجعه کنید. اگر سایز شما بین دو اندازه است، معمولاً سایز بزرگتر گزینه بهتری است.`,
      `${emojis.alert} نگران انتخاب سایز اشتباه نباشید! اگر سایز مناسب نبود، می‌توانید در مدت ۷ روز آن را تعویض کنید. در صفحه محصولات، راهنمای کاملی برای اندازه‌گیری و انتخاب سایز درست قرار دارد.`,
    ],
  },
  {
    keywords: ["خارج", "خارج از کشور", "ارسال خارجی"],
    responses: [
      `${emojis.shipping} در حال حاضر امکان ارسال به برخی کشورهای همسایه را داریم. هزینه و زمان ارسال بسته به مقصد متفاوت است. برای اطلاعات بیشتر با پشتیبانی تماس بگیرید.`,
      `${emojis.delivery} ارسال بین‌المللی به کشورهای همسایه مانند امارات، عراق، ترکیه و ارمنستان امکان‌پذیر است. زمان تحویل بین ۷ تا ۱۴ روز کاری است و هزینه ارسال بر اساس وزن و مقصد محاسبه می‌شود.`,
      `${emojis.alert} برای سفارش‌های بین‌المللی لطفاً با پشتیبانی تماس بگیرید. نیاز به بررسی شرایط ارسال و محدودیت‌های احتمالی کالا داریم.`,
    ],
  },
  {
    keywords: ["موجود", "ناموجود", "تمام شده"],
    responses: [
      `${emojis.sad} اگر محصولی ناموجود باشد، می‌توانید با فعال کردن گزینه «به من اطلاع بده» در صفحه محصول، از موجود شدن آن مطلع شوید. تلاش می‌کنیم محصولات پرطرفدار را سریع‌تر موجود کنیم.`,
      `${emojis.alert} محصولات ناموجود معمولاً بین ۱ تا ۴ هفته دوباره موجود می‌شوند. با فعال کردن اطلاع‌رسانی موجودی، اولین نفری خواهید بود که از بازگشت محصول به انبار مطلع می‌شوید.`,
      `${emojis.time} محصولات ناموجود را می‌توانید در لیست علاقه‌مندی‌های خود ذخیره کنید و با فعال کردن اطلاع‌رسانی، از موجود شدن آنها باخبر شوید.`,
    ],
  },
  {
    keywords: ["آدرس", "فروشگاه", "حضوری"],
    responses: [
      `${emojis.delivery} فروشگاه‌های حضوری ما در تهران، مشهد، اصفهان و شیراز واقع شده‌اند. آدرس دقیق و ساعات کاری در بخش «درباره ما» سایت قابل مشاهده است.`,
      `${emojis.shipping} برای خرید حضوری می‌توانید به شعب ما در مراکز خرید اصلی چند شهر بزرگ مراجعه کنید. آدرس دقیق و ساعات کاری در بخش «تماس با ما» قابل مشاهده است.`,
      `${emojis.alert} علاوه بر فروشگاه آنلاین، شعب حضوری ما در چندین شهر آماده خدمت به شما هستند. برای اطلاع از نزدیک‌ترین شعبه به محل سکونت خود، به بخش «شعب ما» در سایت مراجعه کنید.`,
    ],
  },
];

const getRandomResponse = (input: string): string => {
  let selectedResponse = `${emojis.happy} ممنون از پیام شما. کارشناسان ما در اسرع وقت پاسخگوی شما خواهند بود.`;

  for (const category of botResponses) {
    if (
      category.keywords.some((keyword) => input.toLowerCase().includes(keyword))
    ) {
      const randomIndex = Math.floor(Math.random() * category.responses.length);
      selectedResponse = category.responses[randomIndex];
      break;
    }
  }

  return selectedResponse;
};



export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [minimized, setMinimized] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const emojiList = [
    "😊",
    "👍",
    "🙏",
    "❤️",
    "😍",
    "🤔",
    "😢",
    "😎",
    "🎉",
    "✨",
  ];

  useEffect(() => {
    if (endOfMessagesRef.current) {
      endOfMessagesRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const simulateResponse = (userMessage: string) => {
    setIsTyping(true);

    const typingTime = Math.random() * 1000 + 1000;

    setTimeout(() => {
      const botResponse = getRandomResponse(userMessage);

      const newBotMessage: Message = {
        id: messages.length + 2,
        text: botResponse,
        sender: "bot",
        time: new Date().toLocaleTimeString("fa-IR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      setMessages((prev) => [...prev, newBotMessage]);
      setIsTyping(false);
      setShowSuggestions(true);
    }, typingTime);
  };

  const handleSendMessage = () => {
    if (inputMessage.trim() === "") return;

    const messageText = selectedEmoji
      ? `${selectedEmoji} ${inputMessage}`
      : inputMessage;

    const newUserMessage: Message = {
      id: messages.length + 1,
      text: messageText,
      sender: "user",
      time: new Date().toLocaleTimeString("fa-IR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages((prev) => [...prev, newUserMessage]);
    setInputMessage("");
    setSelectedEmoji("");
    setShowEmojiPicker(false);
    setShowSuggestions(false);
    simulateResponse(inputMessage);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleQuickResponse = (response: string) => {
    const newUserMessage: Message = {
      id: messages.length + 1,
      text: response,
      sender: "user",
      time: new Date().toLocaleTimeString("fa-IR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages((prev) => [...prev, newUserMessage]);
    setShowSuggestions(false);
    simulateResponse(response);
  };

  const selectEmoji = (emoji: string) => {
    setSelectedEmoji(emoji);
    setShowEmojiPicker(false);
  };

  useEffect(() => {
    if (!isOpen && messages.length > 1) {
      setUnreadCount((prev) => prev + 1);
    }
  }, [messages, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
    }
  }, [isOpen]);

  return (
    <>
      <motion.div
        className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{
          type: "spring",
          stiffness: 260,
          damping: 20,
          delay: 0.5,
        }}
      >
        <Button
          onClick={() => setIsOpen(!isOpen)}
          className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-[#1A3C69] hover:bg-[#15325a] text-white shadow-xl relative overflow-hidden group"
          style={{
            boxShadow: "0 10px 25px -5px rgba(26, 60, 105, 0.3)",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-[#1A3C69] via-[#234978] to-[#2a5694] opacity-80 group-hover:opacity-100 transition-opacity duration-300"></div>
          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.div
                key="close"
                initial={{ rotate: 180, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -180, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="relative z-10"
              >
                <X className="w-5 h-5 md:w-6 md:h-6" />
              </motion.div>
            ) : (
              <motion.div
                key="open"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ duration: 0.3 }}
                className="relative z-10"
              >
                <MessageSquare className="w-5 h-5 md:w-6 md:h-6" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 md:h-5 md:w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white shadow-md">
                    {unreadCount}
                  </span>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </Button>
      </motion.div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed bottom-20 right-4 md:bottom-24 md:right-6 z-50 w-[calc(100%-2rem)] sm:w-96 max-w-[360px] md:max-w-md shadow-2xl rounded-2xl bg-white overflow-hidden border border-[#1A3C69]/10 dark:border-[#1A3C69]/20 dark:bg-gray-900"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{
              opacity: 0,
              y: 20,
              scale: 0.95,
              transition: { duration: 0.2 },
            }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            style={{
              boxShadow: "0 25px 50px -12px rgba(26, 60, 105, 0.25)",
            }}
          >
            <div className="relative flex items-center justify-between p-3 md:p-4 bg-[#1A3C69] text-white overflow-hidden">
              <div className="absolute inset-0 opacity-20">
                <div className="absolute top-0 left-0 w-40 h-40 bg-white/10 rounded-full filter blur-2xl transform -translate-x-20 -translate-y-20"></div>
                <div className="absolute bottom-0 right-0 w-40 h-40 bg-white/10 rounded-full filter blur-2xl transform translate-x-20 translate-y-20"></div>
              </div>

              <div className="flex items-center relative z-10">
                <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-[#f4f1ec] flex items-center justify-center mr-2 md:mr-3 shadow-md">
                  <span className="text-[#1A3C69] font-bold text-xs md:text-sm">
                    VX
                  </span>
                </div>
                <div>
                  <h3 className="font-bold text-xs md:text-sm">
                    پشتیبانی Voxcina
                  </h3>
                  <div className="flex items-center">
                    <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-green-400 ml-1"></span>
                    <span className="text-[10px] md:text-xs text-green-200">
                      آنلاین
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-1 md:gap-2 relative z-10">
                <button
                  onClick={() => setMinimized(!minimized)}
                  className="w-7 h-7 md:w-8 md:h-8 flex items-center justify-center rounded-full hover:bg-[#15325a] transition-colors"
                >
                  {minimized ? (
                    <ArrowLeft className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  ) : (
                    <motion.div
                      initial={{ rotate: 0 }}
                      animate={{ rotate: minimized ? 180 : 0 }}
                    >
                      <ArrowLeft className="w-3.5 h-3.5 md:w-4 md:h-4 rotate-90" />
                    </motion.div>
                  )}
                </button>

                <button
                  onClick={() => setIsOpen(false)}
                  className="w-7 h-7 md:w-8 md:h-8 flex items-center justify-center rounded-full hover:bg-[#15325a] transition-colors"
                >
                  <X className="w-3.5 h-3.5 md:w-4 md:h-4" />
                </button>
              </div>
            </div>

            <AnimatePresence>
              {!minimized && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div
                    className="h-72 md:h-96 overflow-y-auto bg-[#f4f1ec] dark:bg-gray-800/80 p-3 md:p-4 overflow-x-hidden scroll-smooth"
                    style={{ scrollBehavior: "smooth" }}
                  >
                    <div className="flex flex-col space-y-3">
                      {messages.map((message) => (
                        <motion.div
                          key={message.id}
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ duration: 0.3 }}
                          className={`flex ${
                            message.sender === "user"
                              ? "justify-start flex-row-reverse"
                              : "justify-start"
                          }`}
                        >
                          <div
                            className={`max-w-[80%] rounded-xl p-2.5 md:p-3 ${
                              message.sender === "user"
                                ? "bg-[#1A3C69] text-white rounded-tr-none shadow-md"
                                : "bg-white dark:bg-gray-700 dark:text-gray-100 rounded-tl-none shadow-md"
                            }`}
                            style={{
                              boxShadow:
                                message.sender === "user"
                                  ? "0 4px 15px -3px rgba(26, 60, 105, 0.3)"
                                  : "0 4px 15px -3px rgba(0, 0, 0, 0.1)",
                            }}
                          >
                            <div
                              className="text-xs md:text-sm"
                              dangerouslySetInnerHTML={{
                                __html: message.text.replace(/\n/g, "<br>"),
                              }}
                            ></div>
                            <div
                              className={`text-[10px] md:text-xs mt-1 ${
                                message.sender === "user"
                                  ? "text-right text-blue-200"
                                  : "text-left text-gray-400 dark:text-gray-400"
                              }`}
                            >
                              {message.time}
                            </div>
                          </div>
                        </motion.div>
                      ))}

                      {isTyping && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex justify-start"
                        >
                          <div
                            className="bg-white dark:bg-gray-700 rounded-xl p-2.5 md:p-3 rounded-tl-none shadow-md"
                            style={{
                              boxShadow: "0 4px 15px -3px rgba(0, 0, 0, 0.1)",
                            }}
                          >
                            <div className="flex space-x-1 rtl:space-x-reverse">
                              <div
                                className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-[#1A3C69]/40 dark:bg-[#1A3C69]/60 animate-bounce"
                                style={{ animationDelay: "0ms" }}
                              ></div>
                              <div
                                className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-[#1A3C69]/60 dark:bg-[#1A3C69]/80 animate-bounce"
                                style={{ animationDelay: "150ms" }}
                              ></div>
                              <div
                                className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-[#1A3C69]/80 dark:bg-[#1A3C69] animate-bounce"
                                style={{ animationDelay: "300ms" }}
                              ></div>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {messages.length === 1 && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 }}
                          className="mt-4"
                        >
                          <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mb-2 mr-1">
                            سوال خود را انتخاب کنید:
                          </p>
                          <div className="flex flex-wrap gap-1.5 md:gap-2">
                            {quickResponses.map(({ text, emoji }, index) => (
                              <motion.button
                                key={index}
                                onClick={() => handleQuickResponse(text)}
                                className="bg-white dark:bg-gray-700 text-[#1A3C69] dark:text-[#f4f1ec] text-xs md:text-sm px-2.5 py-1.5 md:px-3 md:py-2 rounded-full hover:bg-[#1A3C69]/5 dark:hover:bg-[#1A3C69]/20 transition-colors border border-[#1A3C69]/10 dark:border-[#1A3C69]/30 shadow-sm hover:shadow-md"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.3 + index * 0.1 }}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                              >
                                {emoji} {text}
                              </motion.button>
                            ))}
                          </div>
                        </motion.div>
                      )}

                      {showSuggestions && messages.length > 2 && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 }}
                          className="mt-4 bg-[#1A3C69]/5 dark:bg-[#1A3C69]/10 p-2.5 md:p-3 rounded-lg border border-[#1A3C69]/10 dark:border-[#1A3C69]/20"
                        >
                          <div className="flex items-center mb-1.5 md:mb-2">
                            <LuCircleHelp className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#1A3C69] ml-1 md:ml-2" />
                            <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300">
                              ممکن است این سوالات نیز برای شما مفید باشد:
                            </p>
                          </div>
                          <div className="flex flex-col gap-1 md:gap-1.5">
                            {commonQuestions.map(({ text, emoji }, index) => (
                              <motion.button
                                key={index}
                                onClick={() => handleQuickResponse(text)}
                                className="text-right text-xs md:text-sm text-[#1A3C69] dark:text-[#f4f1ec] py-1 px-1.5 md:py-1 md:px-2 hover:bg-[#1A3C69]/10 dark:hover:bg-[#1A3C69]/30 rounded transition-colors flex items-center"
                                initial={{ opacity: 0, x: -5 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.4 + index * 0.1 }}
                                whileHover={{ x: 3 }}
                              >
                                <ArrowLeft className="w-2.5 h-2.5 md:w-3 md:h-3 ml-1 opacity-70" />
                                {emoji} {text}
                              </motion.button>
                            ))}
                          </div>
                        </motion.div>
                      )}

                      <div ref={endOfMessagesRef} />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="p-2.5 md:p-3 border-t border-[#1A3C69]/10 dark:border-[#1A3C69]/20 bg-white dark:bg-gray-900">
              <AnimatePresence>
                {!minimized && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="relative mb-1">
                      {selectedEmoji && (
                        <div className="absolute top-2 right-4 text-lg">
                          {selectedEmoji}
                        </div>
                      )}
                      <textarea
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder="پیام خود را بنویسید..."
                        className={`w-full pl-8 ${
                          selectedEmoji ? "pr-10" : "pr-12"
                        } py-2.5 rounded-xl border border-[#1A3C69]/10 focus:border-[#1A3C69]/30 dark:border-[#1A3C69]/20 bg-[#f4f1ec]/50 dark:bg-gray-800 focus:outline-none resize-none transition-all focus:shadow-md dark:focus:shadow-none text-xs md:text-sm`}
                        rows={1}
                        style={{ minHeight: "40px", maxHeight: "120px" }}
                      ></textarea>

                      <div className="absolute left-2 bottom-3 flex space-x-1 rtl:space-x-reverse">
                        <button
                          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                          className="w-7 h-7 md:w-8 md:h-8 flex items-center justify-center rounded-full text-[#1A3C69]/70 hover:text-[#1A3C69] hover:bg-[#1A3C69]/10 transition-colors"
                        >
                          <SmileIcon className="w-4 h-4 md:w-5 md:h-5" />
                        </button>
                      </div>

                      <button
                        onClick={handleSendMessage}
                        disabled={inputMessage.trim() === ""}
                        className={`absolute right-2 bottom-3 w-7 h-7 md:w-8 md:h-8 flex items-center justify-center rounded-full transition-all ${
                          inputMessage.trim() === ""
                            ? "bg-[#1A3C69]/30 text-white cursor-not-allowed"
                            : "bg-[#1A3C69] text-white hover:bg-[#15325a] shadow-md"
                        }`}
                      >
                        <Send className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      </button>

                      {showEmojiPicker && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute bottom-full left-2 mb-2 bg-white dark:bg-gray-800 p-2 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10"
                        >
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {emojiList.map((emoji) => (
                              <button
                                key={emoji}
                                onClick={() => selectEmoji(emoji)}
                                className="w-7 h-7 text-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-center justify-between text-[10px] md:text-xs text-[#1A3C69]/60 dark:text-[#f4f1ec]/60 pt-1">
                <div className="flex items-center">
                  <Bot className="w-2.5 h-2.5 md:w-3 md:h-3 ml-1" />
                  <span>قدرت گرفته از هوش مصنوعی Voxcina</span>
                </div>
                {minimized && (
                  <button
                    onClick={() => setMinimized(false)}
                    className="flex items-center text-[#1A3C69]/80 dark:text-[#f4f1ec]/80 hover:text-[#1A3C69] dark:hover:text-[#f4f1ec] transition-colors"
                  >
                    <ChevronUp className="w-3 h-3 md:w-4 md:h-4 ml-1" />
                    <span>باز کردن گفتگو</span>
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
