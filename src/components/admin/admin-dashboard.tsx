"use client";

import {
  BarChart3,
  Boxes,
  Check,
  Download,
  Gift,
  ImagePlus,
  Plus,
  Star,
  Ticket,
  Trash2,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Fragment, useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Locale } from "@/i18n/routing";
import type { AdminProduct } from "@/lib/admin-products";
import type { AuditLogEntry } from "@/lib/audit";
import type { BonusTransaction } from "@/lib/bonus";
import { csrfFetch } from "@/lib/csrf-client";
import { ProductFormModal } from "@/components/admin/product-form-modal";
import type { OrderSummary } from "@/lib/orders";
import type { PromoCode } from "@/lib/promos";
import type { SalesReport } from "@/lib/reports";
import type { Review } from "@/lib/reviews";
import type { StoreSettings } from "@/lib/settings";
import { formatCurrency, localizedProductName } from "@/lib/utils";
import type { AdminUserRow } from "@/lib/users";


export const ORDER_STATUSES = [
  "draft",
  "pending_payment",
  "paid",
  "payment_failed",
  "processing",
  "packed",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
  "partially_refunded",
];

const USER_ROLES = ["customer", "admin", "manager", "content", "support"];
const LOYALTY_LEVELS = ["silk", "calm", "sora"];

