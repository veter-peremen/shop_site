import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { LoginClient } from "@/components/account/login-client";
import { isLocale, type Locale } from "@/i18n/routing";
import { getCurrentUser } from "@/lib/auth";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { locale: rawLocale } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : "ru";
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "authFlow" });

  return { title: t("loginTitle") };
}

export default async function LoginPage({ params }: PageProps) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();

  const locale = rawLocale as Locale;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  if (user) {
    redirect(`/${locale}/account`);
  }

  return (
    <Suspense>
      <LoginClient locale={locale} />
    </Suspense>
  );
}
