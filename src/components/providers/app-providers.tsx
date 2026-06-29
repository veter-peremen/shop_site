"use client";

import { NextIntlClientProvider } from "next-intl";
import type { AbstractIntlMessages } from "next-intl";

import { ThemeProvider } from "@/components/providers/theme-provider";
import type { Locale } from "@/i18n/routing";

export function AppProviders({
  children,
  locale,
  messages,
}: {
  children: React.ReactNode;
  locale: Locale;
  messages: AbstractIntlMessages;
}) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="Europe/Moscow">
      <ThemeProvider>{children}</ThemeProvider>
    </NextIntlClientProvider>
  );
}
