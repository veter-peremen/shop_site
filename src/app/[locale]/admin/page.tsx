import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";

import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { isLocale, type Locale } from "@/i18n/routing";
import { getAllProductsForAdmin } from "@/lib/admin-products";
import { getRecentAuditLogs } from "@/lib/audit";
import { getCurrentUser } from "@/lib/auth";
import { getRecentBonusTransactions } from "@/lib/bonus";
import { getAllOrders } from "@/lib/orders";
import { getAllPromoCodes } from "@/lib/promos";
import { getSalesReport } from "@/lib/reports";
import { getAllReviews } from "@/lib/reviews";
import { getSettings } from "@/lib/settings";
import { getAllUsers } from "@/lib/users";

function defaultRange() {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 30);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

const ADMIN_ROLES = new Set(["admin", "manager", "content", "support"]);

type AdminPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: AdminPageProps) {
  const { locale: rawLocale } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : "ru";
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "admin" });

  return {
    title: t("title"),
    description: t("copy"),
  };
}

export default async function AdminPage({ params }: AdminPageProps) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();

  const locale = rawLocale as Locale;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  if (!user || !ADMIN_ROLES.has(user.role)) {
    redirect(`/${locale}/account`);
  }

  const range = defaultRange();

  const [products, promoCodes, orders, bonusTransactions, users, auditLogs, reviews, report, settings] =
    await Promise.all([
      getAllProductsForAdmin(),
      getAllPromoCodes(),
      getAllOrders(),
      getRecentBonusTransactions(),
      getAllUsers(),
      getRecentAuditLogs(),
      getAllReviews(),
      getSalesReport(range.from, range.to),
      getSettings(),
    ]);

  return (
    <AdminDashboard
      products={products}
      promoCodes={promoCodes}
      orders={orders}
      bonusTransactions={bonusTransactions}
      users={users}
      auditLogs={auditLogs}
      reviews={reviews}
      initialReport={report}
      initialSettings={settings}
      locale={locale}
      currentRole={user.role}
      canManageOrders={user.role === "admin" || user.role === "manager"}
    />
  );
}
