import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { CatalogClient } from "@/components/catalog/catalog-client";
import { isLocale, type Locale } from "@/i18n/routing";
import { getAllProducts } from "@/lib/products";

type CatalogPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: CatalogPageProps) {
  const { locale: rawLocale } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : "ru";
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "catalog" });

  return {
    title: t("title"),
    description: t("copy"),
  };
}

export default async function CatalogPage({ params }: CatalogPageProps) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();

  const locale = rawLocale as Locale;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "catalog" });
  // Falls back gracefully if the DB isn't reachable at build time (e.g. a Docker
  // image build without a live DB) instead of failing the whole build.
  const products = await getAllProducts().catch(() => []);

  return (
    <>
      <section className="premium-shell pt-12">
        <div className="max-w-3xl">
          <h1 className="text-5xl font-light leading-tight sm:text-6xl">{t("title")}</h1>
          <p className="mt-5 text-lg leading-8 text-muted-foreground">{t("copy")}</p>
        </div>
      </section>
      <CatalogClient products={products} locale={locale} />
    </>
  );
}
