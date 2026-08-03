import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { ProductCard } from "@/components/product/product-card";
import type { Locale } from "@/i18n/routing";
import type { Product } from "@/types/product";

export function HomeCatalogSection({ locale, products }: { locale: Locale; products: Product[] }) {
  return (
    <section className="premium-shell py-16 sm:py-20">
      <div className="mb-8 flex items-end justify-between gap-4">
        <h2 className="text-3xl font-light sm:text-4xl">
          {locale === "ru" ? "Каталог" : "Catalog"}
        </h2>
        <Link
          href={`/${locale}/catalog`}
          className="flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
        >
          {locale === "ru" ? "Все товары" : "All products"}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {products.map((product, index) => (
          <ProductCard key={product.id} product={product} locale={locale} priority={index < 4} />
        ))}
      </div>
    </section>
  );
}