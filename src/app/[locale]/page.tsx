import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import {
  HeroSection,
  HomeCatalogSection,
  CareDetailsSection,
  LoyaltySection,
  StorySection,
  WholesaleCtaSection,
} from "@/components/home/home-sections";
import { isLocale, type Locale } from "@/i18n/routing";
import { getAllProducts } from "@/lib/products";

type HomePageProps = {
  params: Promise<{ locale: string }>;
};

// Revalidate periodically so the homepage picks up products without a rebuild —
// matters when the DB is empty/unreachable at build time (e.g. a fresh Docker image
// before products are seeded), since this page 404s with an empty catalog.
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

  // Falls back gracefully if the DB isn't reachable at build time (e.g. a Docker
  // image build without a live DB) instead of failing the whole build.
  const products = await getAllProducts().catch(() => []);
  const featured = products[0] ?? null;

  return (
    <>
      <HomeCatalogSection locale={locale} products={products} />
      <HeroSection locale={locale} featured={featured} />
      <StorySection locale={locale} />
      <CareDetailsSection locale={locale} />
      <WholesaleCtaSection locale={locale} />
      <LoyaltySection locale={locale} />
    </>
  );
}
