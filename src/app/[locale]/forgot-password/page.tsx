import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { ForgotPasswordClient } from "@/components/account/forgot-password-client";
import { isLocale, type Locale } from "@/i18n/routing";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { locale: rawLocale } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : "ru";
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "authFlow" });

  return { title: t("forgotTitle") };
}

export default async function ForgotPasswordPage({ params }: PageProps) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();

  const locale = rawLocale as Locale;
  setRequestLocale(locale);

  return <ForgotPasswordClient locale={locale} />;
}
