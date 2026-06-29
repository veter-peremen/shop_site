import { setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";

import { OrderDetailView } from "@/components/admin/order-detail-view";
import { isLocale, type Locale } from "@/i18n/routing";
import { getCurrentUser } from "@/lib/auth";
import { getOrderDetail } from "@/lib/orders";

const ADMIN_ROLES = new Set(["admin", "manager", "support"]);

type OrderPageProps = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function AdminOrderPage({ params }: OrderPageProps) {
  const { locale: rawLocale, id } = await params;
  if (!isLocale(rawLocale)) notFound();

  const locale = rawLocale as Locale;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  if (!user || !ADMIN_ROLES.has(user.role)) {
    redirect(`/${locale}/account`);
  }

  const order = await getOrderDetail(id);
  if (!order) notFound();

  return (
    <section className="premium-shell py-12">
      <OrderDetailView
        order={order}
        locale={locale}
        canManageOrders={user.role === "admin" || user.role === "manager"}
      />
    </section>
  );
}
