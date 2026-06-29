import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { siteConfig } from "@/config/site";
import { isLocale, type Locale } from "@/i18n/routing";

type LegalPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: LegalPageProps) {
  const { locale: rawLocale } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : "ru";
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "legalPages" });

  return {
    title: t("privacyTitle"),
    description: t("privacyCopy"),
  };
}

export default async function PrivacyPage({ params }: LegalPageProps) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();

  const locale = rawLocale as Locale;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "legalPages" });

  const sections =
    locale === "ru"
      ? [
          ["Оператор", `${siteConfig.legal.company}, ИНН/КПП ${siteConfig.legal.innKpp}, ОГРН ${siteConfig.legal.ogrn}.`],
          ["Какие данные обрабатываются", "Имя, телефон, email, компания, комментарии к заявке, данные заказа, cookie и обезличенная аналитика."],
          ["Цели обработки", "Обработка заявок, оформление заказов, обратная связь, сопровождение документов, улучшение сайта и информирование о продуктах SONKEI."],
          ["Правовые основания", "Согласие пользователя, договорные отношения, уставные документы и требования законодательства РФ о персональных данных."],
          ["Отзыв согласия", `Пользователь может направить запрос на ${siteConfig.email} с темой «Отзыв согласия на обработку персональных данных».`],
        ]
      : [
          ["Controller", `${siteConfig.legal.company}, tax details ${siteConfig.legal.innKpp}, OGRN ${siteConfig.legal.ogrn}.`],
          ["Processed data", "Name, phone, email, company, request comments, order data, cookies and anonymized analytics."],
          ["Purposes", "Request processing, order support, feedback, document exchange, website improvement and SONKEI product updates."],
          ["Legal basis", "User consent, contractual relations, company documents and applicable personal data laws."],
          ["Consent withdrawal", `A user can send a request to ${siteConfig.email}.`],
        ];

  return <LegalDocument title={t("privacyTitle")} copy={t("privacyCopy")} badge={t("updated")} sections={sections} />;
}

function LegalDocument({
  title,
  copy,
  badge,
  sections,
}: {
  title: string;
  copy: string;
  badge: string;
  sections: string[][];
}) {
  return (
    <section className="premium-shell py-12">
      <div className="max-w-3xl">
        <Badge variant="bronze">{badge}</Badge>
        <h1 className="mt-5 text-5xl font-light leading-tight sm:text-6xl">{title}</h1>
        <p className="mt-5 text-lg leading-8 text-muted-foreground">{copy}</p>
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
