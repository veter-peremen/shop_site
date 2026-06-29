import Link from "next/link";

import type { Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

export function Logo({ locale, className }: { locale: Locale; className?: string }) {
  return (
    <Link
      href={`/${locale}`}
      className={cn("group inline-flex items-center gap-3 text-foreground", className)}
      aria-label="SONKEI"
    >
      <span className="relative flex h-9 w-9 items-center justify-center rounded-full border border-bronze/40 bg-card/70">
        <span className="h-3 w-3 rounded-full border border-foreground/70 transition group-hover:scale-90" />
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-lg font-light tracking-normal">SONKEI</span>
        <span className="mt-1 h-px w-full origin-left scale-x-50 bg-bronze/60 transition group-hover:scale-x-100" />
      </span>
    </Link>
  );
}
