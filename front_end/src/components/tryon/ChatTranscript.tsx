"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import ChatMessageItem, { RecommendationActions } from "./ChatMessageItem";
import { cn } from "@/lib/utils";
import { ChatMessage } from "@/types/tryon";

interface ChatTranscriptProps {
  messages: ChatMessage[];
  /** The room is still being read back from the server. */
  loading: boolean;
  /** The agent is composing a reply. */
  typing: boolean;
  recommendation: RecommendationActions;
  onCompare: (beforeImage: string, afterImage: string) => void;
}

const SKELETON_ROWS = [
  { fromUser: false, width: "max-w-[65%]", secondLine: "w-4/5" },
  { fromUser: true, width: "max-w-[45%]", secondLine: "" },
  { fromUser: false, width: "max-w-[75%]", secondLine: "w-3/5" },
];

/** Placeholder bubbles for the moment before a stored room has arrived. */
function TranscriptSkeleton() {
  return (
    <div className="space-y-3 p-2">
      {SKELETON_ROWS.map((row, idx) => (
        <div key={idx} className={cn("flex items-start gap-1.5", row.fromUser && "flex-row-reverse")}>
          <div className="w-7 h-7 rounded-full bg-voxcina-blue/10 dark:bg-voxcina-cream/10 animate-pulse flex-shrink-0" />
          <div className={cn("space-y-1.5 flex-1", row.width)}>
            <div className="h-3 bg-voxcina-blue/10 dark:bg-voxcina-cream/10 rounded-xl animate-pulse" />
            {row.secondLine && (
              <div className={cn("h-3 bg-voxcina-blue/10 dark:bg-voxcina-cream/10 rounded-xl animate-pulse", row.secondLine)} />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/** The three-dot bubble shown while the agent is answering. */
function TypingIndicator() {
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-1.5 mt-2">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-voxcina-blue flex items-center justify-center shadow-inset-button">
        <Sparkles className="h-3 w-3 text-voxcina-cream" />
      </div>
      <div className="bg-white dark:bg-voxcina-blue/25 rounded-xl rounded-tl-sm border border-secondary-400 dark:border-voxcina-blue/30 px-3 py-2.5">
        <div className="flex items-center gap-1">
          {[0, 150, 300].map((delay) => (
            <div
              key={delay}
              className="w-1.5 h-1.5 bg-voxcina-blue/40 dark:bg-voxcina-cream/40 rounded-full animate-bounce"
              style={{ animationDelay: `${delay}ms` }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

/** The scrolling transcript of the fitting room conversation. */
export default function ChatTranscript({
  messages,
  loading,
  typing,
  recommendation,
  onCompare,
}: ChatTranscriptProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin space-y-1.5 rounded-xl bg-voxcina-blue/[0.06] dark:bg-voxcina-cream/[0.05] border border-secondary-400 dark:border-voxcina-blue/30 p-3">
      {loading ? (
        <TranscriptSkeleton />
      ) : (
        <AnimatePresence>
          {messages.map((message, idx) => (
            <ChatMessageItem
              key={idx}
              message={message}
              grouped={messages[idx - 1]?.role === message.role}
              recommendation={recommendation}
              onCompare={onCompare}
            />
          ))}
        </AnimatePresence>
      )}

      {typing && <TypingIndicator />}

      <div ref={endRef} />
    </div>
  );
}
