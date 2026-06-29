"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Locale } from "@/i18n/routing";
import { csrfFetch } from "@/lib/csrf-client";
import { useCommerceStore } from "@/store/commerce-store";

export function LoginClient({ locale }: { locale: Locale }) {
  const t = useTranslations("authFlow");
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const response = await csrfFetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);

    if (!response.ok) {
      setError(t("loginInvalid"));
      return;
    }

    await Promise.all([
      useCommerceStore.getState().loadCart(),
      useCommerceStore.getState().loadWishlist(),
      useCommerceStore.getState().loadBonusBalance(),
    ]);
    router.push(redirectTo && redirectTo.startsWith("/") ? redirectTo : `/${locale}/account`);
    router.refresh();
  }

  return (
    <section className="premium-shell flex min-h-[60vh] items-center justify-center py-16">
      <div className="w-full max-w-md rounded-lg border border-border bg-card/65 p-8">
        <h1 className="text-3xl font-light">{t("loginTitle")}</h1>
        <p className="mt-3 text-sm text-muted-foreground">{t("loginCopy")}</p>

        <form className="mt-6 space-y-3" autoComplete="on" onSubmit={handleSubmit}>
          <Input
            placeholder={t("email")}
            type="email"
            name="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            placeholder={t("password")}
            type="password"
            name="current-password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={loading || !email || !password}>
            {t("continue")}
          </Button>
          <Link
            href={`/${locale}/forgot-password`}
            className="block text-center text-xs text-muted-foreground underline"
          >
            {t("forgotPassword")}
          </Link>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {t("noAccount")}{" "}
          <Link href={`/${locale}/register`} className="text-foreground underline">
            {t("goToRegister")}
          </Link>
        </p>
      </div>
    </section>
  );
}
