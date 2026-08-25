"use client";

import { Layers, Send, ShoppingBag, Sparkles, Tag } from "lucide-react";
import Button from "@/components/ui/Button";

/** Ways into a negotiation, offered once a try-on result is on screen. */
export const NEGOTIATION_OPENERS = [
  { icon: Tag, text: "سلام! می‌خوام یه تخفیف خوب برای این محصول بگیرم." },
  { icon: Sparkles, text: "سلام ووکسا! این قیمت برام کمی بالاست، می‌تونی کمک کنی؟" },
  { icon: ShoppingBag, text: "سلام! اگه تخفیف خوبی بدی همین الان خرید می‌کنم." },
  { icon: Layers, text: "یه ست پیشنهاد بده" },
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
    <>
      {showOpeners && (
        <div className="flex-shrink-0 space-y-2 mt-2">
          <div className="flex flex-wrap gap-1.5">
            {NEGOTIATION_OPENERS.map((opener) => (
              <button
                key={opener.text}
                onClick={() => onSelectOpener(opener.text)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white dark:bg-voxcina-blue/30 border border-secondary-400 dark:border-voxcina-blue/40 text-voxcina-blue/60 dark:text-voxcina-cream/60 hover:border-voxcina-blue/40 dark:hover:border-voxcina-cream/40 hover:bg-voxcina-blue/[0.08] dark:hover:bg-voxcina-cream/[0.08] hover:text-voxcina-blue dark:hover:text-voxcina-cream transition-all text-xs"
              >
                <opener.icon className="h-3 w-3" />
                {opener.text}
              </button>
            ))}
          </div>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="flex gap-2 mt-2 flex-shrink-0"
      >
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="پیام به ووکسا..."
          className="flex-1 bg-white dark:bg-voxcina-blue/30 border border-secondary-400 dark:border-voxcina-blue/40 rounded-xl px-3 py-2 text-xs text-voxcina-blue dark:text-voxcina-cream placeholder:text-voxcina-blue/40 focus:outline-none focus:border-voxcina-blue/60 focus:ring-2 focus:ring-voxcina-blue/15 focus:shadow-focus-warm transition-all"
          disabled={disabled}
        />
        <Button
          type="submit"
          variant="primary"
          size="sm"
          disabled={disabled || !value.trim()}
          className="rounded-xl px-3 shadow-inset-button focus:shadow-focus-warm"
        >
          <Send className="h-3.5 w-3.5" />
        </Button>
      </form>
    </>
  );
}
