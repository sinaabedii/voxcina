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
  products?: Array<{
    id: string;
    name: string;
    price: number;
    images?: string[];
    brand?: string;
  }>;
  isAIGenerated?: boolean;
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
  const [chatId, setChatId] = useState(() => {
    // Get from localStorage or create new
    const stored = localStorage.getItem('currentChatId');
    if (stored) return stored;
    
    const newId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('currentChatId', newId);
    return newId;
  });
  const [useAI, setUseAI] = useState(true); // Toggle AI on/off
  const [savingEnabled, setSavingEnabled] = useState(true); // Toggle message saving
  const [chatHistory, setChatHistory] = useState<Array<{id: string; chat_id?: string; title: string; last_message: string}>>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [user, setUser] = useState<{id: string, name: string} | null>(null); // Get from auth context

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

  // Load chat history on mount
  useEffect(() => {
    loadCurrentChat();
    checkUserAuth();
  }, []);

  // Sync chats when user logs in/out
  useEffect(() => {
    if (user) {
      syncAnonymousChatsToUser();
      loadUserChatHistory();
    } else {
      // User logged out - clear localStorage history
      clearLocalChatHistory();
    }
  }, [user]);

  // Check if user is authenticated
  const checkUserAuth = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setUser(null);
        return;
      }

      // Verify token and get user info
      const response = await fetch('/api/users/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUser({ id: data.user_id || data.id, name: data.name || data.username });
      } else {
        setUser(null);
        localStorage.removeItem('token');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
    }
  };

  // Load current chat from database
  const loadCurrentChat = async () => {
    try {
      // Only query backend if we know this chat was previously saved
      if (!localStorage.getItem(`chat_has_backend_${chatId}`)) {
        return;
      }

      const response = await fetch(`/api/chat/history/${chatId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.messages && data.messages.length > 0) {
          // Convert backend messages to frontend format
          const loadedMessages = data.messages.map((msg: any, index: number) => ({
            id: index + 1,
            text: msg.text,
            sender: msg.sender,
            time: new Date(msg.timestamp).toLocaleTimeString('fa-IR', {
              hour: '2-digit',
              minute: '2-digit'
            }),
            products: msg.product_ids || [],
            isAIGenerated: msg.is_ai_generated || false
          }));
          setMessages(loadedMessages);
        }
      }
    } catch (error) {
      console.log('No previous chat found, starting fresh');
    }
  };

  // Sync anonymous chats to user account on login
  const syncAnonymousChatsToUser = async () => {
    if (!user) return;

    try {
      // Find all chats that we know were saved to backend
      const backendChatIds: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('chat_has_backend_')) {
          const id = key.replace('chat_has_backend_', '');
          if (id) backendChatIds.push(id);
        }
      }

      // Link each anonymous chat to user
      for (const chatId of backendChatIds) {
        await fetch('/api/chat/link-to-user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            chat_id: chatId,
            user_id: user.id
          })
        });
      }

      console.log('Anonymous chats synced to user account');
    } catch (error) {
      console.error('Failed to sync chats:', error);
    }
  };

  // Load user's chat history
  const loadUserChatHistory = async () => {
    if (!user) return;

    setIsLoadingHistory(true);
    try {
      const response = await fetch(`/api/chat/sessions?user_id=${user.id}&limit=50`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setChatHistory(data.sessions || []);
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Clear local chat history on logout
  const clearLocalChatHistory = () => {
    // Remove all chat-related items from localStorage
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('chat_') || key === 'currentChatId') {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    // Start fresh chat
    startNewChat();
  };

  // Start a new chat
  const startNewChat = () => {
    const newId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('currentChatId', newId);
    setChatId(newId);
    setMessages([
      {
        id: 1,
        text: "سلام! چطور می‌تونم کمکتون کنم؟",
        sender: "bot",
        time: new Date().toLocaleTimeString("fa-IR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    ]);
  };

  // Resume a previous chat
  const resumeChat = async (selectedChatId: string) => {
    setChatId(selectedChatId);
    localStorage.setItem('currentChatId', selectedChatId);
    setShowHistory(false);
    
    // Load messages
    try {
      const response = await fetch(`/api/chat/history/${selectedChatId}`, {
        headers: user ? {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        } : {}
      });

      if (response.ok) {
        const data = await response.json();
        if (data.messages && data.messages.length > 0) {
          const loadedMessages = data.messages.map((msg: any, index: number) => ({
            id: index + 1,
            text: msg.text,
            sender: msg.sender,
            time: new Date(msg.timestamp).toLocaleTimeString('fa-IR', {
              hour: '2-digit',
              minute: '2-digit'
            }),
            products: msg.product_ids || [],
            isAIGenerated: msg.is_ai_generated || false
          }));
          setMessages(loadedMessages);
        }
      }
    } catch (error) {
      console.error('Failed to load chat:', error);
    }
  };

  // Function to save message to database
  const saveMessageToDB = async (message: Message) => {
    if (!savingEnabled) return;

    try {
      const response = await fetch("/api/chat/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: chatId,
          user_id: user?.id || null, // Link to user if authenticated
          message: {
            id: message.id.toString(),
            text: message.text,
            sender: message.sender,
            timestamp: new Date().toISOString(),
            is_ai_generated: message.isAIGenerated || false,
            product_ids: message.products?.map(p => p.id) || [],
          },
          session_id: chatId,
          metadata: {
            device_type: /Mobile|Android|iPhone/i.test(navigator.userAgent) ? "mobile" : "desktop",
            browser: navigator.userAgent,
          },
        }),
      });
      if (response.ok) {
        localStorage.setItem(`chat_has_backend_${chatId}`, "1");
      }
    } catch (error) {
      // Silently fail - don't disrupt user experience
      console.error("Failed to save message:", error);
    }
  };

  const simulateResponse = async (userMessage: string) => {
    setIsTyping(true);

    // Try AI-powered response first
    if (useAI) {
      try {
        const response = await fetch("/api/chat/recommend", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: userMessage,
            chat_id: chatId,
            // Include recent conversation context (last 5 messages)
            context: messages
              .slice(-5)
              .map((m) => ({
                role: m.sender === "user" ? "user" : "assistant",
                content: m.text,
              })),
          }),
        });

        if (response.ok) {
          const data = await response.json();

          const newBotMessage: Message = {
            id: messages.length + 2,
            text: data.response || "متأسفم، در حال حاضر نمی‌توانم پاسخ دهم.",
            sender: "bot",
            time: new Date().toLocaleTimeString("fa-IR", {
              hour: "2-digit",
              minute: "2-digit",
            }),
            products: data.products || [],
            isAIGenerated: data.is_ai_generated || false,
          };

          setMessages((prev) => [...prev, newBotMessage]);
          setIsTyping(false);
          setShowSuggestions(data.products && data.products.length > 0);
          
          // Save bot message to database
          saveMessageToDB(newBotMessage);
          
          return;
        }
      } catch (error) {
        console.error("AI chat error:", error);
        // Fall through to fallback
      }
    }

    // Fallback to rule-based responses
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
        isAIGenerated: false,
      };

      setMessages((prev) => [...prev, newBotMessage]);
      setIsTyping(false);
      setShowSuggestions(true);
      
      // Save fallback bot message to database
      saveMessageToDB(newBotMessage);
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
    
    // Save user message to database
    saveMessageToDB(newUserMessage);
    
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
    
    // Save quick response message to database
    saveMessageToDB(newUserMessage);
    
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
                {/* New Chat Button */}
                <button
                  onClick={startNewChat}
                  className="w-7 h-7 md:w-8 md:h-8 flex items-center justify-center rounded-full hover:bg-[#15325a] transition-colors"
                  title="گفتگوی جدید"
                >
                  <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>

                {/* Chat History Button (only for logged-in users) */}
                {user && (
                  <button
                    onClick={() => {
                      setShowHistory(!showHistory);
                      if (!showHistory) loadUserChatHistory();
                    }}
                    className="w-7 h-7 md:w-8 md:h-8 flex items-center justify-center rounded-full hover:bg-[#15325a] transition-colors relative"
                    title="تاریخچه گفتگو"
                  >
                    <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {chatHistory.length > 0 && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full text-[8px] flex items-center justify-center text-white">
                        {chatHistory.length > 9 ? '9+' : chatHistory.length}
                      </span>
                    )}
                  </button>
                )}

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
                  {/* Chat History Panel */}
                  {showHistory ? (
                    <div className="h-72 md:h-96 overflow-y-auto bg-[#f4f1ec] dark:bg-gray-800/80 p-3 md:p-4">
                      <div className="mb-3">
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                          تاریخچه گفتگوها
                          {user && <span className="text-xs text-gray-500 mr-2">({user.name})</span>}
                        </h3>
                      </div>
                      
                      {isLoadingHistory ? (
                        <div className="flex items-center justify-center h-32">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1A3C69]"></div>
                        </div>
                      ) : chatHistory.length === 0 ? (
                        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                          <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                          </svg>
                          <p className="text-sm">هنوز گفتگویی ندارید</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {chatHistory.map((chat) => {
                            const sessionChatId = chat.chat_id || chat.id;
                            return (
                              <motion.button
                                key={chat.id}
                                onClick={() => resumeChat(sessionChatId)}
                                className={`w-full text-right p-3 rounded-lg transition-colors ${
                                  sessionChatId === chatId
                                    ? 'bg-[#1A3C69] text-white'
                                    : 'bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600'
                                }`}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-medium truncate ${
                                      sessionChatId === chatId ? 'text-white' : 'text-gray-900 dark:text-gray-100'
                                    }`}>
                                      {chat.title || 'گفتگو'}
                                    </p>
                                    <p className={`text-xs mt-1 truncate ${
                                      sessionChatId === chatId ? 'text-gray-200' : 'text-gray-500 dark:text-gray-400'
                                    }`}>
                                      {chat.last_message}
                                    </p>
                                  </div>
                                  {sessionChatId === chatId && (
                                    <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  )}
                                </div>
                              </motion.button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Messages View */
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
                          <div className="flex flex-col gap-2 max-w-[85%]">
                            <div
                              className={`rounded-xl p-2.5 md:p-3 ${
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
                                className={`text-[10px] md:text-xs mt-1 flex items-center gap-1 ${
                                  message.sender === "user"
                                    ? "text-right text-blue-200 justify-end"
                                    : "text-left text-gray-400 dark:text-gray-400"
                                }`}
                              >
                                {message.time}
                                {message.isAIGenerated && message.sender === "bot" && (
                                  <span className="flex items-center gap-0.5 text-primary-500">
                                    <Bot className="w-2.5 h-2.5" />
                                    <span className="text-[9px]">AI</span>
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Product Recommendations */}
                            {message.products && message.products.length > 0 && (
                              <div className="flex flex-col gap-1.5">
                                {message.products.slice(0, 3).map((product, idx) => (
                                  <motion.a
                                    key={product.id}
                                    href={`/products/${product.id}`}
                                    target="_blank"
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className="flex items-center gap-2 p-2 bg-white dark:bg-gray-700 rounded-lg shadow-sm hover:shadow-md transition-all border border-gray-100 dark:border-gray-600 hover:border-primary-300 dark:hover:border-primary-500"
                                  >
                                    {product.images?.[0] && (
                                      <div className="w-10 h-10 md:w-12 md:h-12 bg-gray-100 dark:bg-gray-600 rounded overflow-hidden flex-shrink-0">
                                        <img
                                          src={product.images[0]}
                                          alt={product.name}
                                          className="w-full h-full object-cover"
                                        />
                                      </div>
                                    )}
                                    <div className="flex-1 min-w-0 text-right">
                                      <p className="text-[10px] md:text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                                        {product.name}
                                      </p>
                                      {product.brand && (
                                        <p className="text-[9px] md:text-[10px] text-gray-500 dark:text-gray-400 truncate">
                                          {product.brand}
                                        </p>
                                      )}
                                      <p className="text-[10px] md:text-xs font-semibold text-primary-600 dark:text-primary-400 mt-0.5">
                                        {product.price.toLocaleString()} تومان
                                      </p>
                                    </div>
                                  </motion.a>
                                ))}
                                {message.products.length > 3 && (
                                  <p className="text-[9px] md:text-[10px] text-gray-500 dark:text-gray-400 text-center">
                                    + {message.products.length - 3} محصول دیگر
                                  </p>
                                )}
                              </div>
                            )}
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
                  )}
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