export function AdminDashboard({
  products,
  promoCodes,
  orders,
  bonusTransactions,
  users,
  auditLogs,
  reviews,
  initialReport,
  initialSettings,
  locale,
  currentRole,
  canManageOrders,
}: {
  products: AdminProduct[];
  promoCodes: PromoCode[];
  orders: OrderSummary[];
  bonusTransactions: BonusTransaction[];
  users: AdminUserRow[];
  auditLogs: AuditLogEntry[];
  reviews: Review[];
  initialReport: SalesReport;
  initialSettings: StoreSettings;
  locale: Locale;
  currentRole: string;
  canManageOrders: boolean;
}) {
  const t = useTranslations("admin");
  const canManageUsers = currentRole === "admin";
  const canManageProducts = currentRole === "admin" || currentRole === "content";
  const [draftProducts, setDraftProducts] = useState<AdminProduct[]>(products);
  const [productError, setProductError] = useState<string | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [modalState, setModalState] = useState<
    { mode: "create" } | { mode: "edit"; product: AdminProduct } | null
  >(null);
  const [uploadingImageId, setUploadingImageId] = useState<string | null>(null);

  async function uploadProductImage(id: string, file: File) {
    const formData = new FormData();
    formData.append("file", file);
    const response = await csrfFetch(`/api/admin/products/${id}/images`, {
      method: "POST",
      body: formData,
    });
    if (!response.ok) {
      throw new Error("upload-failed");
    }
    const data = await response.json();
    setDraftProducts((current) => current.map((p) => (p.id === id ? data.product : p)));
    return data.product;
  }

  async function handleRemoveProductImage(id: string, url: string) {
    const response = await csrfFetch(`/api/admin/products/${id}/images`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    if (!response.ok) {
      setProductError(locale === "ru" ? "Не удалось удалить изображение" : "Failed to remove image");
      return;
    }
    const data = await response.json();
    setDraftProducts((current) => current.map((p) => (p.id === id ? data.product : p)));
  }
  function handleProductSaved(saved: AdminProduct) {
    setDraftProducts((current) => {
      const idx = current.findIndex((p) => p.id === saved.id);
      if (idx >= 0) {
        const next = [...current];
        next[idx] = saved;
        return next;
      }
      return [saved, ...current];
    });
  }
  const [expandedSeoId, setExpandedSeoId] = useState<string | null>(null);
  const [seoDraft, setSeoDraft] = useState<Record<string, { seoTitle: string; seoDescription: string }>>({});

  async function patchProduct(id: string, payload: Record<string, unknown>) {
    setProductError(null);
    const response = await csrfFetch(`/api/admin/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      setProductError(locale === "ru" ? "Не удалось сохранить изменения" : "Failed to save changes");
      return;
    }

    const data = await response.json();
    setDraftProducts((current) => current.map((p) => (p.id === id ? data.product : p)));
  }

  async function handleDeleteProduct(productId: string) {
    if (!window.confirm(locale === "ru" ? "Удалить товар?" : "Delete this product?")) return;

    setProductError(null);
    const response = await csrfFetch(`/api/admin/products/${productId}`, { method: "DELETE" });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setProductError(
        data?.error === "has-orders"
          ? locale === "ru"
            ? "Нельзя удалить: товар есть в заказах. Деактивируйте его вместо удаления."
            : "Cannot delete: product appears in existing orders. Deactivate it instead."
          : locale === "ru"
            ? "Не удалось удалить товар"
            : "Failed to delete product",
      );
      return;
    }

    setDraftProducts((current) => current.filter((product) => product.id !== productId));
  }
  const [draftOrders, setDraftOrders] = useState<OrderSummary[]>(orders);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [draftUsers, setDraftUsers] = useState<AdminUserRow[]>(users);
  const [userError, setUserError] = useState<string | null>(null);
  const [bonusComment, setBonusComment] = useState<Record<string, string>>({});
  const [bonusAmount, setBonusAmount] = useState<Record<string, string>>({});
  const [draftPromoCodes, setDraftPromoCodes] = useState<PromoCode[]>(promoCodes);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [newPromo, setNewPromo] = useState({
    code: "",
    value: "",
    minSubtotal: "",
    usageLimit: "",
    usageLimitPerUser: "",
    combinableWithBonuses: true,
    allowedCategories: "",
    startsAt: "",
    endsAt: "",
  });
  const [draftReviews, setDraftReviews] = useState<Review[]>(reviews);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [report, setReport] = useState<SalesReport>(initialReport);
  const [reportRange, setReportRange] = useState({ from: initialReport.from, to: initialReport.to });
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const canManageSettings = currentRole === "admin";
  const [settingsForm, setSettingsForm] = useState({
    silk: String(initialSettings.bonusLoyaltyRates.silk),
    calm: String(initialSettings.bonusLoyaltyRates.calm),
    sora: String(initialSettings.bonusLoyaltyRates.sora),
    calmThreshold: String(initialSettings.loyaltyThresholds.calm),
    soraThreshold: String(initialSettings.loyaltyThresholds.sora),
    maxSpendSharePercent: String(Math.round(initialSettings.bonusMaxSpendShare * 100)),
    expiryDays: String(initialSettings.bonusExpiryDays),
    pendingFallbackDays: String(initialSettings.bonusPendingFallbackDays),
    ndsRate: String(initialSettings.ndsRate),
  });
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  async function handleSaveSettings() {
    setSettingsError(null);
    setSettingsMessage(null);

    const silk = Number(settingsForm.silk);
    const calm = Number(settingsForm.calm);
    const sora = Number(settingsForm.sora);
    const calmThreshold = Number(settingsForm.calmThreshold);
    const soraThreshold = Number(settingsForm.soraThreshold);
    const maxSpendShare = Number(settingsForm.maxSpendSharePercent) / 100;
    const expiryDays = Number(settingsForm.expiryDays);
    const pendingFallbackDays = Number(settingsForm.pendingFallbackDays);
    const ndsRate = Number(settingsForm.ndsRate);

    if (
      [silk, calm, sora, calmThreshold, soraThreshold, maxSpendShare, expiryDays, pendingFallbackDays, ndsRate].some(
        (value) => !Number.isFinite(value) || value < 0,
      )
    ) {
      setSettingsError(locale === "ru" ? "Проверьте введённые значения" : "Check the entered values");
      return;
    }

    const response = await csrfFetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bonusLoyaltyRates: { silk, calm, sora },
        loyaltyThresholds: { calm: Math.trunc(calmThreshold), sora: Math.trunc(soraThreshold) },
        bonusMaxSpendShare: maxSpendShare,
        bonusExpiryDays: Math.trunc(expiryDays),
        bonusPendingFallbackDays: Math.trunc(pendingFallbackDays),
        ndsRate,
      }),
    });

    if (!response.ok) {
      setSettingsError(locale === "ru" ? "Не удалось сохранить настройки" : "Failed to save settings");
      return;
    }

    const data: { settings: StoreSettings } = await response.json();
    setSettingsForm({
      silk: String(data.settings.bonusLoyaltyRates.silk),
      calm: String(data.settings.bonusLoyaltyRates.calm),
      sora: String(data.settings.bonusLoyaltyRates.sora),
      calmThreshold: String(data.settings.loyaltyThresholds.calm),
      soraThreshold: String(data.settings.loyaltyThresholds.sora),
      maxSpendSharePercent: String(Math.round(data.settings.bonusMaxSpendShare * 100)),
      expiryDays: String(data.settings.bonusExpiryDays),
      pendingFallbackDays: String(data.settings.bonusPendingFallbackDays),
      ndsRate: String(data.settings.ndsRate),
    });
    setSettingsMessage(locale === "ru" ? "Настройки сохранены" : "Settings saved");
  }

  async function handleStatusChange(orderId: string, status: string) {
    setOrderError(null);
    const response = await csrfFetch(`/api/admin/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      setOrderError(locale === "ru" ? "Не удалось обновить статус" : "Failed to update status");
      return;
    }

    setDraftOrders((current) =>
      current.map((order) => (order.id === orderId ? { ...order, status } : order)),
    );
  }

  async function handleTrackingChange(orderId: string, trackingNumber: string) {
    setOrderError(null);
    const response = await csrfFetch(`/api/admin/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trackingNumber }),
    });

    if (!response.ok) {
      setOrderError(locale === "ru" ? "Не удалось сохранить трек-номер" : "Failed to save tracking number");
      return;
    }

    setDraftOrders((current) =>
      current.map((order) => (order.id === orderId ? { ...order, trackingNumber: trackingNumber || null } : order)),
    );
  }

  async function handleDeleteOrder(orderId: string) {
    if (!window.confirm(locale === "ru" ? "Удалить заказ?" : "Delete this order?")) return;

    setOrderError(null);
    const response = await csrfFetch(`/api/admin/orders/${orderId}`, { method: "DELETE" });

    if (!response.ok) {
      setOrderError(locale === "ru" ? "Не удалось удалить заказ" : "Failed to delete order");
      return;
    }

    setDraftOrders((current) => current.filter((order) => order.id !== orderId));
  }

  async function handleRoleChange(userId: string, role: string) {
    setUserError(null);
    const response = await csrfFetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });

    if (!response.ok) {
      setUserError(locale === "ru" ? "Не удалось обновить роль" : "Failed to update role");
      return;
    }

    setDraftUsers((current) => current.map((u) => (u.id === userId ? { ...u, role } : u)));
  }

  async function handleLoyaltyChange(userId: string, loyaltyLevel: string) {
    setUserError(null);
    const response = await csrfFetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ loyaltyLevel }),
    });

    if (!response.ok) {
      setUserError(locale === "ru" ? "Не удалось обновить уровень" : "Failed to update level");
      return;
    }

    setDraftUsers((current) => current.map((u) => (u.id === userId ? { ...u, loyaltyLevel } : u)));
  }

  async function handleBonusAdjust(userId: string) {
    setUserError(null);
    const amount = Math.trunc(Number(bonusAmount[userId]));
    const comment = (bonusComment[userId] ?? "").trim();

    if (!Number.isFinite(amount) || amount === 0 || !comment) {
      setUserError(
        locale === "ru"
          ? "Укажите сумму и комментарий для корректировки"
          : "Provide an amount and a comment for the adjustment",
      );
      return;
    }

    const response = await csrfFetch(`/api/admin/users/${userId}/bonus`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, comment }),
    });

    if (!response.ok) {
      setUserError(locale === "ru" ? "Не удалось скорректировать баланс" : "Failed to adjust balance");
      return;
    }

    setDraftUsers((current) =>
      current.map((u) => (u.id === userId ? { ...u, balanceActive: u.balanceActive + amount } : u)),
    );
    setBonusAmount((current) => ({ ...current, [userId]: "" }));
    setBonusComment((current) => ({ ...current, [userId]: "" }));
  }

  async function handlePromoToggle(promoId: string, isActive: boolean) {
    setPromoError(null);
    const response = await csrfFetch(`/api/admin/promos/${promoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive }),
    });

    if (!response.ok) {
      setPromoError(locale === "ru" ? "Не удалось обновить промокод" : "Failed to update promo code");
      return;
    }

    setDraftPromoCodes((current) =>
      current.map((promo) => (promo.id === promoId ? { ...promo, isActive } : promo)),
    );
  }

  async function handleDeletePromo(promoId: string) {
    if (!window.confirm(locale === "ru" ? "Удалить промокод?" : "Delete this promo code?")) return;

    setPromoError(null);
    const response = await csrfFetch(`/api/admin/promos/${promoId}`, { method: "DELETE" });

    if (!response.ok) {
      setPromoError(locale === "ru" ? "Не удалось удалить промокод" : "Failed to delete promo code");
      return;
    }

    setDraftPromoCodes((current) => current.filter((promo) => promo.id !== promoId));
  }

  async function handleCreatePromo() {
    setPromoError(null);
    const value = Number(newPromo.value);
    const minSubtotal = Number(newPromo.minSubtotal || 0);

    if (!newPromo.code.trim() || !Number.isFinite(value) || value <= 0) {
      setPromoError(locale === "ru" ? "Укажите код и значение скидки" : "Provide a code and discount value");
      return;
    }

    const response = await csrfFetch("/api/admin/promos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: newPromo.code,
        discountType: "percent",
        value,
        minSubtotal,
        usageLimit: newPromo.usageLimit ? Number(newPromo.usageLimit) : null,
        usageLimitPerUser: newPromo.usageLimitPerUser ? Number(newPromo.usageLimitPerUser) : null,
        combinableWithBonuses: newPromo.combinableWithBonuses,
        allowedCategories: newPromo.allowedCategories.trim()
          ? newPromo.allowedCategories.split(",").map((category) => category.trim()).filter(Boolean)
          : null,
        startsAt: newPromo.startsAt ? new Date(newPromo.startsAt).toISOString() : null,
        endsAt: newPromo.endsAt ? new Date(newPromo.endsAt).toISOString() : null,
      }),
    });

    if (!response.ok) {
      setPromoError(locale === "ru" ? "Не удалось создать промокод" : "Failed to create promo code");
      return;
    }

    const data = await response.json();
    setDraftPromoCodes((current) => [data.promoCode, ...current]);
    setNewPromo({
      code: "",
      value: "",
      minSubtotal: "",
      usageLimit: "",
      usageLimitPerUser: "",
      combinableWithBonuses: true,
      allowedCategories: "",
      startsAt: "",
      endsAt: "",
    });
  }

  async function handleReviewModeration(reviewId: string, isPublished: boolean) {
    setReviewError(null);
    const response = await csrfFetch(`/api/admin/reviews/${reviewId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublished }),
    });

    if (!response.ok) {
      setReviewError(locale === "ru" ? "Не удалось обновить отзыв" : "Failed to update review");
      return;
    }

    setDraftReviews((current) =>
      current.map((review) => (review.id === reviewId ? { ...review, isPublished } : review)),
    );
  }

  async function handleDeleteReview(reviewId: string) {
    if (!window.confirm(locale === "ru" ? "Удалить отзыв?" : "Delete this review?")) return;

    setReviewError(null);
    const response = await csrfFetch(`/api/admin/reviews/${reviewId}`, { method: "DELETE" });

    if (!response.ok) {
      setReviewError(locale === "ru" ? "Не удалось удалить отзыв" : "Failed to delete review");
      return;
    }

    setDraftReviews((current) => current.filter((review) => review.id !== reviewId));
  }

  async function handleReportLoad() {
    setReportLoading(true);
    setReportError(null);
    const response = await csrfFetch(
      `/api/admin/reports?from=${reportRange.from}&to=${reportRange.to}`,
    );

    if (!response.ok) {
      setReportLoading(false);
      setReportError(locale === "ru" ? "Не удалось загрузить отчёт" : "Failed to load report");
      return;
    }

    const data = await response.json();
    setReport(data.report);
    setReportLoading(false);
  }

  function handleExportTopProductsCsv() {
    const header = ["product_id", "name", "quantity", "revenue"];
    const rows = report.topProducts.map((row) => [row.productId, row.name, row.quantity, row.revenue]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `sonkei-top-products-${report.from}_${report.to}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const stats = useMemo(
    () => [
      {
        label: locale === "ru" ? "SKU" : "SKUs",
        value: draftProducts.length,
        icon: Boxes,
      },
      {
        label: locale === "ru" ? "Средний чек" : "AOV",
        value: formatCurrency(
          Math.round(draftProducts.reduce((sum, product) => sum + product.price, 0) / draftProducts.length),
          locale,
        ),
        icon: BarChart3,
      },
      {
        label: locale === "ru" ? "Бонусы" : "Rewards",
        value: draftProducts.reduce((sum, product) => sum + product.bonusPoints, 0),
        icon: Gift,
      },
    ],
    [draftProducts, locale],
  );

  return (
    <section className="premium-shell py-12">
      <div className="max-w-3xl">
        <h1 className="text-5xl font-light leading-tight sm:text-6xl">{t("title")}</h1>
        <p className="mt-5 text-lg leading-8 text-muted-foreground">{t("copy")}</p>
      </div>

      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="rounded-lg border border-border bg-card/70 p-6">
              <Icon className="h-5 w-5 text-bronze" />
              <p className="mt-6 text-sm text-muted-foreground">{stat.label}</p>
              <p className="mt-2 text-3xl font-light">{stat.value}</p>
            </div>
          );
        })}
      </div>

      <Tabs defaultValue="products" className="mt-10">
        <TabsList className="flex-wrap justify-start">
          <TabsTrigger value="products">{t("products")}</TabsTrigger>
          <TabsTrigger value="orders">{t("orders")}</TabsTrigger>
          <TabsTrigger value="clients">{locale === "ru" ? "Клиенты" : "Clients"}</TabsTrigger>
          <TabsTrigger value="bonuses">{t("bonuses")}</TabsTrigger>
          <TabsTrigger value="promos">{t("promos")}</TabsTrigger>
          <TabsTrigger value="reviews">{t("reviews")}</TabsTrigger>
          <TabsTrigger value="reports">{locale === "ru" ? "Отчёты" : "Reports"}</TabsTrigger>
          <TabsTrigger value="upload">{t("upload")}</TabsTrigger>
          <TabsTrigger value="settings">{locale === "ru" ? "Настройки" : "Settings"}</TabsTrigger>
          <TabsTrigger value="logs">{locale === "ru" ? "Журнал" : "Logs"}</TabsTrigger>
        </TabsList>

        <TabsContent value="products">
          {productError ? <p className="mb-4 text-sm text-destructive">{productError}</p> : null}
          {importMessage ? <p className="mb-4 text-sm text-muted-foreground">{importMessage}</p> : null}

          {canManageProducts ? (
            <div className="mb-5">
              <div className="flex flex-wrap gap-3">
                <Button variant="secondary" onClick={() => setModalState({ mode: "create" })}>
                  <Plus className="h-4 w-4" />
                  {t("addProduct")}
                </Button>
                <Button variant="secondary" asChild>
                  {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- file download from an API route, not a page */}
                  <a href="/api/admin/products/export">
                    <Download className="h-4 w-4" />
                    {locale === "ru" ? "Экспорт Excel" : "Export Excel"}
                  </a>
                </Button>
                <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-4 text-sm font-medium hover:bg-accent">
                  {locale === "ru" ? "Импорт Excel" : "Import Excel"}
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      const formData = new FormData();
                      formData.append("file", file);
                      setProductError(null);
                      setImportMessage(null);
                      const response = await csrfFetch("/api/admin/products/import", {
                        method: "POST",
                        body: formData,
                      });
                      if (!response.ok) {
                        setProductError(locale === "ru" ? "Не удалось импортировать файл" : "Failed to import file");
                        return;
                      }
                      const data = await response.json();
                      setImportMessage(
                        locale === "ru"
                          ? `Обновлено: ${data.result.updated}, пропущено: ${data.result.skipped.length}`
                          : `Updated: ${data.result.updated}, skipped: ${data.result.skipped.length}`,
                      );
                      const refreshed = await csrfFetch("/api/admin/products");
                      if (refreshed.ok) {
                        const refreshedData = await refreshed.json();
                        setDraftProducts(refreshedData.products);
                      }
                      event.target.value = "";
                    }}
                  />
                </label>
              </div>


            </div>
          ) : null}

          <div className="rounded-lg border border-border bg-card/65 p-5">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="border-b border-border text-muted-foreground">
                  <tr>
                    <th className="py-3 pr-4 font-medium">SKU</th>
                    <th className="py-3 pr-4 font-medium">{t("products")}</th>
                    <th className="py-3 pr-4 font-medium">Size</th>
                    <th className="py-3 pr-4 font-medium">Stock</th>
                    <th className="py-3 pr-4 font-medium">Price</th>
                    <th className="py-3 pr-4 font-medium">{locale === "ru" ? "Бонусы" : "Bonus"}</th>
                    <th className="py-3 pr-4 font-medium">{locale === "ru" ? "Активен" : "Active"}</th>
                    <th className="py-3 pr-4 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {draftProducts.map((product) => (
                    <Fragment key={product.id}>
                      <tr className="border-b border-border/70 last:border-0">
                        <td className="py-4 pr-4 text-muted-foreground">{product.sku}</td>
                        <td className="py-4 pr-4">
                          <div className="flex items-center gap-3">
                            <label
                              className={`group relative h-12 w-12 overflow-hidden rounded-lg bg-secondary ${
                                canManageProducts ? "cursor-pointer" : ""
                              }`}
                            >
                              {product.images[0] ? (
                                <Image
                                  src={product.images[0]}
                                  alt={localizedProductName(product, locale)}
                                  fill
                                  sizes="48px"
                                  className="object-contain p-1"
                                />
                              ) : (
                                <span className="flex h-full w-full items-center justify-center">
                                  <ImagePlus className="h-4 w-4 text-muted-foreground" />
                                </span>
                              )}
                              {uploadingImageId === product.id ? (
                                <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-[10px] text-white">
                                  ...
                                </span>
                              ) : null}
                              {canManageProducts ? (
                                <input
                                  type="file"
                                  accept="image/jpeg,image/png,image/webp,image/gif"
                                  className="hidden"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    e.target.value = "";
                                    if (!file) return;
                                    setUploadingImageId(product.id);
                                    try {
                                      await uploadProductImage(product.id, file);
                                    } catch {
                                      setProductError(
                                        locale === "ru" ? "Не удалось загрузить изображение" : "Failed to upload image",
                                      );
                                    } finally {
                                      setUploadingImageId(null);
                                    }
                                  }}
                                />
                              ) : null}
                              {canManageProducts && product.images[0] ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleRemoveProductImage(product.id, product.images[0]);
                                  }}
                                  className="absolute right-0 top-0 hidden h-4 w-4 items-center justify-center bg-black/70 text-white group-hover:flex"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              ) : null}
                            </label>
                            <span className="line-clamp-1">{localizedProductName(product, locale)}</span>
                          </div>
                        </td>
                        <td className="py-4 pr-4">{product.size}</td>
                        <td className="py-4 pr-4">
                          <Input
                            type="number"
                            defaultValue={product.stock}
                            disabled={!canManageProducts}
                            className="h-9 w-20"
                            onBlur={(e) => {
                              const value = Number(e.target.value);
                              if (Number.isFinite(value) && value !== product.stock) {
                                patchProduct(product.id, { stock: Math.max(0, Math.trunc(value)) });
                              }
                            }}
                          />
                        </td>
                        <td className="py-4 pr-4">
                          <Input
                            type="number"
                            defaultValue={product.price}
                            disabled={!canManageProducts}
                            className="h-9 w-24"
                            onBlur={(e) => {
                              const value = Number(e.target.value);
                              if (Number.isFinite(value) && value !== product.price) {
                                patchProduct(product.id, { price: Math.max(0, Math.trunc(value)) });
                              }
                            }}
                          />
                        </td>
                        <td className="py-4 pr-4">
                          <Input
                            type="number"
                            defaultValue={product.bonusPoints}
                            disabled={!canManageProducts}
                            className="h-9 w-20"
                            onBlur={(e) => {
                              const value = Number(e.target.value);
                              if (Number.isFinite(value) && value !== product.bonusPoints) {
                                patchProduct(product.id, { bonusPoints: Math.max(0, Math.trunc(value)) });
                              }
                            }}
                          />
                        </td>
                        <td className="py-4 pr-4">
                          <input
                            type="checkbox"
                            checked={product.isActive}
                            disabled={!canManageProducts}
                            onChange={(e) => patchProduct(product.id, { isActive: e.target.checked })}
                            className="h-5 w-5 accent-[#9b8465]"
                          />
                        </td>
                        <td className="py-4">
                          {canManageProducts ? (
                            <Button
                              variant="secondary"
                              size="sm"
                              className="mr-2"
                              onClick={() => setModalState({ mode: "edit", product })}
                            >
                              {locale === "ru" ? "Изменить" : "Edit"}
                            </Button>
                          ) : null}
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setExpandedSeoId((current) => (current === product.id ? null : product.id));
                              setSeoDraft((current) => ({
                                ...current,
                                [product.id]: current[product.id] ?? {
                                  seoTitle: product.seoTitle ?? "",
                                  seoDescription: product.seoDescription ?? "",
                                },
                              }));
                            }}
                          >
                            SEO
                          </Button>
                          {canManageProducts ? (
                            <Button
                              variant="secondary"
                              size="sm"
                              className="ml-2"
                              onClick={() => handleDeleteProduct(product.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          ) : null}
                        </td>
                      </tr>
                      {expandedSeoId === product.id ? (
                        <tr className="border-b border-border/70">
                          <td colSpan={8} className="py-4 pr-4">
                            <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
                              <Input
                                placeholder="SEO title"
                                value={seoDraft[product.id]?.seoTitle ?? ""}
                                onChange={(e) =>
                                  setSeoDraft((current) => ({
                                    ...current,
                                    [product.id]: { ...current[product.id], seoTitle: e.target.value },
                                  }))
                                }
                              />
                              <Input
                                placeholder="SEO description"
                                value={seoDraft[product.id]?.seoDescription ?? ""}
                                onChange={(e) =>
                                  setSeoDraft((current) => ({
                                    ...current,
                                    [product.id]: { ...current[product.id], seoDescription: e.target.value },
                                  }))
                                }
                              />
                              <Button
                                size="sm"
                                onClick={() => {
                                  const draft = seoDraft[product.id];
                                  if (draft) patchProduct(product.id, draft);
                                  setExpandedSeoId(null);
                                }}
                              >
                                {locale === "ru" ? "Сохранить" : "Save"}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {modalState && (
            <ProductFormModal
              mode={modalState.mode}
              product={modalState.mode === "edit" ? modalState.product : undefined}
              locale={locale}
              onClose={() => setModalState(null)}
              onSaved={handleProductSaved}
            />
          )}        </TabsContent>

        <TabsContent value="orders">
          {orderError ? <p className="mb-4 text-sm text-destructive">{orderError}</p> : null}
          {draftOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {locale === "ru" ? "Заказов пока нет." : "No orders yet."}
            </p>
          ) : (
            <div className="grid gap-4">
              {draftOrders.map((order) => (
                <div
                  key={order.id}
                  className="grid gap-4 rounded-lg border border-border bg-card/65 p-5 md:grid-cols-[1fr_auto_auto_auto]"
                >
                  <div>
                    <p className="font-medium">{order.number}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {order.customerName} · {order.customerEmail}
                    </p>
                    {order.promoCode ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {locale === "ru" ? "Промокод" : "Promo"}: {order.promoCode}
                      </p>
                    ) : null}
                    {order.bonusSpent > 0 || order.bonusEarned > 0 ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {locale === "ru" ? "Бонусы" : "Bonus"}: -{order.bonusSpent} / +
                        {order.bonusEarned}
                      </p>
                    ) : null}
                    <div className="mt-3 flex gap-2">
                      <Button asChild variant="secondary" size="sm">
                        <Link href={`/${locale}/admin/orders/${order.id}`}>
                          {locale === "ru" ? "Подробнее" : "Details"}
                        </Link>
                      </Button>
                      {canManageOrders ? (
                        <Button variant="secondary" size="sm" onClick={() => handleDeleteOrder(order.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </div>
                  </div>
                  {canManageOrders ? (
                    <Input
                      defaultValue={order.trackingNumber ?? ""}
                      placeholder={locale === "ru" ? "Трек-номер" : "Tracking number"}
                      className="h-10 w-40"
                      onBlur={(event) => {
                        if (event.target.value !== (order.trackingNumber ?? "")) {
                          handleTrackingChange(order.id, event.target.value.trim());
                        }
                      }}
                    />
                  ) : order.trackingNumber ? (
                    <Badge>{order.trackingNumber}</Badge>
                  ) : null}
                  {canManageOrders ? (
                    <select
                      value={order.status}
                      onChange={(event) => handleStatusChange(order.id, event.target.value)}
                      className="h-10 rounded-md border border-border bg-background px-3 text-sm"
                    >
                      {ORDER_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Badge variant="bronze">{order.status}</Badge>
                  )}
                  <p className="font-medium">{formatCurrency(order.total, locale)}</p>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="clients">
          {userError ? <p className="mb-4 text-sm text-destructive">{userError}</p> : null}
          {draftUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {locale === "ru" ? "Клиентов пока нет." : "No clients yet."}
            </p>
          ) : (
            <div className="grid gap-4">
              {draftUsers.map((u) => (
                <div key={u.id} className="rounded-lg border border-border bg-card/65 p-5">
                  <div className="grid gap-4 md:grid-cols-[1fr_auto_auto]">
                    <div>
                      <p className="font-medium">{u.name || u.email}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{u.email}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {locale === "ru" ? "Заказов" : "Orders"}: {u.ordersCount} ·{" "}
                        {locale === "ru" ? "Бонусы" : "Bonus"}: {u.balanceActive} (
                        {locale === "ru" ? "ожидает" : "pending"} {u.balancePending})
                      </p>
                    </div>
                    <select
                      value={u.loyaltyLevel}
                      disabled={!canManageUsers}
                      onChange={(event) => handleLoyaltyChange(u.id, event.target.value)}
                      className="h-10 rounded-md border border-border bg-background px-3 text-sm capitalize disabled:opacity-50"
                    >
                      {LOYALTY_LEVELS.map((level) => (
                        <option key={level} value={level}>
                          {level}
                        </option>
                      ))}
                    </select>
                    <select
                      value={u.role}
                      disabled={!canManageUsers}
                      onChange={(event) => handleRoleChange(u.id, event.target.value)}
                      className="h-10 rounded-md border border-border bg-background px-3 text-sm disabled:opacity-50"
                    >
                      {USER_ROLES.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </div>
                  {canManageUsers ? (
                    <div className="mt-4 grid gap-2 md:grid-cols-[120px_1fr_auto]">
                      <Input
                        type="number"
                        placeholder={locale === "ru" ? "± баллы" : "± points"}
                        value={bonusAmount[u.id] ?? ""}
                        onChange={(event) =>
                          setBonusAmount((current) => ({ ...current, [u.id]: event.target.value }))
                        }
                      />
                      <Input
                        placeholder={locale === "ru" ? "Комментарий администратора" : "Admin comment"}
                        value={bonusComment[u.id] ?? ""}
                        onChange={(event) =>
                          setBonusComment((current) => ({ ...current, [u.id]: event.target.value }))
                        }
                      />
                      <Button variant="secondary" size="sm" onClick={() => handleBonusAdjust(u.id)}>
                        {locale === "ru" ? "Применить" : "Apply"}
                      </Button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="bonuses">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              ["Silk", "3%", locale === "ru" ? "Стартовый уровень" : "Entry tier"],
              ["Calm", "5%", locale === "ru" ? "Повторные покупки" : "Repeat purchases"],
              ["Sora", "7%", locale === "ru" ? "Premium статус" : "Premium status"],
            ].map(([title, value, copy]) => (
              <div key={title} className="rounded-lg border border-border bg-card/65 p-6">
                <Gift className="h-5 w-5 text-bronze" />
                <p className="mt-5 text-sm text-muted-foreground">{title}</p>
                <p className="mt-2 text-3xl font-light">{value}</p>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">{copy}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-lg border border-border bg-card/65 p-5">
            <h3 className="mb-4 text-lg font-medium">
              {locale === "ru" ? "Журнал бонусных операций" : "Bonus operations log"}
            </h3>
            {bonusTransactions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {locale === "ru" ? "Операций пока нет." : "No operations yet."}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="border-b border-border text-muted-foreground">
                    <tr>
                      <th className="py-2 pr-4 font-medium">{locale === "ru" ? "Клиент" : "Customer"}</th>
                      <th className="py-2 pr-4 font-medium">{locale === "ru" ? "Заказ" : "Order"}</th>
                      <th className="py-2 pr-4 font-medium">{locale === "ru" ? "Тип" : "Type"}</th>
                      <th className="py-2 pr-4 font-medium">{locale === "ru" ? "Сумма" : "Amount"}</th>
                      <th className="py-2 pr-4 font-medium">{locale === "ru" ? "Статус" : "Status"}</th>
                      <th className="py-2 pr-4 font-medium">{locale === "ru" ? "Дата" : "Date"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bonusTransactions.map((tx) => (
                      <tr key={tx.id} className="border-b border-border/70 last:border-0">
                        <td className="py-3 pr-4">{tx.userEmail}</td>
                        <td className="py-3 pr-4 text-muted-foreground">{tx.orderNumber ?? "—"}</td>
                        <td className="py-3 pr-4">{tx.type}</td>
                        <td className="py-3 pr-4">{tx.amount}</td>
                        <td className="py-3 pr-4">{tx.status}</td>
                        <td className="py-3 pr-4 text-muted-foreground">
                          {new Date(tx.createdAt).toLocaleDateString(locale)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="promos">
          {promoError ? <p className="mb-4 text-sm text-destructive">{promoError}</p> : null}

          <div className="mb-5 space-y-3 rounded-lg border border-border bg-card/65 p-5">
            <div className="grid gap-3 md:grid-cols-[1fr_120px_140px]">
              <Input
                placeholder={locale === "ru" ? "Код, напр. SONKEI15" : "Code, e.g. SONKEI15"}
                value={newPromo.code}
                onChange={(event) => setNewPromo((current) => ({ ...current, code: event.target.value }))}
              />
              <Input
                type="number"
                placeholder="%"
                value={newPromo.value}
                onChange={(event) => setNewPromo((current) => ({ ...current, value: event.target.value }))}
              />
              <Input
                type="number"
                placeholder={locale === "ru" ? "Мин. сумма" : "Min subtotal"}
                value={newPromo.minSubtotal}
                onChange={(event) =>
                  setNewPromo((current) => ({ ...current, minSubtotal: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-3 md:grid-cols-[160px_160px_1fr_auto]">
              <Input
                type="number"
                placeholder={locale === "ru" ? "Лимит использований" : "Total usage limit"}
                value={newPromo.usageLimit}
                onChange={(event) =>
                  setNewPromo((current) => ({ ...current, usageLimit: event.target.value }))
                }
              />
              <Input
                type="number"
                placeholder={locale === "ru" ? "Лимит на пользователя" : "Per-user limit"}
                value={newPromo.usageLimitPerUser}
                onChange={(event) =>
                  setNewPromo((current) => ({ ...current, usageLimitPerUser: event.target.value }))
                }
              />
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={newPromo.combinableWithBonuses}
                  onChange={(event) =>
                    setNewPromo((current) => ({ ...current, combinableWithBonuses: event.target.checked }))
                  }
                  className="h-4 w-4 accent-[#9b8465]"
                />
                {locale === "ru" ? "Можно с бонусами" : "Combinable with bonuses"}
              </label>
              <Button onClick={handleCreatePromo}>
                <Plus className="h-4 w-4" />
                {locale === "ru" ? "Создать" : "Create"}
              </Button>
            </div>
            <Input
              placeholder={
                locale === "ru"
                  ? "Категории через запятую, напр. pants (необязательно)"
                  : "Categories, comma-separated, e.g. pants (optional)"
              }
              value={newPromo.allowedCategories}
              onChange={(event) =>
                setNewPromo((current) => ({ ...current, allowedCategories: event.target.value }))
              }
            />
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <p className="mb-1 text-xs text-muted-foreground">
                  {locale === "ru" ? "Действует с" : "Starts at"}
                </p>
                <Input
                  type="date"
                  value={newPromo.startsAt}
                  onChange={(event) =>
                    setNewPromo((current) => ({ ...current, startsAt: event.target.value }))
                  }
                />
              </div>
              <div>
                <p className="mb-1 text-xs text-muted-foreground">
                  {locale === "ru" ? "Действует до" : "Ends at"}
                </p>
                <Input
                  type="date"
                  value={newPromo.endsAt}
                  onChange={(event) => setNewPromo((current) => ({ ...current, endsAt: event.target.value }))}
                />
              </div>
            </div>
          </div>

          {draftPromoCodes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {locale === "ru" ? "Промокодов пока нет." : "No promo codes yet."}
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {draftPromoCodes.map((promo) => (
                <div key={promo.id} className="rounded-lg border border-border bg-card/65 p-6">
                  <Ticket className="h-5 w-5 text-bronze" />
                  <p className="mt-5 text-sm text-muted-foreground">{promo.code}</p>
                  <p className="mt-2 text-3xl font-light">
                    {promo.discountType === "percent"
                      ? `${promo.value}%`
                      : formatCurrency(promo.value, locale)}
                  </p>
                  <p className="mt-4 text-sm leading-6 text-muted-foreground">
                    {locale === "ru" ? "Мин. сумма" : "Min subtotal"}:{" "}
                    {formatCurrency(promo.minSubtotal, locale)} ·{" "}
                    {locale === "ru" ? "Применений" : "Used"}: {promo.timesUsed}
                    {promo.usageLimit ? `/${promo.usageLimit}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {promo.usageLimitPerUser
                      ? `${locale === "ru" ? "На пользователя" : "Per user"}: ${promo.usageLimitPerUser} · `
                      : ""}
                    {promo.combinableWithBonuses
                      ? locale === "ru"
                        ? "С бонусами: да"
                        : "With bonuses: yes"
                      : locale === "ru"
                        ? "С бонусами: нет"
                        : "With bonuses: no"}
                  </p>
                  {promo.allowedCategories?.length || promo.allowedProducts?.length ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {locale === "ru" ? "Категории" : "Categories"}:{" "}
                      {[...(promo.allowedCategories ?? []), ...(promo.allowedProducts ?? [])].join(", ")}
                    </p>
                  ) : null}
                  {promo.startsAt || promo.endsAt ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {locale === "ru" ? "Период" : "Period"}:{" "}
                      {promo.startsAt ? new Date(promo.startsAt).toLocaleDateString(locale) : "…"}
                      {" – "}
                      {promo.endsAt ? new Date(promo.endsAt).toLocaleDateString(locale) : "…"}
                    </p>
                  ) : null}
                  <div className="mt-4 flex gap-2">
                    <Button
                      variant={promo.isActive ? "secondary" : "default"}
                      size="sm"
                      className="flex-1"
                      onClick={() => handlePromoToggle(promo.id, !promo.isActive)}
                    >
                      {promo.isActive
                        ? locale === "ru"
                          ? "Деактивировать"
                          : "Deactivate"
                        : locale === "ru"
                          ? "Активировать"
                          : "Activate"}
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => handleDeletePromo(promo.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="reviews">
          {reviewError ? <p className="mb-4 text-sm text-destructive">{reviewError}</p> : null}
          {draftReviews.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {locale === "ru" ? "Отзывов пока нет." : "No reviews yet."}
            </p>
          ) : (
            <div className="grid gap-4">
              {draftReviews.map((review) => (
                <div
                  key={review.id}
                  className="grid gap-4 rounded-lg border border-border bg-card/65 p-5 md:grid-cols-[auto_1fr_auto]"
                >
                  <div className="flex items-center gap-1 text-bronze">
                    <Star className="h-4 w-4 fill-current" />
                    <span className="text-sm font-medium">{review.rating.toFixed(1)}</span>
                  </div>
                  <div>
                    <p className="font-medium">{review.productName}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{review.comment}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {review.userEmail ?? (locale === "ru" ? "Без аккаунта" : "Guest")} ·{" "}
                      {new Date(review.createdAt).toLocaleDateString(locale)}
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Badge variant={review.isPublished ? "bronze" : "default"}>
                      {review.isPublished
                        ? locale === "ru"
                          ? "Опубликован"
                          : "Published"
                        : locale === "ru"
                          ? "На проверке"
                          : "Pending"}
                    </Badge>
                    {!review.isPublished ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleReviewModeration(review.id, true)}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleReviewModeration(review.id, false)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                    <Button size="sm" variant="secondary" onClick={() => handleDeleteReview(review.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="reports">
          {reportError ? <p className="mb-4 text-sm text-destructive">{reportError}</p> : null}

          <div className="mb-6 grid gap-3 rounded-lg border border-border bg-card/65 p-5 md:grid-cols-[1fr_1fr_auto_auto]">
            <Input
              type="date"
              value={reportRange.from}
              onChange={(event) => setReportRange((current) => ({ ...current, from: event.target.value }))}
            />
            <Input
              type="date"
              value={reportRange.to}
              onChange={(event) => setReportRange((current) => ({ ...current, to: event.target.value }))}
            />
            <Button onClick={handleReportLoad} disabled={reportLoading}>
              {locale === "ru" ? "Показать" : "Show"}
            </Button>
            <Button variant="secondary" onClick={handleExportTopProductsCsv}>
              <Download className="h-4 w-4" />
              CSV
            </Button>
          </div>

          <div className="grid gap-5 md:grid-cols-4">
            <ReportStat
              label={locale === "ru" ? "Выручка" : "Revenue"}
              value={formatCurrency(report.revenue, locale)}
            />
            <ReportStat
              label={locale === "ru" ? "Заказов (оплачено)" : "Orders (paid)"}
              value={`${report.paidOrdersCount}/${report.ordersCount}`}
            />
            <ReportStat
              label={locale === "ru" ? "Средний чек" : "AOV"}
              value={formatCurrency(report.averageOrderValue, locale)}
            />
            <ReportStat
              label={locale === "ru" ? "Промокоды использованы" : "Promo uses"}
              value={String(report.promoUsageCount)}
            />
            <ReportStat
              label={locale === "ru" ? "Бонусы начислены" : "Bonus issued"}
              value={String(report.bonusIssued)}
            />
            <ReportStat
              label={locale === "ru" ? "Бонусы списаны" : "Bonus spent"}
              value={String(report.bonusSpent)}
            />
          </div>

          <div className="mt-8 rounded-lg border border-border bg-card/65 p-5">
            <h3 className="mb-4 text-lg font-medium">
              {locale === "ru" ? "Топ товаров по выручке" : "Top products by revenue"}
            </h3>
            {report.topProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {locale === "ru" ? "Нет данных за период." : "No data for this period."}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-left text-sm">
                  <thead className="border-b border-border text-muted-foreground">
                    <tr>
                      <th className="py-2 pr-4 font-medium">{locale === "ru" ? "Товар" : "Product"}</th>
                      <th className="py-2 pr-4 font-medium">{locale === "ru" ? "Кол-во" : "Qty"}</th>
                      <th className="py-2 pr-4 font-medium">{locale === "ru" ? "Выручка" : "Revenue"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.topProducts.map((row) => (
                      <tr key={row.productId} className="border-b border-border/70 last:border-0">
                        <td className="py-3 pr-4">{row.name}</td>
                        <td className="py-3 pr-4">{row.quantity}</td>
                        <td className="py-3 pr-4">{formatCurrency(row.revenue, locale)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="upload">
          <div className="rounded-lg border border-dashed border-bronze/50 bg-card/65 p-10 text-center">
            <ImagePlus className="mx-auto h-9 w-9 text-bronze" />
            <h2 className="mt-5 text-2xl font-light">{t("upload")}</h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
              {locale === "ru"
                ? "Frontend UI готов к подключению S3, Cloudinary или внутреннего медиа-хранилища."
                : "Frontend UI is ready for S3, Cloudinary or internal media storage integration."}
            </p>
            <Input type="file" className="mx-auto mt-6 max-w-sm" />
          </div>
        </TabsContent>

        <TabsContent value="settings">
          {settingsError ? <p className="mb-4 text-sm text-destructive">{settingsError}</p> : null}
          {settingsMessage ? <p className="mb-4 text-sm text-muted-foreground">{settingsMessage}</p> : null}

          <div className="rounded-lg border border-border bg-card/65 p-6">
            <h3 className="mb-4 text-lg font-medium">
              {locale === "ru" ? "Бонусная программа" : "Loyalty program"}
            </h3>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="mb-2 text-sm text-muted-foreground">Silk, %</p>
                <Input
                  type="number"
                  disabled={!canManageSettings}
                  value={settingsForm.silk}
                  onChange={(e) => setSettingsForm((c) => ({ ...c, silk: e.target.value }))}
                />
              </div>
              <div>
                <p className="mb-2 text-sm text-muted-foreground">Calm, %</p>
                <Input
                  type="number"
                  disabled={!canManageSettings}
                  value={settingsForm.calm}
                  onChange={(e) => setSettingsForm((c) => ({ ...c, calm: e.target.value }))}
                />
              </div>
              <div>
                <p className="mb-2 text-sm text-muted-foreground">Sora, %</p>
                <Input
                  type="number"
                  disabled={!canManageSettings}
                  value={settingsForm.sora}
                  onChange={(e) => setSettingsForm((c) => ({ ...c, sora: e.target.value }))}
                />
              </div>
              <div>
                <p className="mb-2 text-sm text-muted-foreground">
                  {locale === "ru" ? "Лимит списания бонусов, %" : "Max bonus spend, %"}
                </p>
                <Input
                  type="number"
                  disabled={!canManageSettings}
                  value={settingsForm.maxSpendSharePercent}
                  onChange={(e) => setSettingsForm((c) => ({ ...c, maxSpendSharePercent: e.target.value }))}
                />
              </div>
              <div>
                <p className="mb-2 text-sm text-muted-foreground">
                  {locale === "ru" ? "Срок действия бонусов, дней" : "Bonus validity, days"}
                </p>
                <Input
                  type="number"
                  disabled={!canManageSettings}
                  value={settingsForm.expiryDays}
                  onChange={(e) => setSettingsForm((c) => ({ ...c, expiryDays: e.target.value }))}
                />
              </div>
              <div>
                <p className="mb-2 text-sm text-muted-foreground">
                  {locale === "ru" ? "Ставка НДС, %" : "VAT rate, %"}
                </p>
                <Input
                  type="number"
                  disabled={!canManageSettings}
                  value={settingsForm.ndsRate}
                  onChange={(e) => setSettingsForm((c) => ({ ...c, ndsRate: e.target.value }))}
                />
              </div>
              <div>
                <p className="mb-2 text-sm text-muted-foreground">
                  {locale === "ru" ? "Порог Calm, ₽ оплаченных заказов" : "Calm threshold, ₽ paid"}
                </p>
                <Input
                  type="number"
                  disabled={!canManageSettings}
                  value={settingsForm.calmThreshold}
                  onChange={(e) => setSettingsForm((c) => ({ ...c, calmThreshold: e.target.value }))}
                />
              </div>
              <div>
                <p className="mb-2 text-sm text-muted-foreground">
                  {locale === "ru" ? "Порог Sora, ₽ оплаченных заказов" : "Sora threshold, ₽ paid"}
                </p>
                <Input
                  type="number"
                  disabled={!canManageSettings}
                  value={settingsForm.soraThreshold}
                  onChange={(e) => setSettingsForm((c) => ({ ...c, soraThreshold: e.target.value }))}
                />
              </div>
              <div>
                <p className="mb-2 text-sm text-muted-foreground">
                  {locale === "ru"
                    ? "Активация бонусов без доставки, дней после оплаты"
                    : "Activate without delivery after, days since payment"}
                </p>
                <Input
                  type="number"
                  disabled={!canManageSettings}
                  value={settingsForm.pendingFallbackDays}
                  onChange={(e) => setSettingsForm((c) => ({ ...c, pendingFallbackDays: e.target.value }))}
                />
              </div>
            </div>
            {canManageSettings ? (
              <Button className="mt-5" onClick={handleSaveSettings}>
                {locale === "ru" ? "Сохранить" : "Save"}
              </Button>
            ) : null}
          </div>
        </TabsContent>

        <TabsContent value="logs">
          {auditLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {locale === "ru" ? "Действий пока нет." : "No actions yet."}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border bg-card/65 p-5">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b border-border text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-4 font-medium">{locale === "ru" ? "Админ" : "Admin"}</th>
                    <th className="py-2 pr-4 font-medium">{locale === "ru" ? "Действие" : "Action"}</th>
                    <th className="py-2 pr-4 font-medium">{locale === "ru" ? "Объект" : "Entity"}</th>
                    <th className="py-2 pr-4 font-medium">{locale === "ru" ? "Дата" : "Date"}</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="border-b border-border/70 last:border-0">
                      <td className="py-3 pr-4">{log.adminEmail ?? "—"}</td>
                      <td className="py-3 pr-4">{log.action}</td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {log.entity}
                        {log.entityId ? ` · ${log.entityId.slice(0, 8)}` : ""}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {new Date(log.createdAt).toLocaleString(locale)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </section>
  );
}

function ReportStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card/70 p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-light">{value}</p>
    </div>
  );
}
