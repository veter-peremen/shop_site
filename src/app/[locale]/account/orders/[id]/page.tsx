import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { OrderDetailClient } from "@/components/account/order-detail-client";
import { isLocale, type Locale } from "@/i18n/routing";
import { getCurrentUser } from "@/lib/auth";
import { getOrderDetail } from "@/lib/orders";

type PageProps = {
  params: Promise<{ locale: string; id: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { locale: rawLocale } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : "ru";
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "account" });

  return { title: t("orderItems") };
}

export default async function OrderDetailPage({ params }: PageProps) {
  const { locale: rawLocale, id } = await params;
  if (!isLocale(rawLocale)) notFound();

  const locale = rawLocale as Locale;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  if (!user) notFound();

  const order = await getOrderDetail(id);
  const isOwner = order && (order.userId === user.id || user.role === "admin" || user.role === "manager");

  if (!order || !isOwner) {
    return <OrderDetailClient locale={locale} order={null} />;
  }

  return <OrderDetailClient locale={locale} order={order} />;
}
