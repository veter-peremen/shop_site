"use client";

import { motion } from "framer-motion";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Locale } from "@/i18n/routing";
import { formatCurrency, localizedProductName } from "@/lib/utils";
import { useCommerceStore } from "@/store/commerce-store";
import type { Product } from "@/types/product";

type PromoResult = {
  valid: boolean;
  discount: number;
  reason: "not-found" | "min-subtotal" | "usage-limit" | "usage-limit-per-user" | "not-eligible" | null;
};

export function CartClient({
  products,
  locale,
  bonusMaxSpendShare,
  ndsRate,
}: {
  products: Product[];
  locale: Locale;
  bonusMaxSpendShare: number;
  ndsRate: number;
}) {
  const t = useTranslations("cart");
  const [mounted, setMounted] = useState(false);
  const cart = useCommerceStore((state) => state.cart);
  const cartLoaded = useCommerceStore((state) => state.cartLoaded);
  const promoCode = useCommerceStore((state) => state.promoCode);
  const setPromoCode = useCommerceStore((state) => state.setPromoCode);
  const useBonus = useCommerceStore((state) => state.useBonus);
  const toggleBonus = useCommerceStore((state) => state.toggleBonus);
  const bonusBalance = useCommerceStore((state) => state.bonusBalance);
  const setQuantity = useCommerceStore((state) => state.setQuantity);
  const removeFromCart = useCommerceStore((state) => state.removeFromCart);

  useEffect(() => setMounted(true), []);

  const lines = useMemo(
    () =>
      cart
        .map((item) => {
          const product = products.find((candidate) => candidate.id === item.productId);
          return product ? { ...item, product } : null;
        })
        .filter(Boolean) as Array<{ productId: string; quantity: number; product: Product }>,
    [cart, products],
  );

  const subtotal = lines.reduce((total, item) => total + item.product.price * item.quantity, 0);
  const [promo, setPromo] = useState<PromoResult>({ valid: false, discount: 0, reason: null });

  useEffect(() => {
    if (!promoCode || subtotal === 0) {
      setPromo({ valid: false, discount: 0, reason: null });
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => {
      fetch("/api/promos/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: promoCode, subtotal, productIds: lines.map((line) => line.productId) }),
        signal: controller.signal,
      })
        .then((response) => response.json())
        .then((data: PromoResult) => setPromo(data))
        .catch(() => {});
    }, 350);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [promoCode, subtotal, lines]);

  const bonusDiscount = useBonus ? Math.min(bonusBalance, Math.floor(subtotal * bonusMaxSpendShare)) : 0;
  const total = Math.max(0, subtotal - promo.discount - bonusDiscount);
  const vatAmount = Math.round((total * ndsRate) / (100 + ndsRate));

  if (!mounted || !cartLoaded) {
    return null;
  }

  if (lines.length === 0) {
    return (
      <section className="premium-shell flex min-h-[62vh] items-center justify-center py-16">
        <div className="max-w-lg text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-border bg-card">
            <ShoppingBag className="h-8 w-8 text-bronze" />
          </div>
          <h1 className="mt-8 text-4xl font-light">{t("empty")}</h1>
          <p className="mt-4 leading-7 text-muted-foreground">{t("emptyCopy")}</p>
          <Button asChild className="mt-8">
            <Link href={`/${locale}/catalog`}>{locale === "ru" ? "В каталог" : "Open catalog"}</Link>
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="premium-shell py-12">
      <h1 className="text-5xl font-light">{t("title")}</h1>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_390px]">
        <div className="space-y-4">
          {lines.map(({ product, quantity }) => (
            <motion.div
              key={product.id}
              layout
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-lg border border-border bg-card/65 p-4"
            >
              <div className="grid gap-4 sm:grid-cols-[132px_1fr_auto]">
                <Link
                  href={`/${locale}/product/${product.slug}`}
                  className="relative aspect-square overflow-hidden rounded-lg bg-secondary"
                >
                  {product.images[0] ? (
                    <Image
                      src={product.images[0]}
                      alt={localizedProductName(product, locale)}
                      fill
                      sizes="132px"
                      className="object-contain p-4"
                    />
                  ) : null}
                </Link>
                <div>
                  <p className="text-xs text-muted-foreground">{product.size} · {product.weightRange}</p>
                  <Link href={`/${locale}/product/${product.slug}`}>
                    <h2 className="mt-2 text-xl font-medium">{localizedProductName(product, locale)}</h2>
                  </Link>
                  <p className="mt-3 text-sm text-muted-foreground">
                    +{product.bonusPoints * quantity} {t("bonus")}
                  </p>
                  <div className="mt-5 inline-flex items-center rounded-full border border-border bg-background">
                    <button
                      className="focus-ring flex h-10 w-10 items-center justify-center rounded-full"
                      onClick={() => setQuantity(product.id, quantity - 1)}
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-10 text-center text-sm">{quantity}</span>
                    <button
                      className="focus-ring flex h-10 w-10 items-center justify-center rounded-full"
                      onClick={() => setQuantity(product.id, quantity + 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="flex items-start justify-between gap-4 sm:flex-col sm:items-end">
                  <p className="text-xl font-medium">
                    {formatCurrency(product.price * quantity, locale)}
                  </p>
                  <button
                    onClick={() => removeFromCart(product.id)}
                    className="focus-ring flex h-10 w-10 items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <aside className="h-fit rounded-lg border border-border bg-card/75 p-6 shadow-premium lg:sticky lg:top-28">
          <div className="space-y-5">
            <div>
              <p className="mb-2 text-sm text-muted-foreground">{t("promo")}</p>
              <div className="flex gap-2">
                <Input value={promoCode} onChange={(event) => setPromoCode(event.target.value)} />
                <Button variant="secondary">{t("apply")}</Button>
              </div>
              {promoCode ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  {promo.valid
                    ? formatCurrency(promo.discount, locale)
                    : promo.reason === "min-subtotal"
                      ? t("minPromo")
                      : t("invalidPromo")}
                </p>
              ) : null}
            </div>

            <label className="flex cursor-pointer items-center justify-between rounded-lg border border-border bg-background/70 p-4">
              <span>
                <span className="block text-sm font-medium">{t("useBonus")}</span>
                <span className="text-xs text-muted-foreground">
                  {bonusBalance} {t("bonus")}
                </span>
              </span>
              <input
                type="checkbox"
                checked={useBonus}
                onChange={toggleBonus}
                className="h-5 w-5 accent-[#9b8465]"
              />
            </label>

            <div className="hairline" />

            <SummaryRow label={t("subtotal")} value={formatCurrency(subtotal, locale)} />
            <SummaryRow label={t("shipping")} value={t("shippingPlaceholder")} muted />
            {promo.discount > 0 ? (
              <SummaryRow label={t("discount")} value={`-${formatCurrency(promo.discount, locale)}`} />
            ) : null}
            {bonusDiscount > 0 ? (
              <SummaryRow label={t("bonus")} value={`-${formatCurrency(bonusDiscount, locale)}`} />
            ) : null}

            <div className="flex items-end justify-between pt-2">
              <p className="text-muted-foreground">{t("total")}</p>
              <p className="text-3xl font-medium">{formatCurrency(total, locale)}</p>
            </div>
            {vatAmount > 0 ? (
              <p className="text-right text-xs text-muted-foreground">
                {locale === "ru" ? "в т.ч. НДС" : "incl. VAT"} {ndsRate}%: {formatCurrency(vatAmount, locale)}
              </p>
            ) : null}

            <Button asChild className="w-full" size="lg">
              <Link href={`/${locale}/checkout`}>{t("checkout")}</Link>
            </Button>
          </div>
        </aside>
      </div>
    </section>
  );
}

function SummaryRow({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 text-sm ${muted ? "text-muted-foreground" : ""}`}>
      <span>{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}
