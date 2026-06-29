import type { Metadata } from "next";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { Footer } from "@/components/layout/footer";
import { SiteHeader } from "@/components/layout/site-header";
import { TelegramFloating } from "@/components/layout/telegram-floating";
import { AppProviders } from "@/components/providers/app-providers";
import { siteConfig } from "@/config/site";
import { isLocale, locales, type Locale } from "@/i18n/routing";
import { absoluteUrl } from "@/lib/utils";

type LocaleLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LocaleLayoutProps): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : "ru";
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "meta" });

  return {
    metadataBase: new URL(siteConfig.url),
    title: {
      default: t("title"),
      template: `%s | ${siteConfig.name}`,
    },
    description: t("description"),
    alternates: {
      canonical: absoluteUrl(`/${locale}`),
      languages: {
        ru: absoluteUrl("/ru"),
        en: absoluteUrl("/en"),
        "x-default": absoluteUrl("/ru"),
      },
    },
    openGraph: {
      title: t("title"),
      description: t("description"),
      url: absoluteUrl(`/${locale}`),
      siteName: siteConfig.name,
      locale: locale === "ru" ? "ru_RU" : "en_US",
      type: "website",
    },
  };
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale: rawLocale } = await params;

  if (!isLocale(rawLocale)) {
    notFound();
  }

  const locale = rawLocale as Locale;
  setRequestLocale(locale);
  const messages = await getMessages({ locale });

  return (
    <AppProviders locale={locale} messages={messages}>
      <SiteHeader locale={locale} />
      <main>{children}</main>
      <Footer locale={locale} />
      <TelegramFloating />
    </AppProviders>
  );
}
