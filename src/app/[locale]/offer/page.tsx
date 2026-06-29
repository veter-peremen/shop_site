import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { siteConfig } from "@/config/site";
import { isLocale, type Locale } from "@/i18n/routing";

type OfferPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: OfferPageProps) {
  const { locale: rawLocale } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : "ru";
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "legalPages" });

  return {
    title: t("offerTitle"),
    description: t("offerCopy"),
  };
}

export default async function OfferPage({ params }: OfferPageProps) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();

  const locale = rawLocale as Locale;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "legalPages" });
  const sections =
    locale === "ru"
      ? [
          ["Продавец", `${siteConfig.legal.company}, ИНН/КПП ${siteConfig.legal.innKpp}, ОГРН ${siteConfig.legal.ogrn}.`],
          ["Предмет оферты", "Продажа товаров детской гигиены SONKEI через сайт, каталог, корзину и оформляемые заказы."],
          ["Оформление заказа", "Заказ считается направленным после заполнения формы, подтверждения состава корзины и передачи контактных данных."],
          ["Цена и оплата", "Цена указывается в рублях. Онлайн-оплата подключается отдельным платежным модулем и должна сопровождаться кассовой интеграцией."],
          ["Доставка и возврат", "Условия доставки, обмена и возврата уточняются при оформлении заказа и должны соответствовать законодательству РФ."],
          ["Контакты", `${siteConfig.phone}, ${siteConfig.email}.`],
        ]
      : [
          ["Seller", `${siteConfig.legal.company}, tax details ${siteConfig.legal.innKpp}, OGRN ${siteConfig.legal.ogrn}.`],
          ["Subject", "Sale of SONKEI baby hygiene products through the website, catalog, cart and submitted orders."],
          ["Order placement", "An order is submitted after the form is filled, cart contents are confirmed and contact data is provided."],
          ["Price and payment", "Prices are shown in RUB. Online payment requires a separate payment and fiscal integration."],
          ["Delivery and returns", "Delivery, exchange and return terms are specified during checkout and should follow applicable law."],
          ["Contacts", `${siteConfig.phone}, ${siteConfig.email}.`],
        ];

  return (
    <section className="premium-shell py-12">
      <div className="max-w-3xl">
        <Badge variant="bronze">{t("updated")}</Badge>
        <h1 className="mt-5 text-5xl font-light leading-tight sm:text-6xl">{t("offerTitle")}</h1>
        <p className="mt-5 text-lg leading-8 text-muted-foreground">{t("offerCopy")}</p>
      </div>
      <div className="mt-10 grid gap-4">
        {sections.map(([heading, body]) => (
          <article key={heading} className="rounded-lg border border-border bg-card/65 p-6">
            <h2 className="text-2xl font-light">{heading}</h2>
            <p className="mt-4 leading-8 text-muted-foreground">{body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
