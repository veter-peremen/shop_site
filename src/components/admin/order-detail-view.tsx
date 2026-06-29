"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ORDER_STATUSES } from "@/components/admin/admin-dashboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Locale } from "@/i18n/routing";
import { csrfFetch } from "@/lib/csrf-client";
import type { OrderDetail } from "@/lib/orders";
import { formatCurrency } from "@/lib/utils";

const DELIVERY_METHOD_LABELS: Record<string, { ru: string; en: string }> = {
  courier: { ru: "Курьером", en: "Courier" },
  pickup: { ru: "Самовывоз", en: "Pickup" },
  post: { ru: "Почтой", en: "Post" },
};

export function OrderDetailView({
  order,
  locale,
  canManageOrders,
}: {
  order: OrderDetail;
  locale: Locale;
  canManageOrders: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(order.status);
  const [trackingNumber, setTrackingNumber] = useState(order.trackingNumber ?? "");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleStatusChange(nextStatus: string) {
    setError(null);
    setMessage(null);
    const response = await csrfFetch(`/api/admin/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });

    if (!response.ok) {
      setError(locale === "ru" ? "Не удалось обновить статус" : "Failed to update status");
      return;
    }

    setStatus(nextStatus);
    setMessage(locale === "ru" ? "Статус обновлён" : "Status updated");
  }

  async function handleTrackingSave() {
    setError(null);
    setMessage(null);
    const response = await csrfFetch(`/api/admin/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trackingNumber }),
    });

    if (!response.ok) {
      setError(locale === "ru" ? "Не удалось сохранить трек-номер" : "Failed to save tracking number");
      return;
    }

    setMessage(locale === "ru" ? "Трек-номер сохранён" : "Tracking number saved");
  }

  async function handleDeleteOrder() {
    if (!window.confirm(locale === "ru" ? "Удалить заказ безвозвратно?" : "Delete this order permanently?")) {
      return;
    }

    setError(null);
    setDeleting(true);
    const response = await csrfFetch(`/api/admin/orders/${order.id}`, { method: "DELETE" });

    if (!response.ok) {
      setDeleting(false);
      setError(locale === "ru" ? "Не удалось удалить заказ" : "Failed to delete order");
      return;
    }

    router.push(`/${locale}/admin`);
  }

  const deliveryMethodLabel = order.deliveryMethod
    ? DELIVERY_METHOD_LABELS[order.deliveryMethod]?.[locale] ?? order.deliveryMethod
    : null;

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-wide text-muted-foreground">
            {locale === "ru" ? "Заказ" : "Order"}
          </p>
          <h1 className="mt-1 text-3xl font-light">{order.number}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {new Date(order.createdAt).toLocaleString(locale === "ru" ? "ru-RU" : "en-US")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="bronze">{order.status}</Badge>
          <Badge>{order.paymentStatus}</Badge>
          {order.deliveryStatus ? <Badge variant="graphite">{order.deliveryStatus}</Badge> : null}
          {canManageOrders ? (
            <Button variant="secondary" size="sm" disabled={deleting} onClick={handleDeleteOrder}>
              <Trash2 className="h-4 w-4" />
              {locale === "ru" ? "Удалить заказ" : "Delete order"}
            </Button>
          ) : null}
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border border-border bg-card/65 p-5">
          <h2 className="font-medium">{locale === "ru" ? "Покупатель" : "Customer"}</h2>
          <dl className="mt-3 grid gap-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{locale === "ru" ? "Имя" : "Name"}</dt>
              <dd>{order.customerName}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{locale === "ru" ? "Телефон" : "Phone"}</dt>
              <dd>{order.customerPhone ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Email</dt>
              <dd>{order.customerEmail}</dd>
            </div>
          </dl>
          {order.comment ? (
            <div className="mt-4">
              <p className="text-sm text-muted-foreground">
                {locale === "ru" ? "Комментарий клиента" : "Customer comment"}
              </p>
              <p className="mt-1 rounded-md bg-secondary/50 p-3 text-sm">{order.comment}</p>
            </div>
          ) : null}
        </div>

        <div className="rounded-lg border border-border bg-card/65 p-5">
          <h2 className="font-medium">{locale === "ru" ? "Доставка" : "Delivery"}</h2>
          <dl className="mt-3 grid gap-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{locale === "ru" ? "Город" : "City"}</dt>
              <dd>{order.city ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{locale === "ru" ? "Способ" : "Method"}</dt>
              <dd>{deliveryMethodLabel ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{locale === "ru" ? "Адрес" : "Address"}</dt>
              <dd className="text-right">{order.deliveryAddress ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">
                {locale === "ru" ? "Пункт выдачи" : "Pickup point"}
              </dt>
              <dd className="text-right">{order.deliveryPickupPoint ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">
                {locale === "ru" ? "Стоимость доставки" : "Delivery price"}
              </dt>
              <dd>{formatCurrency(order.deliveryPrice, locale)}</dd>
            </div>
            {order.trackingNumber && !canManageOrders ? (
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">
                  {locale === "ru" ? "Трек-номер" : "Tracking number"}
                </dt>
                <dd>{order.trackingNumber}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card/65 p-5">
        <h2 className="font-medium">{locale === "ru" ? "Состав заказа" : "Order items"}</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="py-2 pr-4 font-medium">{locale === "ru" ? "Товар" : "Product"}</th>
                <th className="py-2 pr-4 font-medium">SKU</th>
                <th className="py-2 pr-4 font-medium">{locale === "ru" ? "Цена" : "Price"}</th>
                <th className="py-2 pr-4 font-medium">{locale === "ru" ? "Кол-во" : "Qty"}</th>
                <th className="py-2 pr-4 font-medium">{locale === "ru" ? "Сумма" : "Subtotal"}</th>
                <th className="py-2 pr-4 font-medium">{locale === "ru" ? "Бонусы" : "Bonus"}</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id} className="border-b border-border/60">
                  <td className="py-3 pr-4">{locale === "ru" ? item.nameRu : item.nameEn ?? item.nameRu}</td>
                  <td className="py-3 pr-4 text-muted-foreground">{item.sku ?? "—"}</td>
                  <td className="py-3 pr-4">{formatCurrency(item.price, locale)}</td>
                  <td className="py-3 pr-4">{item.quantity}</td>
                  <td className="py-3 pr-4">{formatCurrency(item.price * item.quantity, locale)}</td>
                  <td className="py-3 pr-4 text-muted-foreground">{item.bonusPoints * item.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border border-border bg-card/65 p-5">
          <h2 className="font-medium">{locale === "ru" ? "Итог" : "Totals"}</h2>
          <dl className="mt-3 grid gap-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{locale === "ru" ? "Подытог" : "Subtotal"}</dt>
              <dd>{formatCurrency(order.subtotal, locale)}</dd>
            </div>
            {order.discount > 0 ? (
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">
                  {locale === "ru" ? "Скидка" : "Discount"}
                  {order.promoCode ? ` (${order.promoCode})` : ""}
                </dt>
                <dd>-{formatCurrency(order.discount, locale)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{locale === "ru" ? "Доставка" : "Delivery"}</dt>
              <dd>{formatCurrency(order.deliveryPrice, locale)}</dd>
            </div>
            {order.bonusSpent > 0 ? (
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">
                  {locale === "ru" ? "Списано бонусов" : "Bonus spent"}
                </dt>
                <dd>-{formatCurrency(order.bonusSpent, locale)}</dd>
              </div>
            ) : null}
            {order.bonusEarned > 0 ? (
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">
                  {locale === "ru" ? "Начислено бонусов" : "Bonus earned"}
                </dt>
                <dd>+{order.bonusEarned}</dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-4 border-t border-border pt-2 font-medium">
              <dt>{locale === "ru" ? "Итого" : "Total"}</dt>
              <dd>{formatCurrency(order.total, locale)}</dd>
            </div>
          </dl>
        </div>

        {canManageOrders ? (
          <div className="rounded-lg border border-border bg-card/65 p-5">
            <h2 className="font-medium">{locale === "ru" ? "Управление" : "Manage"}</h2>
            <div className="mt-3 grid gap-3">
              <label className="grid gap-1 text-sm">
                <span className="text-muted-foreground">{locale === "ru" ? "Статус" : "Status"}</span>
                <select
                  value={status}
                  onChange={(event) => handleStatusChange(event.target.value)}
                  className="h-10 rounded-md border border-border bg-background px-3 text-sm"
                >
                  {ORDER_STATUSES.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-muted-foreground">
                  {locale === "ru" ? "Трек-номер" : "Tracking number"}
                </span>
                <div className="flex gap-2">
                  <Input
                    value={trackingNumber}
                    onChange={(event) => setTrackingNumber(event.target.value)}
                    placeholder={locale === "ru" ? "Трек-номер" : "Tracking number"}
                  />
                  <Button variant="secondary" onClick={handleTrackingSave}>
                    {locale === "ru" ? "Сохранить" : "Save"}
                  </Button>
                </div>
              </label>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
