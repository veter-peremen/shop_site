"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Languages } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { locales, type Locale } from "@/i18n/routing";

export function LanguageSwitcher({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const targetLocale = locale === "ru" ? "en" : "ru";
  const targetPath = pathname.replace(/^\/(ru|en)/, `/${targetLocale}`);

  if (!locales.includes(locale)) return null;

  return (
    <Button asChild variant="icon" size="icon" aria-label={t("language")}>
      <Link href={targetPath || `/${targetLocale}`}>
        <Languages className="h-4 w-4" />
        <span className="sr-only">{t("language")}</span>
      </Link>
    </Button>
  );
}
