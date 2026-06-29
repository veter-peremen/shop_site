import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { CheckoutClient } from "@/components/checkout/checkout-client";
import { isLocale, type Locale } from "@/i18n/routing";
import { getCurrentUser } from "@/lib/auth";
import { getAllProducts } from "@/lib/products";
import { getSettings } from "@/lib/settings";

type CheckoutPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: CheckoutPageProps) {
  const { locale: rawLocale } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : "ru";
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "checkout" });

  return {
    title: t("title"),
  };
}

export default async function CheckoutPage({ params }: CheckoutPageProps) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();

  const locale = rawLocale as Locale;
  setRequestLocale(locale);
  const [products, user, settings] = await Promise.all([
    getAllProducts(),
    getCurrentUser(),
    getSettings(),
  ]);

  return (
    <CheckoutClient
      products={products}
      locale={locale}
      user={user}
      bonusMaxSpendShare={settings.bonusMaxSpendShare}
      ndsRate={settings.ndsRate}
    />
  );
}
