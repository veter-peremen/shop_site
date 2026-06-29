"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Locale } from "@/i18n/routing";
import { csrfFetch } from "@/lib/csrf-client";

export function ForgotPasswordClient({ locale }: { locale: Locale }) {
  const t = useTranslations("authFlow");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setLoading(true);
    await csrfFetch("/api/auth/request-password-reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, locale }),
    });
    setLoading(false);
    setSent(true);
  }

  return (
    <section className="premium-shell flex min-h-[60vh] items-center justify-center py-16">
      <div className="w-full max-w-md rounded-lg border border-border bg-card/65 p-8">
        <h1 className="text-3xl font-light">{t("forgotTitle")}</h1>
        <p className="mt-3 text-sm text-muted-foreground">{t("forgotCopy")}</p>

        {sent ? (
          <p className="mt-6 text-sm text-foreground">{t("forgotSent")}</p>
        ) : (
          <div className="mt-6 space-y-3">
            <Input
              type="email"
              placeholder={t("forgotTitle")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button className="w-full" onClick={handleSubmit} disabled={loading || !email}>
              {t("forgotSubmit")}
            </Button>
          </div>
        )}

        <Link href={`/${locale}/login`} className="mt-6 block text-sm text-muted-foreground underline">
          {t("backToLogin")}
        </Link>
      </div>
    </section>
  );
}
