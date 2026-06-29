import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { CartClient } from "@/components/cart/cart-client";
import { isLocale, type Locale } from "@/i18n/routing";
import { getAllProducts } from "@/lib/products";
import { DEFAULT_SETTINGS, getSettings } from "@/lib/settings";

type CartPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: CartPageProps) {
  const { locale: rawLocale } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : "ru";
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "cart" });

  return {
    title: t("title"),
  };
}

export default async function CartPage({ params }: CartPageProps) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();

  const locale = rawLocale as Locale;
  setRequestLocale(locale);
  // Falls back gracefully if the DB isn't reachable at build time (e.g. a Docker
  // image build without a live DB) instead of failing the whole build.
  const [products, settings] = await Promise.all([
    getAllProducts().catch(() => []),
    getSettings().catch(() => DEFAULT_SETTINGS),
  ]);

  return (
    <CartClient
      products={products}
      locale={locale}
      bonusMaxSpendShare={settings.bonusMaxSpendShare}
      ndsRate={settings.ndsRate}
    />
  );
}
