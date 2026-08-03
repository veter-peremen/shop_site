"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "framer-motion";
import { Eye, Heart, ShoppingBag, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/routing";
import {
  cn,
  formatCurrency,
  lineLabel,
  localizedProductName,
  localizedProductShort,
} from "@/lib/utils";
import { useCommerceStore } from "@/store/commerce-store";
import type { Product } from "@/types/product";

export function ProductCard({
  product,
  locale,
  priority = false,
  compact = false,
}: {
  product: Product;
  locale: Locale;
  priority?: boolean;
  compact?: boolean;
}) {
  const t = useTranslations("product");
  const addToCart = useCommerceStore((state) => state.addToCart);
  const toggleWishlist = useCommerceStore((state) => state.toggleWishlist);
  const wishlist = useCommerceStore((state) => state.wishlist);
  const [mounted, setMounted] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const wished = mounted && wishlist.includes(product.id);

  useEffect(() => setMounted(true), []);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 28, scale: 0.985 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -8, rotateX: 1.2, rotateY: -1.2 }}
      className="group lift-card relative"
    >
      <div className="premium-surface rounded-lg">
        <Link href={`/${locale}/product/${product.slug}`} className="block">
          <div
            className={cn(
              "relative m-3 aspect-[4/5] overflow-hidden rounded-lg bg-[linear-gradient(145deg,rgba(255,252,245,0.92),rgba(221,209,189,0.54)_58%,rgba(250,247,240,0.92))] dark:bg-[linear-gradient(145deg,rgba(47,42,37,0.94),rgba(31,28,25,0.98)_58%,rgba(74,61,48,0.54))]",
              compact && "aspect-[5/4]",
            )}
          >
            <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.42),transparent_30%,transparent_70%,rgba(155,132,101,0.16))] dark:bg-[linear-gradient(120deg,rgba(255,255,255,0.08),transparent_30%,transparent_70%,rgba(203,184,146,0.12))]" />
            {product.images[0] ? (
              <Image
                src={product.images[0]}
                alt={localizedProductName(product, locale)}
                fill
                priority={priority}
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                className="object-cover opacity-[0.97] transition duration-1000 group-hover:scale-110"
                style={{ objectPosition: "center bottom" }}
              />
            ) : null}
            <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-background/85 via-background/28 to-transparent" />
            <div className="absolute left-4 top-4 rounded-full border border-white/40 bg-background/70 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur-xl dark:border-white/10">
              {product.size} · {product.weightRange}
            </div>
            <div className="absolute bottom-4 left-4 right-4 translate-y-3 opacity-0 transition duration-500 group-hover:translate-y-0 group-hover:opacity-100">
              <div className="flex items-center justify-between rounded-full border border-white/40 bg-background/80 p-1.5 pl-4 text-xs backdrop-blur-xl dark:border-white/10">
                <span className="text-muted-foreground">
                  {product.count} {locale === "ru" ? "шт" : "pcs"} · +{product.bonusPoints}
                </span>
                <span className="rounded-full bg-primary px-3 py-1.5 text-primary-foreground">
                  {formatCurrency(product.price, locale)}
                </span>
              </div>
            </div>
          </div>
        </Link>

        <div className="relative z-10 space-y-4 p-5 pt-2">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <Badge variant="bronze">{lineLabel(product.line, locale)}</Badge>
              <Link href={`/${locale}/product/${product.slug}`}>
                <h3 className="mt-3 line-clamp-2 text-lg font-medium leading-snug transition group-hover:text-bronze">
                  {localizedProductName(product, locale)}
                </h3>
              </Link>
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
                {localizedProductShort(product, locale)}
              </p>
            </div>
            <button
              onClick={() => toggleWishlist(product.id)}
              className={cn(
                "focus-ring flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-card/70 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-bronze/50 hover:bg-secondary/80",
                wished && "border-bronze/60 bg-bronze/10 text-bronze",
              )}
              aria-label={t("wishlist")}
            >
              <Heart className={cn("h-4 w-4", wished && "fill-current")} />
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-4">
            <div>
              <p className="text-xl font-medium">{formatCurrency(product.price, locale)}</p>
              <p className="text-xs text-muted-foreground">
                +{product.bonusPoints} {t("bonus")}
              </p>
            </div>
            <div className="flex gap-2">
              <Dialog.Root open={previewOpen} onOpenChange={setPreviewOpen}>
                <Dialog.Trigger asChild>
                  <Button variant="icon" size="icon" aria-label={t("preview")}>
                    <Eye className="h-4 w-4" />
                  </Button>
                </Dialog.Trigger>
                <AnimatePresence>
                  {previewOpen ? (
                    <Dialog.Portal forceMount>
                      <Dialog.Overlay asChild>
                        <motion.div
                          className="fixed inset-0 z-50 bg-graphite/45 backdrop-blur-sm"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                        />
                      </Dialog.Overlay>
                      <Dialog.Content asChild>
                        <motion.div
                          className="fixed inset-0 z-50 flex items-center justify-center p-4"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                        >
                          <div className="relative grid max-h-[88vh] w-[min(92vw,920px)] gap-6 overflow-auto rounded-lg border border-border bg-background p-5 shadow-premium md:grid-cols-[0.9fr_1fr]">
                            <Dialog.Title className="sr-only">{localizedProductName(product, locale)}</Dialog.Title>
                            <div className="relative aspect-square rounded-lg bg-secondary">
                              {product.images[0] ? (
                                <Image
                                  src={product.images[0]}
                                  alt={localizedProductName(product, locale)}
                                  fill
                                  sizes="420px"
                                  className="object-contain p-8"
                                />
                              ) : null}
                            </div>
                            <div className="flex flex-col justify-center">
                              <Badge variant="bronze">{product.size} · {product.weightRange}</Badge>
                              <h3 className="mt-4 text-3xl font-light leading-tight">
                                {localizedProductName(product, locale)}
                              </h3>
                              <p className="mt-4 leading-7 text-muted-foreground">
                                {localizedProductShort(product, locale)}
                              </p>
                              <div className="mt-6 flex items-center justify-between border-y border-border py-4">
                                <span className="text-sm text-muted-foreground">
                                  {product.count} {locale === "ru" ? "шт" : "pcs"}
                                </span>
                                <span className="text-2xl font-medium">
                                  {formatCurrency(product.price, locale)}
                                </span>
                              </div>
                              <div className="mt-6 flex gap-3">
                                <Button onClick={() => addToCart(product.id)} className="flex-1">
                                  <ShoppingBag className="h-4 w-4" />
                                  {t("quickAdd")}
                                </Button>
                                <Button asChild variant="secondary">
                                  <Link href={`/${locale}/product/${product.slug}`}>{t("preview")}</Link>
                                </Button>
                              </div>
                            </div>
                            <Dialog.Close asChild>
                              <button className="focus-ring absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card/90">
                                <X className="h-4 w-4" />
                              </button>
                            </Dialog.Close>
                          </div>
                        </motion.div>
                      </Dialog.Content>
                    </Dialog.Portal>
                  ) : null}
                </AnimatePresence>
              </Dialog.Root>
              <Button variant="default" size="icon" onClick={() => addToCart(product.id)}>
                <ShoppingBag className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </motion.article>
  );
}
