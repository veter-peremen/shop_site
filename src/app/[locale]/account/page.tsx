import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";

import { AccountDashboard } from "@/components/account/account-dashboard";
import { isLocale, type Locale } from "@/i18n/routing";
import { getAddressesByUser } from "@/lib/addresses";
import { getCurrentUser } from "@/lib/auth";
import { getBonusAccount, getBonusTransactionsByUser } from "@/lib/bonus";
import { getOrdersByUser } from "@/lib/orders";
import { getActivePromoCodes } from "@/lib/promos";
import { getAllProducts } from "@/lib/products";
import { getSettings } from "@/lib/settings";
import { getNotificationPreferences } from "@/lib/users";

type AccountPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: AccountPageProps) {
  const { locale: rawLocale } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : "ru";
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "account" });

  return {
    title: t("title"),
    description: t("copy"),
  };
}

export default async function AccountPage({ params }: AccountPageProps) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();

  const locale = rawLocale as Locale;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  if (!user) {
    redirect(`/${locale}/login`);
  }

  const [products, promoCodes, bonusAccount, orders, bonusTransactions, addresses, settings, notificationPreferences] =
    await Promise.all([
      getAllProducts(),
      getActivePromoCodes(),
      getBonusAccount(user.id),
      getOrdersByUser(user.id),
      getBonusTransactionsByUser(user.id),
      getAddressesByUser(user.id),
      getSettings(),
      getNotificationPreferences(user.id),
    ]);

  return (
    <AccountDashboard
      products={products}
      promoCodes={promoCodes}
      locale={locale}
      user={user}
      bonusAccount={bonusAccount}
      orders={orders}
      bonusTransactions={bonusTransactions}
      addresses={addresses}
      bonusLoyaltyRates={settings.bonusLoyaltyRates}
      notificationPreferences={notificationPreferences}
    />
  );
}
