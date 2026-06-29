import { FileText, Mail, Phone } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { isLocale, type Locale } from "@/i18n/routing";

type CooperationPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: CooperationPageProps) {
  const { locale: rawLocale } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : "ru";
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "legalPages" });

  return {
    title: t("cooperationTitle"),
    description: t("cooperationCopy"),
  };
}

export default async function CooperationPage({ params }: CooperationPageProps) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();

  const locale = rawLocale as Locale;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "legalPages" });

  const points =
    locale === "ru"
      ? ["Оптовая заявка", "Сопровождающие документы на почту", "Складская отгрузка из Домодедово"]
      : ["Wholesale request", "Supporting documents by email", "Warehouse dispatch from Domodedovo"];

  return (
    <section className="premium-shell py-12">
      <div className="max-w-3xl">
        <h1 className="text-5xl font-light leading-tight sm:text-6xl">{t("cooperationTitle")}</h1>
        <p className="mt-5 text-lg leading-8 text-muted-foreground">{t("cooperationCopy")}</p>
      </div>
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {points.map((point) => (
          <div key={point} className="rounded-lg border border-border bg-card/65 p-6">
            <FileText className="h-5 w-5 text-bronze" />
            <p className="mt-8 text-xl font-medium">{point}</p>
          </div>
        ))}
      </div>
      <div className="mt-10 rounded-lg border border-border bg-card/75 p-6">
        <p className="text-sm text-muted-foreground">{siteConfig.warehouse}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild>
            <Link href={`/${locale}/contacts`}>
              <Mail className="h-4 w-4" />
              {locale === "ru" ? "Оставить заявку" : "Send request"}
            </Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href={siteConfig.phoneHref}>
              <Phone className="h-4 w-4" />
              {siteConfig.phone}
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
