import Link from "next/link";
import { Send } from "lucide-react";

import { siteConfig } from "@/config/site";

export function TelegramFloating() {
  return (
    <Link
      href={siteConfig.telegram}
      target="_blank"
      rel="noreferrer"
      className="fixed bottom-5 right-5 z-50 flex h-[52px] w-[52px] items-center justify-center rounded-full bg-graphite text-ivory shadow-[0_18px_48px_rgba(55,52,48,0.24)] transition hover:-translate-y-1 hover:bg-bronze dark:bg-sand dark:text-graphite"
      aria-label="Telegram @Sonkei_ru"
    >
      <Send className="h-5 w-5" />
    </Link>
  );
}
