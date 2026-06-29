"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/routing";
import { csrfFetch } from "@/lib/csrf-client";
import type { OrderDetail } from "@/lib/orders";
import { formatCurrency } from "@/lib/utils";

import { orderStatusLabel } from "./account-dashboard";

const HAPPY_PATH = ["pending_payment", "paid", "processing", "packed", "shipped", "delivered"];
const PROBLEM_STATUSES = new Set(["cancelled", "refunded", "partially_refunded", "payment_failed"]);
const CUSTOMER_CANCELLABLE_STATUSES = new Set(["pending_payment", "paid", "processing", "packed"]);

export function OrderDetailClient({ locale, order }: { locale: Locale; order: OrderDetail | null }) {
  const t = useTranslations("account");
  const [copied, setCopied] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(order?.status ?? null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [justCancelled, setJustCancelled] = useState(false);

  if (!order) {
    return (
      <section className="premium-shell flex min-h-[50vh] items-center justify-center py-16 text-center">
        <div>
          <p className="text-lg text-muted-foreground">{t("orderNotFound")}</p>
          <Button asChild className="mt-6">
            <Link href={`/${locale}/account`}>{t("orderBack")}</Link>
          </Button>
        </div>
      </section>
    );
  }

  const isProblem = currentStatus ? PROBLEM_STATUSES.has(currentStatus) : false;
  const stepIndex = currentStatus ? HAPPY_PATH.indexOf(currentStatus) : -1;
  const canCancel = currentStatus ? CUSTOMER_CANCELLABLE_STATUSES.has(currentStatus) : false;

  async function handleCopyTracking() {
    if (!order?.trackingNumber) return;
    await navigator.clipboard.writeText(order.trackingNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function handleCancel() {
    if (!window.confirm(t("orderCancelConfirm"))) return;
    setCancelling(true);
    setCancelError(null);

    const response = await csrfFetch(`/api/account/orders/${order!.id}/cancel`, { method: "POST" });
    setCancelling(false);

    if (!response.ok) {
      setCancelError(t("orderCancelError"));
      return;
    }

    setCurrentStatus("cancelled");
    setJustCancelled(true);
  }

  return (
    <section className="premium-shell py-12">
      <Link href={`/${locale}/account`} className="text-sm text-muted-foreground underline">
        {t("orderBack")}
      </Link>

      <div className="mt-4 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-4xl font-light">{order.number}</h1>
        <span className="text-sm text-muted-foreground">
          {new Date(order.createdAt).toLocaleDateString(locale)}
        </span>
      </div>

      <div className="mt-6 rounded-lg border border-border bg-card/65 p-6">
        {isProblem ? (
          <span className="inline-block rounded-full bg-destructive/10 px-3 py-1 text-sm text-destructive">
            {orderStatusLabel(currentStatus!, t)}
          </span>
        ) : (
          <div className="flex flex-wrap gap-2">
            {HAPPY_PATH.map((step, index) => (
              <span
                key={step}
                className={`rounded-full px-3 py-1 text-xs ${
                  index <= stepIndex ? "bg-bronze/15 text-bronze" : "bg-secondary text-muted-foreground"
                }`}
              >
                {orderStatusLabel(step, t)}
              </span>
            ))}
          </div>
        )}

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">{t("orderPaymentStatus")}</p>
            <p className="mt-1">{paymentStatusLabel(order.paymentStatus, t)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t("orderTracking")}</p>
            {order.trackingNumber ? (
              <button onClick={handleCopyTracking} className="mt-1 block underline">
                {copied ? "✓" : order.trackingNumber}
              </button>
            ) : (
              <p className="mt-1 text-muted-foreground">{t("orderNoTracking")}</p>
            )}
          </div>
          {order.city || order.deliveryAddress || order.deliveryPickupPoint ? (
            <div className="sm:col-span-2">
              <p className="text-xs text-muted-foreground">{t("orderDeliveryAddress")}</p>
              <p className="mt-1">
                {[order.city, order.deliveryAddress || order.deliveryPickupPoint].filter(Boolean).join(", ")}
              </p>
            </div>
          ) : null}
          {order.comment ? (
            <div className="sm:col-span-2">
              <p className="text-xs text-muted-foreground">{t("orderComment")}</p>
              <p className="mt-1">{order.comment}</p>
            </div>
          ) : null}
        </div>

        {canCancel ? (
          <div className="mt-5 border-t border-border pt-5">
            {cancelError ? <p className="mb-2 text-sm text-destructive">{cancelError}</p> : null}
            <Button variant="secondary" onClick={handleCancel} disabled={cancelling}>
              {t("orderCancel")}
            </Button>
          </div>
        ) : null}
        {justCancelled ? (
          <p className="mt-3 text-sm text-muted-foreground">{t("orderCancelSuccess")}</p>
        ) : null}
      </div>

      <div className="mt-6 rounded-lg border border-border bg-card/65 p-6">
        <h2 className="mb-4 text-lg font-medium">{t("orderItems")}</h2>
        <div className="space-y-3 text-sm">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between gap-4">
              <span>
                {locale === "en" && item.nameEn ? item.nameEn : item.nameRu} × {item.quantity}
              </span>
              <span>{formatCurrency(item.price * item.quantity, locale)}</span>
            </div>
          ))}
        </div>

        <div className="mt-5 space-y-1 border-t border-border pt-4 text-sm">
          <SummaryRow label={t("orderSubtotal")} value={formatCurrency(order.subtotal, locale)} />
          {order.discount > 0 ? (
            <SummaryRow label={t("orderDiscount")} value={`-${formatCurrency(order.discount, locale)}`} />
          ) : null}
          {order.bonusSpent > 0 ? (
            <SummaryRow label={t("orderBonusSpent")} value={`-${formatCurrency(order.bonusSpent, locale)}`} />
          ) : null}
          <SummaryRow label={t("orderDelivery")} value={formatCurrency(order.deliveryPrice, locale)} />
          <SummaryRow label={t("orderTotal")} value={formatCurrency(order.total, locale)} bold />
        </div>
      </div>
    </section>
  );
}

function paymentStatusLabel(status: string, t: (key: string) => string): string {
  if (status === "paid") return t("paymentPaid");
  if (status === "refunded") return t("paymentRefunded");
  return t("paymentUnpaid");
}

function SummaryRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 ${bold ? "text-base font-medium" : "text-muted-foreground"}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
