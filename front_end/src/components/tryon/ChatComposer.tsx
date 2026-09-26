"use client";

import { Layers, Search, Send, Shirt, Sparkles } from "lucide-react";
import Button from "@/components/ui/Button";

/** Ways into a chat about the garment/recommendations, offered once a try-on result is on screen. */
export const TRYON_CHAT_OPENERS = [
  { icon: Sparkles, text: "این لباس چطور به من میاد؟" },
  { icon: Layers, text: "یه ست مناسب پیشنهاد بده" },
  { icon: Shirt, text: "سایزش برام مناسبه؟" },
  { icon: Search, text: "رنگ دیگه‌ای ازش هست؟" },
];

interface ChatComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  /** A turn is in flight — the input waits for it. */
  disabled: boolean;
  showOpeners: boolean;
  onSelectOpener: (text: string) => void;
}

/** The opener suggestions and the message box beneath the transcript. */
export default function ChatComposer({
  value,
  onChange,
  onSubmit,
  disabled,
  showOpeners,
  onSelectOpener,
}: ChatComposerProps) {
  return (
    <div className="flex-shrink-0 pt-2 space-y-2">
      {showOpeners && (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {TRYON_CHAT_OPENERS.map((opener) => {
            const Icon = opener.icon;
            return (
              <button
                key={opener.text}
                type="button"
                onClick={() => onSelectOpener(opener.text)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background dark:bg-voxcina-blue/25 border border-secondary-300 dark:border-voxcina-blue/30 text-voxcina-blue/70 dark:text-voxcina-cream/70 hover:border-voxcina-blue/50 dark:hover:border-voxcina-cream/50 hover:bg-secondary-100/60 dark:hover:bg-voxcina-blue/40 hover:text-voxcina-blue dark:hover:text-voxcina-cream transition-all duration-200 text-xs shadow-soft"
              >
                <Icon className="h-3 w-3 text-amber-500" />
                <span>{opener.text}</span>
              </button>
            );
          })}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="flex items-center gap-2"
      >
        <div className="relative flex-1">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="پیام به ووکسا (درباره سایز، ست یا استایل)..."
            className="w-full bg-background border border-secondary-300 dark:border-voxcina-blue/30 rounded-xl px-3.5 py-2.5 text-xs md:text-sm text-voxcina-blue dark:text-voxcina-cream placeholder:text-voxcina-blue/40 dark:placeholder:text-voxcina-cream/40 focus:outline-none focus:border-voxcina-blue/60 focus:ring-2 focus:ring-voxcina-blue/15 dark:focus:ring-voxcina-cream/15 transition-all shadow-inner-soft"
            disabled={disabled}
          />
        </div>

        <Button
          type="submit"
          variant="primary"
          size="sm"
          disabled={disabled || !value.trim()}
          className="rounded-xl px-4 h-10 shadow-inset-button font-medium flex-shrink-0"
        >
          <Send className="h-3.5 w-3.5" />
          <span className="hidden sm:inline mr-1 text-xs">ارسال</span>
        </Button>
      </form>
    </div>
  );
}
