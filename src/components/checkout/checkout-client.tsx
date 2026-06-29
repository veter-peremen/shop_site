"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Locale } from "@/i18n/routing";
import type { SessionUser } from "@/lib/auth";
import { csrfFetch } from "@/lib/csrf-client";
import { formatCurrency, localizedProductName } from "@/lib/utils";
import { useCommerceStore } from "@/store/commerce-store";
import type { Product } from "@/types/product";

type Step = "contacts" | "delivery" | "confirm" | "success";

type DeliveryMethod = "pickup" | "courier";

type FormState = {
  name: string;
  phone: string;
  email: string;
  comment: string;
  city: string;
  deliveryMethod: DeliveryMethod;
  address: string;
  pickupPoint: string;
};

const STORAGE_KEY = "sonkei-checkout-form";

const DELIVERY_PRICES: Record<DeliveryMethod, number> = {
  pickup: 0,
  courier: 300,
};

function loadStoredForm(defaults: FormState): FormState {
  if (typeof window === "undefined") return defaults;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return defaults;
  }
}

export function CheckoutClient({
  products,
  locale,
  user,
  bonusMaxSpendShare,
  ndsRate,
}: {
  products: Product[];
  locale: Locale;
  user: SessionUser | null;
  bonusMaxSpendShare: number;
  ndsRate: number;
}) {
  const t = useTranslations("checkout");
  const router = useRouter();
  const cart = useCommerceStore((state) => state.cart);
  const cartLoaded = useCommerceStore((state) => state.cartLoaded);
  const promoCode = useCommerceStore((state) => state.promoCode);
  const useBonusToggle = useCommerceStore((state) => state.useBonus);
  const clearCart = useCommerceStore((state) => state.clearCart);

  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<Step>("contacts");
  const [form, setForm] = useState<FormState>(() =>
    loadStoredForm({
      name: user?.name ?? "",
      phone: user?.phone ?? "",
      email: user?.email ?? "",
      comment: "",
      city: "",
      deliveryMethod: "pickup",
      address: "",
      pickupPoint: "",
    }),
  );
  const [bonusBalance, setBonusBalance] = useState(0);
  const [promoResult, setPromoResult] = useState<{ valid: boolean; discount: number } | null>(null);
  const [agreeOffer, setAgreeOffer] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(form));
  }, [form]);

  useEffect(() => {
    if (!user) return;
    fetch("/api/account/bonuses")
      .then((res) => res.json())
      .then((data) => setBonusBalance(data.account?.balanceActive ?? 0))
      .catch(() => {});
  }, [user]);

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

  const subtotal = lines.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const deliveryPrice = DELIVERY_PRICES[form.deliveryMethod];

  useEffect(() => {
    if (!promoCode || subtotal === 0) {
      setPromoResult(null);
      return;
    }
    const timeout = setTimeout(() => {
      fetch("/api/promos/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: promoCode, subtotal, productIds: lines.map((line) => line.productId) }),
      })
        .then((res) => res.json())
        .then((data) => setPromoResult(data))
        .catch(() => {});
    }, 300);
    return () => clearTimeout(timeout);
  }, [promoCode, subtotal, lines]);

  const discount = promoResult?.valid ? promoResult.discount : 0;
  const afterDiscount = Math.max(0, subtotal - discount);
  const bonusCap = Math.floor(afterDiscount * bonusMaxSpendShare);
  const bonusSpent = useBonusToggle && user ? Math.min(bonusBalance, bonusCap) : 0;
  const bonusEarned = lines.reduce((sum, item) => sum + item.product.bonusPoints * item.quantity, 0);
  const total = Math.max(0, afterDiscount - bonusSpent) + deliveryPrice;
  const vatAmount = Math.round((total * ndsRate) / (100 + ndsRate));

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function goToDelivery() {
    if (!form.name.trim() || !form.phone.trim() || !form.email.trim()) {
      setError(t("errorRequired"));
      return;
    }
    setError(null);
    setStep("delivery");
  }

  function goToConfirm() {
    if (!form.city.trim()) {
      setError(t("errorRequired"));
      return;
    }
    if (form.deliveryMethod === "courier" && !form.address.trim()) {
      setError(t("errorRequired"));
      return;
    }
    if (form.deliveryMethod === "pickup" && !form.pickupPoint.trim()) {
      setError(t("errorRequired"));
      return;
    }
    setError(null);
    setStep("confirm");
  }

  async function handleSubmit() {
    if (!agreeOffer || !agreePrivacy) {
      setError(t("errorAgreement"));
      return;
    }

    setError(null);
    setSubmitting(true);

    const response = await csrfFetch("/api/checkout/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: lines.map((line) => ({ productId: line.productId, quantity: line.quantity })),
        customer: {
          name: form.name,
          phone: form.phone,
          email: form.email,
          comment: form.comment || undefined,
        },
        delivery: {
          city: form.city,
          method: form.deliveryMethod,
          address: form.deliveryMethod === "courier" ? form.address : undefined,
          pickupPoint: form.deliveryMethod === "pickup" ? form.pickupPoint : undefined,
          price: deliveryPrice,
        },
        promoCode: promoCode || undefined,
        bonusSpent,
      }),
    });

    setSubmitting(false);

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.error === "empty-cart" ? t("errorEmptyCart") : t("errorUnavailable"));
      return;
    }

    const data = await response.json();
    window.sessionStorage.removeItem(STORAGE_KEY);
    clearCart();
    setOrderNumber(data.order.number);
    setStep("success");
  }

  if (!mounted || !cartLoaded) return null;

  if (lines.length === 0 && step !== "success") {
    return (
      <section className="premium-shell flex min-h-[50vh] items-center justify-center py-16 text-center">
        <div>
          <p className="text-lg text-muted-foreground">{t("errorEmptyCart")}</p>
          <Button asChild className="mt-6">
            <Link href={`/${locale}/catalog`}>{t("backToCatalog")}</Link>
          </Button>
        </div>
      </section>
    );
  }

  if (step === "success") {
    return (
      <section className="premium-shell flex min-h-[50vh] items-center justify-center py-16 text-center">
        <div>
          <h1 className="text-4xl font-light">{t("successTitle")}</h1>
          <p className="mt-4 text-muted-foreground">
            {t("successCopy")}: <span className="font-medium text-foreground">{orderNumber}</span>
          </p>
          <Button
            className="mt-8"
            onClick={() => router.push(`/${locale}/catalog`)}
          >
            {t("backToCatalog")}
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="premium-shell py-12">
      <h1 className="text-5xl font-light">{t("title")}</h1>

      <div className="mt-6 flex gap-3 text-sm text-muted-foreground">
        <StepLabel active={step === "contacts"} label={t("stepContacts")} />
        <StepLabel active={step === "delivery"} label={t("stepDelivery")} />
        <StepLabel active={step === "confirm"} label={t("stepConfirm")} />
      </div>

      {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="rounded-lg border border-border bg-card/65 p-6">
          {step === "contacts" ? (
            <div className="space-y-4">
              <Input placeholder={t("name")} value={form.name} onChange={(e) => updateForm("name", e.target.value)} />
              <Input
                placeholder={t("phone")}
                value={form.phone}
                onChange={(e) => updateForm("phone", e.target.value)}
              />
              <Input
                placeholder={t("email")}
                type="email"
                value={form.email}
                onChange={(e) => updateForm("email", e.target.value)}
              />
              <Input
                placeholder={t("comment")}
                value={form.comment}
                onChange={(e) => updateForm("comment", e.target.value)}
              />
              <Button onClick={goToDelivery}>{t("next")}</Button>
            </div>
          ) : null}

          {step === "delivery" ? (
            <div className="space-y-4">
              <Input placeholder={t("city")} value={form.city} onChange={(e) => updateForm("city", e.target.value)} />

              <div>
                <p className="mb-2 text-sm text-muted-foreground">{t("deliveryMethod")}</p>
                <div className="flex gap-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      checked={form.deliveryMethod === "pickup"}
                      onChange={() => updateForm("deliveryMethod", "pickup")}
                    />
                    {t("pickup")} · {formatCurrency(DELIVERY_PRICES.pickup, locale)}
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      checked={form.deliveryMethod === "courier"}
                      onChange={() => updateForm("deliveryMethod", "courier")}
                    />
                    {t("courier")} · {formatCurrency(DELIVERY_PRICES.courier, locale)}
                  </label>
                </div>
              </div>

              {form.deliveryMethod === "courier" ? (
                <Input
                  placeholder={t("address")}
                  value={form.address}
                  onChange={(e) => updateForm("address", e.target.value)}
                />
              ) : (
                <Input
                  placeholder={t("pickupPoint")}
                  value={form.pickupPoint}
                  onChange={(e) => updateForm("pickupPoint", e.target.value)}
                />
              )}

              <p className="text-xs text-muted-foreground">{t("deliveryNote")}</p>

              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setStep("contacts")}>
                  {t("back")}
                </Button>
                <Button onClick={goToConfirm}>{t("next")}</Button>
              </div>
            </div>
          ) : null}

          {step === "confirm" ? (
            <div className="space-y-5">
              <div>
                <h2 className="mb-3 text-lg font-medium">{t("orderSummary")}</h2>
                <div className="space-y-2 text-sm">
                  {lines.map((line) => (
                    <div key={line.productId} className="flex justify-between gap-4">
                      <span>
                        {localizedProductName(line.product, locale)} × {line.quantity}
                      </span>
                      <span>{formatCurrency(line.product.price * line.quantity, locale)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {user ? (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={useBonusToggle}
                    onChange={() => useCommerceStore.getState().toggleBonus()}
                  />
                  {t("useBonus")} ({bonusBalance})
                </label>
              ) : null}

              <div className="space-y-2 text-sm">
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={agreeOffer}
                    onChange={(e) => setAgreeOffer(e.target.checked)}
                    className="mt-1"
                  />
                  <span>
                    {t("agreeOffer")} (
                    <Link href={`/${locale}/offer`} className="underline">
                      {locale === "ru" ? "оферта" : "offer"}
                    </Link>
                    )
                  </span>
                </label>
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={agreePrivacy}
                    onChange={(e) => setAgreePrivacy(e.target.checked)}
                    className="mt-1"
                  />
                  <span>
                    {t("agreePrivacy")} (
                    <Link href={`/${locale}/privacy`} className="underline">
                      {locale === "ru" ? "политика" : "privacy policy"}
                    </Link>
                    )
                  </span>
                </label>
              </div>

              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setStep("delivery")}>
                  {t("back")}
                </Button>
                <Button onClick={handleSubmit} disabled={submitting}>
                  {submitting ? t("submitting") : t("submit")}
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        <aside className="h-fit rounded-lg border border-border bg-card/75 p-6 shadow-premium lg:sticky lg:top-28">
          <SummaryRow label={t("subtotal")} value={formatCurrency(subtotal, locale)} />
          {discount > 0 ? (
            <SummaryRow label={t("discount")} value={`-${formatCurrency(discount, locale)}`} />
          ) : null}
          {bonusSpent > 0 ? (
            <SummaryRow label={t("bonusSpent")} value={`-${formatCurrency(bonusSpent, locale)}`} />
          ) : null}
          <SummaryRow label={t("delivery")} value={formatCurrency(deliveryPrice, locale)} />
          <div className="hairline my-3" />
          <SummaryRow label={t("total")} value={formatCurrency(total, locale)} bold />
          {vatAmount > 0 ? (
            <p className="mt-1 text-right text-xs text-muted-foreground">
              {locale === "ru" ? "в т.ч. НДС" : "incl. VAT"} {ndsRate}%: {formatCurrency(vatAmount, locale)}
            </p>
          ) : null}
          {bonusEarned > 0 ? (
            <p className="mt-3 text-xs text-muted-foreground">
              +{bonusEarned} {t("bonusEarned")}
            </p>
          ) : null}
        </aside>
      </div>
    </section>
  );
}

function StepLabel({ active, label }: { active: boolean; label: string }) {
  return (
    <span className={active ? "font-medium text-foreground" : ""}>{label}</span>
  );
}

function SummaryRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 py-1 text-sm ${bold ? "text-lg font-medium" : ""}`}>
      <span className={bold ? "" : "text-muted-foreground"}>{label}</span>
      <span>{value}</span>
    </div>
  );
}
