"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Search, SlidersHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { ProductCard } from "@/components/product/product-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Locale } from "@/i18n/routing";
import { categoryLabel, lineLabel } from "@/lib/utils";
import type { Product, ProductCategory, ProductLine } from "@/types/product";

type SortMode = "popular" | "priceAsc" | "priceDesc";

export function CatalogClient({ products, locale }: { products: Product[]; locale: Locale }) {
  const t = useTranslations("catalog");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ProductCategory | "all">("all");
  const [line, setLine] = useState<ProductLine | "all">("all");
  const [size, setSize] = useState("all");
  const [sort, setSort] = useState<SortMode>("popular");
  const [visible, setVisible] = useState(8);

  const sizes = useMemo(() => Array.from(new Set(products.map((product) => product.size))), [products]);
  const categories = useMemo(
    () => Array.from(new Set(products.map((product) => product.category))),
    [products],
  );
  const lines = useMemo(() => Array.from(new Set(products.map((product) => product.line))), [products]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const result = products.filter((product) => {
      const searchable = [
        product.nameRu,
        product.nameEn,
        product.sku,
        product.wbId,
        product.size,
        product.weightRange,
      ]
        .join(" ")
        .toLowerCase();

      return (
        (!normalizedQuery || searchable.includes(normalizedQuery)) &&
        (category === "all" || product.category === category) &&
        (line === "all" || product.line === line) &&
        (size === "all" || product.size === size)
      );
    });

    return result.sort((a, b) => {
      if (sort === "priceAsc") return a.price - b.price;
      if (sort === "priceDesc") return b.price - a.price;
      return b.reviewsCount + b.rating - (a.reviewsCount + a.rating);
    });
  }, [category, line, products, query, size, sort]);

  const shown = filtered.slice(0, visible);

  return (
    <section className="premium-shell py-10">
      <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
        <aside className="h-fit rounded-lg border border-border bg-card/65 p-5 lg:sticky lg:top-28">
          <div className="mb-5 flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-bronze" />
            <p className="font-medium">{locale === "ru" ? "Фильтры" : "Filters"}</p>
          </div>
          <div className="space-y-5">
            <label className="block">
              <span className="mb-2 block text-xs text-muted-foreground">{t("search")}</span>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={query} onChange={(event) => setQuery(event.target.value)} className="pl-11" />
              </div>
            </label>

            <FilterGroup label={t("category")}>
              <FilterButton active={category === "all"} onClick={() => setCategory("all")}>
                {t("all")}
              </FilterButton>
              {categories.map((item) => (
                <FilterButton key={item} active={category === item} onClick={() => setCategory(item)}>
                  {categoryLabel(item, locale)}
                </FilterButton>
              ))}
            </FilterGroup>

            <FilterGroup label={t("line")}>
              <FilterButton active={line === "all"} onClick={() => setLine("all")}>
                {t("all")}
              </FilterButton>
              {lines.map((item) => (
                <FilterButton key={item} active={line === item} onClick={() => setLine(item)}>
                  {lineLabel(item, locale)}
                </FilterButton>
              ))}
            </FilterGroup>

            <FilterGroup label={t("size")}>
              <FilterButton active={size === "all"} onClick={() => setSize("all")}>
                {t("all")}
              </FilterButton>
              {sizes.map((item) => (
                <FilterButton key={item} active={size === item} onClick={() => setSize(item)}>
                  {item}
                </FilterButton>
              ))}
            </FilterGroup>

            <label className="block">
              <span className="mb-2 block text-xs text-muted-foreground">{t("sort")}</span>
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as SortMode)}
                className="focus-ring h-12 w-full rounded-full border border-border bg-card px-4 text-sm"
              >
                <option value="popular">{t("popular")}</option>
                <option value="priceAsc">{t("priceAsc")}</option>
                <option value="priceDesc">{t("priceDesc")}</option>
              </select>
            </label>
          </div>
        </aside>

        <div>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <Badge variant="bronze">{filtered.length} SKU</Badge>
            {query ? <p className="text-sm text-muted-foreground">{query}</p> : null}
          </div>

          <AnimatePresence mode="popLayout">
            {shown.length > 0 ? (
              <motion.div layout className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {shown.map((product, index) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    locale={locale}
                    priority={index < 3}
                  />
                ))}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-lg border border-border bg-card/65 p-10 text-center text-muted-foreground"
              >
                {t("empty")}
              </motion.div>
            )}
          </AnimatePresence>

          {visible < filtered.length ? (
            <div className="mt-10 flex justify-center">
              <Button variant="secondary" onClick={() => setVisible((value) => value + 6)}>
                {t("loadMore")}
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-xs text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`focus-ring rounded-full border px-3 py-2 text-xs transition ${
        active
          ? "border-bronze bg-bronze/10 text-bronze"
          : "border-border bg-background/70 text-muted-foreground hover:border-bronze/50"
      }`}
    >
      {children}
    </button>
  );
}
