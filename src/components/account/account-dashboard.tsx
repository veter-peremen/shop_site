"use client";

import { Heart, Settings, Ticket, UserRound, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

import { ProductCard } from "@/components/product/product-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Locale } from "@/i18n/routing";
import type { SessionUser } from "@/lib/auth";
import type { BonusAccount, BonusTransaction } from "@/lib/bonus";
import { csrfFetch } from "@/lib/csrf-client";
import type { UserAddress } from "@/lib/addresses";
import type { OrderSummary } from "@/lib/orders";
import type { PromoCode } from "@/lib/promos";
import type { StoreSettings } from "@/lib/settings";
import type { NotificationPreferences } from "@/lib/users";
import { formatCurrency } from "@/lib/utils";
import { useCommerceStore } from "@/store/commerce-store";
import type { Product } from "@/types/product";

const ORDER_STATUS_KEYS: Record<string, string> = {
  draft: "statusDraft",
  pending_payment: "statusPendingPayment",
  paid: "statusPaid",
  payment_failed: "statusPaymentFailed",
  processing: "statusProcessing",
  packed: "statusPacked",
  shipped: "statusShipped",
  delivered: "statusDelivered",
  cancelled: "statusCancelled",
  refunded: "statusRefunded",
  partially_refunded: "statusPartiallyRefunded",
};

export function orderStatusLabel(status: string, t: (key: string) => string): string {
  const key = ORDER_STATUS_KEYS[status];
  return key ? t(key) : status;
}

export function AccountDashboard({
  products,
  promoCodes,
  locale,
  user,
  bonusAccount,
  orders,
  bonusTransactions,
  addresses,
  bonusLoyaltyRates,
  notificationPreferences,
}: {
  products: Product[];
  promoCodes: PromoCode[];
  locale: Locale;
  user: SessionUser;
  bonusAccount: BonusAccount | null;
  orders: OrderSummary[];
  bonusTransactions: BonusTransaction[];
  addresses: UserAddress[];
  bonusLoyaltyRates: StoreSettings["bonusLoyaltyRates"];
  notificationPreferences: NotificationPreferences;
}) {
  const t = useTranslations("account");
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const wishlist = useCommerceStore((state) => state.wishlist);
  const localBonusBalance = useCommerceStore((state) => state.bonusBalance);
  const bonusBalance = bonusAccount ? bonusAccount.balanceActive : localBonusBalance;
  const favoriteProducts = useMemo(
    () => products.filter((product) => wishlist.includes(product.id)),
    [products, wishlist],
  );
  const [notifications, setNotifications] = useState(notificationPreferences);

  useEffect(() => setMounted(true), []);

  async function handleNotificationToggle(key: keyof NotificationPreferences) {
    const next = { ...notifications, [key]: !notifications[key] };
    setNotifications(next);

    const response = await csrfFetch("/api/account/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: next[key] }),
    });

    if (!response.ok) {
      setNotifications(notifications);
    }
  }

  async function handleLogout() {
    await csrfFetch("/api/auth/logout", { method: "POST" });
    await Promise.all([
      useCommerceStore.getState().loadCart(),
      useCommerceStore.getState().loadWishlist(),
      useCommerceStore.getState().loadBonusBalance(),
    ]);
    router.refresh();
  }

  return (
    <section className="premium-shell py-12">
      <div className="max-w-3xl">
        <h1 className="text-5xl font-light leading-tight sm:text-6xl">{t("title")}</h1>
        <p className="mt-5 text-lg leading-8 text-muted-foreground">{t("copy")}</p>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[330px_1fr]">
        <aside className="h-fit rounded-lg border border-border bg-card/75 p-6 shadow-premium lg:sticky lg:top-28">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-bronze/30 bg-bronze/10">
              <UserRound className="h-6 w-6 text-bronze" />
            </div>
            <div>
              <p className="font-medium">{user.name || user.email}</p>
              <p className="text-sm capitalize text-muted-foreground">
                {bonusAccount?.loyaltyLevel ?? "silk"}
              </p>
            </div>
          </div>
          <div className="mt-6 rounded-lg border border-border bg-background/70 p-5">
            <p className="text-sm text-muted-foreground">{t("bonus")}</p>
            <p className="mt-2 text-4xl font-light">{bonusBalance}</p>
            <div className="mt-4 h-2 rounded-full bg-secondary">
              <div className="h-2 w-2/3 rounded-full bg-bronze" />
            </div>
          </div>
        </aside>

        <Tabs defaultValue="profile">
          <TabsList className="flex-wrap justify-start">
            <TabsTrigger value="profile">{t("profile")}</TabsTrigger>
            <TabsTrigger value="orders">{t("orders")}</TabsTrigger>
            <TabsTrigger value="addresses">{t("addresses")}</TabsTrigger>
            <TabsTrigger value="bonus">{t("bonus")}</TabsTrigger>
            <TabsTrigger value="favorites">{t("favorites")}</TabsTrigger>
            <TabsTrigger value="settings">{t("settings")}</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <div className="grid gap-5 md:grid-cols-2">
              <Panel icon={UserRound} title={t("profile")}>
                <div className="space-y-2 text-sm">
                  <p>
                    <span className="text-muted-foreground">{t("email")}: </span>
                    {user.email}
                  </p>
                  {user.name ? (
                    <p>
                      <span className="text-muted-foreground">
                        {locale === "ru" ? "Имя" : "Name"}:{" "}
                      </span>
                      {user.name}
                    </p>
                  ) : null}
                  {user.phone ? (
                    <p>
                      <span className="text-muted-foreground">
                        {locale === "ru" ? "Телефон" : "Phone"}:{" "}
                      </span>
                      {user.phone}
                    </p>
                  ) : null}
                </div>
                {!user.emailVerifiedAt ? <EmailVerificationNotice locale={locale} t={t} /> : null}
                <Button variant="secondary" className="mt-5 w-full" onClick={handleLogout}>
                  {locale === "ru" ? "Выйти" : "Log out"}
                </Button>
              </Panel>
            </div>
          </TabsContent>

          <TabsContent value="orders">
            {orders.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {locale === "ru" ? "У вас пока нет заказов." : "You don't have any orders yet."}
              </p>
            ) : (
              <div className="grid gap-4">
                {orders.map((order) => (
                  <Link
                    key={order.id}
                    href={`/${locale}/account/orders/${order.id}`}
                    className="grid gap-4 rounded-lg border border-border bg-card/65 p-4 transition hover:border-bronze/40 sm:grid-cols-[1fr_auto]"
                  >
                    <div>
                      <p className="text-xs text-muted-foreground">{order.number}</p>
                      <h3 className="mt-1 font-medium">{orderStatusLabel(order.status, t)}</h3>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString(locale)}
                        {order.trackingNumber ? ` · ${order.trackingNumber}` : ""}
                      </p>
                    </div>
                    <p className="text-right font-medium">{formatCurrency(order.total, locale)}</p>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="addresses">
            <AddressesPanel t={t} initialAddresses={addresses} />
          </TabsContent>

          <TabsContent value="bonus">
            <div className="grid gap-4 md:grid-cols-3">
              {["silk", "calm", "sora"].map((tier) => (
                <div
                  key={tier}
                  className={`rounded-lg border p-6 capitalize ${
                    bonusAccount?.loyaltyLevel === tier
                      ? "border-bronze bg-bronze/10"
                      : "border-border bg-card/65"
                  }`}
                >
                  <p className="text-xl font-medium">{tier}</p>
                  <p className="mt-4 text-4xl font-light">
                    {bonusLoyaltyRates[tier as keyof typeof bonusLoyaltyRates]}%
                  </p>
                  <p className="mt-4 text-sm leading-6 text-muted-foreground">
                    {locale === "ru" ? "Начисление баллов за покупки SONKEI." : "Reward accrual on SONKEI purchases."}
                  </p>
                </div>
              ))}
            </div>

            {bonusAccount ? (
              <p className="mt-5 text-sm text-muted-foreground">
                {locale === "ru" ? "Ожидают активации" : "Pending activation"}: {bonusAccount.balancePending}
              </p>
            ) : null}

            <div className="mt-6 rounded-lg border border-border bg-card/65 p-5">
              <h3 className="mb-4 text-lg font-medium">
                {locale === "ru" ? "История операций" : "Operations history"}
              </h3>
              {bonusTransactions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {locale === "ru" ? "Операций пока нет." : "No operations yet."}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[480px] text-left text-sm">
                    <thead className="border-b border-border text-muted-foreground">
                      <tr>
                        <th className="py-2 pr-4 font-medium">{locale === "ru" ? "Заказ" : "Order"}</th>
                        <th className="py-2 pr-4 font-medium">{locale === "ru" ? "Тип" : "Type"}</th>
                        <th className="py-2 pr-4 font-medium">{locale === "ru" ? "Сумма" : "Amount"}</th>
                        <th className="py-2 pr-4 font-medium">{locale === "ru" ? "Статус" : "Status"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bonusTransactions.map((tx) => (
                        <tr key={tx.id} className="border-b border-border/70 last:border-0">
                          <td className="py-3 pr-4 text-muted-foreground">{tx.orderNumber ?? "—"}</td>
                          <td className="py-3 pr-4">{tx.type}</td>
                          <td className="py-3 pr-4">{tx.amount}</td>
                          <td className="py-3 pr-4">{tx.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="favorites">
            {mounted && favoriteProducts.length > 0 ? (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {favoriteProducts.map((product) => (
                  <ProductCard key={product.id} product={product} locale={locale} compact />
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-border bg-card/65 p-10 text-center">
                <Heart className="mx-auto h-7 w-7 text-bronze" />
                <p className="mt-4 text-muted-foreground">
                  {locale === "ru" ? "Избранное пока пустое." : "Wishlist is empty."}
                </p>
                <Button asChild className="mt-6" variant="secondary">
                  <Link href={`/${locale}/catalog`}>{locale === "ru" ? "Выбрать товары" : "Choose products"}</Link>
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="settings">
            <div className="grid gap-5 md:grid-cols-2">
              <Panel icon={Settings} title={t("settings")}>
                <label className="flex items-center justify-between rounded-lg border border-border bg-background/70 p-4">
                  <span>{locale === "ru" ? "Email-уведомления" : "Email notifications"}</span>
                  <input
                    type="checkbox"
                    checked={notifications.emailNotificationsEnabled}
                    onChange={() => handleNotificationToggle("emailNotificationsEnabled")}
                    className="h-5 w-5 accent-[#9b8465]"
                  />
                </label>
                <label className="mt-3 flex items-center justify-between rounded-lg border border-border bg-background/70 p-4">
                  <span>{locale === "ru" ? "Telegram-уведомления" : "Telegram notifications"}</span>
                  <input
                    type="checkbox"
                    checked={notifications.telegramNotificationsEnabled}
                    onChange={() => handleNotificationToggle("telegramNotificationsEnabled")}
                    className="h-5 w-5 accent-[#9b8465]"
                  />
                </label>
              </Panel>
              <Panel icon={Ticket} title={locale === "ru" ? "Промокоды" : "Promo codes"}>
                <div className="space-y-3">
                  {promoCodes.map((promo) => (
                    <div key={promo.code} className="rounded-lg border border-border bg-background/70 p-4">
                      <p className="font-medium">{promo.code}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {promo.discountType === "percent"
                          ? `${promo.value}%`
                          : formatCurrency(promo.value, locale)}
                      </p>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}

function AddressesPanel({
  t,
  initialAddresses,
}: {
  t: (key: string) => string;
  initialAddresses: UserAddress[];
}) {
  const [addresses, setAddresses] = useState<UserAddress[]>(initialAddresses);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ city: "", address: "", pickupPointCode: "", comment: "" });
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    setSaving(true);
    const response = await csrfFetch("/api/account/addresses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        city: form.city || undefined,
        address: form.address || undefined,
        pickupPointCode: form.pickupPointCode || undefined,
        comment: form.comment || undefined,
        isDefault: addresses.length === 0,
      }),
    });
    setSaving(false);

    if (response.ok) {
      const data = await response.json();
      setAddresses((current) => [data.address, ...current]);
      setForm({ city: "", address: "", pickupPointCode: "", comment: "" });
      setShowForm(false);
    }
  }

  async function handleDelete(id: string) {
    const response = await csrfFetch(`/api/account/addresses/${id}`, { method: "DELETE" });
    if (response.ok) {
      setAddresses((current) => current.filter((item) => item.id !== id));
    }
  }

  async function handleSetDefault(id: string) {
    const response = await csrfFetch(`/api/account/addresses/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDefault: true }),
    });
    if (response.ok) {
      setAddresses((current) => current.map((item) => ({ ...item, isDefault: item.id === id })));
    }
  }

  return (
    <div className="space-y-4">
      {addresses.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("addressEmpty")}</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {addresses.map((item) => (
            <div key={item.id} className="rounded-lg border border-border bg-card/65 p-4 text-sm">
              {item.isDefault ? (
                <span className="mb-2 inline-block rounded-full bg-bronze/15 px-2 py-0.5 text-xs text-bronze">
                  {t("addressDefault")}
                </span>
              ) : null}
              {item.city ? <p>{item.city}</p> : null}
              {item.address ? <p className="text-muted-foreground">{item.address}</p> : null}
              {item.pickupPointCode ? (
                <p className="text-muted-foreground">
                  {t("addressPickupPoint")}: {item.pickupPointCode}
                </p>
              ) : null}
              {item.comment ? <p className="text-muted-foreground">{item.comment}</p> : null}
              <div className="mt-3 flex gap-2">
                {!item.isDefault ? (
                  <Button variant="secondary" size="sm" onClick={() => handleSetDefault(item.id)}>
                    {t("addressSetDefault")}
                  </Button>
                ) : null}
                <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)}>
                  {t("addressDelete")}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm ? (
        <div className="rounded-lg border border-border bg-card/65 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              placeholder={t("addressCity")}
              value={form.city}
              onChange={(e) => setForm((current) => ({ ...current, city: e.target.value }))}
            />
            <Input
              placeholder={t("addressStreet")}
              value={form.address}
              onChange={(e) => setForm((current) => ({ ...current, address: e.target.value }))}
            />
            <Input
              placeholder={t("addressPickupPoint")}
              value={form.pickupPointCode}
              onChange={(e) => setForm((current) => ({ ...current, pickupPointCode: e.target.value }))}
            />
            <Input
              placeholder={t("addressComment")}
              value={form.comment}
              onChange={(e) => setForm((current) => ({ ...current, comment: e.target.value }))}
            />
          </div>
          <div className="mt-3 flex gap-2">
            <Button onClick={handleAdd} disabled={saving}>
              {t("addressSave")}
            </Button>
            <Button variant="secondary" onClick={() => setShowForm(false)}>
              {t("cancel")}
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="secondary" onClick={() => setShowForm(true)}>
          {t("addressAdd")}
        </Button>
      )}
    </div>
  );
}

function EmailVerificationNotice({ locale, t }: { locale: Locale; t: (key: string) => string }) {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleResend() {
    setLoading(true);
    await csrfFetch("/api/auth/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale }),
    });
    setLoading(false);
    setSent(true);
  }

  return (
    <div className="mt-4 rounded-lg border border-bronze/30 bg-bronze/10 p-4 text-sm">
      <p className="font-medium text-bronze">{t("emailNotVerified")}</p>
      {sent ? (
        <p className="mt-2 text-muted-foreground">{t("verificationSent")}</p>
      ) : (
        <Button variant="secondary" size="sm" className="mt-3" onClick={handleResend} disabled={loading}>
          {t("resendVerification")}
        </Button>
      )}
    </div>
  );
}

function Panel({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-card/65 p-6">
      <div className="mb-5 flex items-center gap-3">
        <Icon className="h-5 w-5 text-bronze" />
        <h2 className="text-xl font-medium">{title}</h2>
      </div>
      {children}
    </div>
  );
}
