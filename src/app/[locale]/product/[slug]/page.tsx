import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { ProductDetail } from "@/components/product/product-detail";
import { isLocale, locales, type Locale } from "@/i18n/routing";
import { getAllProducts, getProductBySlug, getRelatedProducts } from "@/lib/products";
import { getPublishedReviewsForProduct } from "@/lib/reviews";
import {
  absoluteUrl,
  formatCurrency,
  localizedProductDescription,
  localizedProductName,
} from "@/lib/utils";

type ProductPageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  // If the database isn't reachable at build time (e.g. building a Docker image
  // without a live DB), skip eager pre-rendering and fall back to on-demand ISR
  // rendering per request (dynamicParams defaults to true).
  try {
    const products = await getAllProducts();
    return locales.flatMap((locale) => products.map((product) => ({ locale, slug: product.slug })));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : "ru";
  setRequestLocale(locale);
  const product = await getProductBySlug(slug);

  if (!product) {
    return {};
  }

  const name = localizedProductName(product, locale);
  const description = localizedProductDescription(product, locale).slice(0, 158);

  return {
    title: name,
    description,
    alternates: {
      canonical: absoluteUrl(`/${locale}/product/${product.slug}`),
      languages: {
        ru: absoluteUrl(`/ru/product/${product.slug}`),
        en: absoluteUrl(`/en/product/${product.slug}`),
        "x-default": absoluteUrl(`/ru/product/${product.slug}`),
      },
    },
    openGraph: {
      title: name,
      description,
      url: absoluteUrl(`/${locale}/product/${product.slug}`),
      images: product.images[0] ? [{ url: product.images[0], alt: name }] : [],
      type: "website",
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { locale: rawLocale, slug } = await params;
  if (!isLocale(rawLocale)) notFound();

  const locale = rawLocale as Locale;
  setRequestLocale(locale);
  const product = await getProductBySlug(slug);

  if (!product) notFound();

  const [related, reviews] = await Promise.all([
    getRelatedProducts(product, 4),
    getPublishedReviewsForProduct(product.id),
  ]);
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: localizedProductName(product, locale),
    description: localizedProductDescription(product, locale).slice(0, 500),
    sku: product.sku,
    brand: {
      "@type": "Brand",
      name: "SONKEI",
    },
    image: product.images,
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: product.rating,
      reviewCount: product.reviewsCount,
    },
    offers: {
      "@type": "Offer",
      priceCurrency: "RUB",
      price: product.price,
      availability: "https://schema.org/InStock",
      url: absoluteUrl(`/${locale}/product/${product.slug}`),
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <div className="premium-shell pt-8 text-sm text-muted-foreground">
        SONKEI · {formatCurrency(product.price, locale)}
      </div>
      <ProductDetail product={product} related={related} locale={locale} reviews={reviews} />
    </>
  );
}
