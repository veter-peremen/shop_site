"use client";

import { motion } from "framer-motion";
import { Heart, ShieldCheck, Star } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { AddToCartButton } from "@/components/product/add-to-cart-button";
import { ProductCard } from "@/components/product/product-card";
import { ProductGallery } from "@/components/product/product-gallery";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Locale } from "@/i18n/routing";
import type { SessionUser } from "@/lib/auth";
import { csrfFetch } from "@/lib/csrf-client";
import type { Review } from "@/lib/reviews";
import {
  cn,
  formatCurrency,
  lineLabel,
  localizedProductDescription,
  localizedProductName,
  localizedProductShort,
} from "@/lib/utils";
import { useCommerceStore } from "@/store/commerce-store";
import type { Product } from "@/types/product";

export function ProductDetail({
  product,
  related,
  locale,
  reviews,
}: {
  product: Product;
  related: Product[];
  locale: Locale;
  reviews: Review[];
}) {
  const t = useTranslations("product");
  const toggleWishlist = useCommerceStore((state) => state.toggleWishlist);
  const wishlist = useCommerceStore((state) => state.wishlist);
  const [mounted, setMounted] = useState(false);
  const wished = mounted && wishlist.includes(product.id);

  useEffect(() => setMounted(true), []);

  const dimensions = [
    product.dimensions.lengthCm,
    product.dimensions.widthCm,
    product.dimensions.heightCm,
  ]
    .filter(Boolean)
    .join(" × ");

  return (
    <>
      <section className="premium-shell grid gap-10 pt-10 lg:grid-cols-[1.05fr_0.95fr] lg:pt-16">
        <ProductGallery images={product.images} alt={localizedProductName(product, locale)} />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col justify-center"
        >
          <div className="flex flex-wrap gap-2">
            <Badge variant="bronze">{lineLabel(product.line, locale)}</Badge>
            <Badge>{product.size}</Badge>
            <Badge>{product.weightRange}</Badge>
          </div>

          <h1 className="mt-6 text-4xl font-light leading-[1.05] sm:text-5xl lg:text-6xl">
            {localizedProductName(product, locale)}
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
            {localizedProductShort(product, locale)}
          </p>

          <div className="mt-8 grid gap-4 border-y border-border py-6 sm:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">{t("pack")}</p>
              <p className="mt-1 text-xl font-medium">
                {product.count} {locale === "ru" ? "шт" : "pcs"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("weight")}</p>
              <p className="mt-1 text-xl font-medium">{product.weightRange}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("bonus")}</p>
              <p className="mt-1 text-xl font-medium">+{product.bonusPoints}</p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-3xl font-medium">{formatCurrency(product.price, locale)}</p>
              <p className="text-sm text-muted-foreground line-through">
                {formatCurrency(product.oldPrice, locale)}
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => toggleWishlist(product.id)}
                className={cn(wished && "border-bronze/60 bg-bronze/10 text-bronze")}
              >
                <Heart className={cn("h-4 w-4", wished && "fill-current")} />
                {t("wishlist")}
              </Button>
              <AddToCartButton productId={product.id} variant="bronze" />
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <Star className="h-4 w-4 fill-bronze text-bronze" />
              {product.rating} · {product.reviewsCount} {t("reviews")}
            </span>
            <span className="inline-flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-bronze" />
              {product.specs.certificateNumber || "EAEU"}
            </span>
          </div>
        </motion.div>
      </section>

      <section className="premium-shell mt-16">
        <Tabs defaultValue="description">
          <TabsList>
            <TabsTrigger value="description">{t("description")}</TabsTrigger>
            <TabsTrigger value="specs">{t("specs")}</TabsTrigger>
            <TabsTrigger value="reviews">{t("reviews")}</TabsTrigger>
          </TabsList>
          <TabsContent value="description">
            <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
              <h2 className="text-3xl font-light">{t("description")}</h2>
              <p className="whitespace-pre-line text-base leading-8 text-muted-foreground">
                {localizedProductDescription(product, locale)}
              </p>
            </div>
          </TabsContent>
          <TabsContent value="specs">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                [t("origin"), product.specs.origin],
                [t("shelfLife"), product.specs.shelfLife],
                [t("certificate"), product.specs.certificateNumber],
                [t("dimensions"), dimensions ? `${dimensions} см` : ""],
                ["SKU", product.sku],
                ["WB", product.wbId],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-border bg-card/65 p-5">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="mt-2 text-sm font-medium">{value || "SONKEI"}</p>
                </div>
              ))}
            </div>
          </TabsContent>
          <TabsContent value="reviews">
            <ReviewForm productId={product.id} locale={locale} />

            {reviews.length === 0 ? (
              <p className="mt-6 text-sm text-muted-foreground">{t("reviewEmpty")}</p>
            ) : (
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {reviews.map((review) => (
                  <div key={review.id} className="rounded-lg border border-border bg-card/65 p-5">
                    <div className="mb-4 flex gap-1 text-bronze">
                      {Array.from({ length: 5 }).map((_, star) => (
                        <Star
                          key={star}
                          className={cn("h-4 w-4", star < review.rating ? "fill-current" : "text-border")}
                        />
                      ))}
                    </div>
                    {review.comment ? (
                      <p className="leading-7 text-muted-foreground">{review.comment}</p>
                    ) : null}
                    <p className="mt-5 text-sm font-medium">SONKEI parent</p>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </section>

      <section className="premium-shell mt-20">
        <div className="mb-8 flex items-end justify-between gap-4">
          <h2 className="text-3xl font-light">{t("related")}</h2>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {related.map((item) => (
            <ProductCard key={item.id} product={item} locale={locale} compact />
          ))}
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/90 p-3 backdrop-blur-xl md:hidden">
        <div className="mx-auto flex max-w-md items-center justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">{product.size} · {product.weightRange}</p>
            <p className="font-medium">{formatCurrency(product.price, locale)}</p>
          </div>
          <AddToCartButton productId={product.id} variant="bronze" className="shrink-0" />
        </div>
      </div>
    </>
  );
}

function ReviewForm({
  productId,
  locale,
}: {
  productId: string;
  locale: Locale;
}) {
  const t = useTranslations("product");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [userLoaded, setUserLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/me")
      .then((response) => response.json())
      .then((data: { user: SessionUser | null }) => {
        if (active) setUser(data.user);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setUserLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  if (!userLoaded) {
    return null;
  }

  if (!user) {
    return (
      <div className="rounded-lg border border-border bg-card/65 p-5 text-sm text-muted-foreground">
        {t("reviewLoginRequired")}{" "}
        <Link href={`/${locale}/login`} className="text-foreground underline">
          {locale === "ru" ? "Войти" : "Log in"}
        </Link>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="rounded-lg border border-border bg-card/65 p-5 text-sm text-foreground">
        {t("reviewSubmitted")}
      </div>
    );
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    const response = await csrfFetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, rating, comment: comment || undefined }),
    });
    setSubmitting(false);

    if (!response.ok) {
      setError(locale === "ru" ? "Не удалось отправить отзыв" : "Failed to submit review");
      return;
    }

    setSubmitted(true);
  }

  return (
    <div className="rounded-lg border border-border bg-card/65 p-5">
      <p className="mb-3 text-sm font-medium">{t("leaveReview")}</p>
      <div className="mb-3 flex gap-1">
        {Array.from({ length: 5 }).map((_, index) => {
          const value = index + 1;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setRating(value)}
              className="focus-ring"
              aria-label={String(value)}
            >
              <Star className={cn("h-5 w-5", value <= rating ? "fill-current text-bronze" : "text-border")} />
            </button>
          );
        })}
      </div>
      <Input
        placeholder={t("reviewCommentPlaceholder")}
        value={comment}
        onChange={(event) => setComment(event.target.value)}
      />
      {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
      <Button className="mt-3" size="sm" onClick={handleSubmit} disabled={submitting}>
        {t("reviewSubmit")}
      </Button>
    </div>
  );
}
