import { Mail, MapPin, Phone, type LucideIcon } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { siteConfig } from "@/config/site";
import { isLocale, type Locale } from "@/i18n/routing";

type ContactsPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: ContactsPageProps) {
  const { locale: rawLocale } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : "ru";
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "contacts" });

  return {
    title: t("title"),
    description: t("copy"),
  };
}

export default async function ContactsPage({ params }: ContactsPageProps) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();

  const locale = rawLocale as Locale;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "contacts" });

  return (
    <section className="premium-shell py-12">
      <div className="max-w-3xl">
        <h1 className="text-5xl font-light leading-tight sm:text-6xl">{t("title")}</h1>
        <p className="mt-5 text-lg leading-8 text-muted-foreground">{t("copy")}</p>
      </div>

      <div className="mt-10 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="grid gap-4">
          <ContactCard icon={Phone} label={t("phone")} value={siteConfig.phone} href={siteConfig.phoneHref} />
          <ContactCard icon={Mail} label={t("email")} value={siteConfig.email} href={siteConfig.emailHref} />
          <ContactCard icon={MapPin} label={t("warehouse")} value={siteConfig.warehouse} />
          <div className="rounded-lg border border-border bg-card/65 p-6">
            <p className="text-sm text-muted-foreground">{t("legal")}</p>
            <h2 className="mt-3 text-2xl font-light">{siteConfig.legal.company}</h2>
            <dl className="mt-5 grid gap-3 text-sm">
              <div className="flex justify-between gap-4 border-b border-border pb-3">
                <dt className="text-muted-foreground">ИНН / КПП</dt>
                <dd>{siteConfig.legal.innKpp}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">ОГРН</dt>
                <dd>{siteConfig.legal.ogrn}</dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card/75 p-6 shadow-premium">
          <h2 className="text-3xl font-light">{t("wholesale")}</h2>
          <p className="mt-4 leading-7 text-muted-foreground">{t("wholesaleCopy")}</p>
          <form className="mt-8 grid gap-4">
            <Input placeholder={t("name")} />
            <Input placeholder={t("company")} />
            <Input placeholder={t("phone")} />
            <Input placeholder={t("email")} />
            <textarea
              placeholder={t("message")}
              className="focus-ring min-h-32 rounded-lg border border-border bg-card/75 px-5 py-4 text-sm text-foreground shadow-sm transition placeholder:text-muted-foreground hover:border-bronze/40"
            />
            <p className="text-xs leading-5 text-muted-foreground">
              {locale === "ru"
                ? "Нажимая кнопку, вы соглашаетесь с политикой обработки персональных данных."
                : "By sending the request, you agree to the personal data policy."}
            </p>
            <Button type="button" size="lg">{t("submit")}</Button>
          </form>
        </div>
      </div>
    </section>
  );
}

function ContactCard({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  href?: string;
}) {
  const content = (
    <div className="rounded-lg border border-border bg-card/65 p-6 transition hover:border-bronze/40">
      <Icon className="h-5 w-5 text-bronze" />
      <p className="mt-5 text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-lg leading-7">{value}</p>
    </div>
  );

  return href ? <a href={href}>{content}</a> : content;
}
