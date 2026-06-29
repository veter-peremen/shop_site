import Link from "next/link";
import { Mail, MapPin, Phone, Send } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Logo } from "@/components/layout/logo";
import { siteConfig } from "@/config/site";
import type { Locale } from "@/i18n/routing";

export async function Footer({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "footer" });
  const navT = await getTranslations({ locale, namespace: "nav" });

  return (
    <footer className="mt-24 border-t border-border/70">
      <div className="premium-shell grid gap-10 py-12 md:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-5">
          <Logo locale={locale} />
          <p className="max-w-md text-sm leading-7 text-muted-foreground">{t("copy")}</p>
          <div className="grid max-w-3xl gap-3 text-sm text-muted-foreground sm:grid-cols-2">
            <Link href={siteConfig.phoneHref} className="inline-flex items-center gap-2 hover:text-foreground">
              <Phone className="h-4 w-4 text-bronze" />
              {siteConfig.phone}
            </Link>
            <Link href={siteConfig.emailHref} className="inline-flex items-center gap-2 hover:text-foreground">
              <Mail className="h-4 w-4 text-bronze" />
              {siteConfig.email}
            </Link>
            <span className="inline-flex items-start gap-2 sm:col-span-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-bronze" />
              {siteConfig.warehouse}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-start gap-4 md:items-end">
          <p className="text-sm font-medium">{t("contacts")}</p>
          <nav className="flex flex-wrap justify-start gap-2 md:justify-end">
            {siteConfig.footerNav.map((item) => (
              <Link
                key={item.href}
                href={`/${locale}${item.href}`}
                className="rounded-full border border-border bg-card/70 px-4 py-2 text-sm text-muted-foreground transition hover:border-bronze/50 hover:text-foreground"
              >
                {navT(item.label)}
              </Link>
            ))}
          </nav>
          <Link
            href={siteConfig.telegram}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-5 py-3 text-sm transition hover:border-bronze/50 hover:bg-secondary/80"
          >
            <Send className="h-4 w-4" />
            {t("telegram")}
          </Link>
          <p className="text-xs text-muted-foreground">© 2026 SONKEI</p>
        </div>
      </div>
    </footer>
  );
}
