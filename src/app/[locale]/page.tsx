import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import {
  HeroSection,
  CareDetailsSection,
  LoyaltySection,
  StorySection,
  WholesaleCtaSection,
} from "@/components/home/home-sections";
import { HomeCatalogSection } from "@/components/home/home-catalog-section";
import { isLocale, type Locale } from "@/i18n/routing";
import { getAllProducts } from "@/lib/products";

type HomePageProps = {
  params: Promise<{ locale: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: HomePageProps) {
  const { locale: rawLocale } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : "ru";
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "meta" });

  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();

  const locale = rawLocale as Locale;
  setRequestLocale(locale);

  const products = await getAllProducts().catch(() => []);
  const featured = products[0] ?? null;

  return (
    <>
      <HeroSection locale={locale} featured={featured} />
      <HomeCatalogSection locale={locale} products={products} />
      <StorySection locale={locale} />
      <CareDetailsSection locale={locale} />
      <WholesaleCtaSection locale={locale} />
      <LoyaltySection locale={locale} />
    </>
  );
}