"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Locale } from "@/i18n/routing";
import { csrfFetch } from "@/lib/csrf-client";

export function ResetPasswordClient({ locale }: { locale: Locale }) {
  const t = useTranslations("authFlow");
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (password.length < 8) {
      setError(t("passwordTooShort"));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("passwordMismatch"));
      return;
    }

    setError(null);
    setLoading(true);
    const response = await csrfFetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    setLoading(false);

    if (!response.ok) {
      setError(t("resetInvalid"));
      return;
    }

    setSuccess(true);
    setTimeout(() => {
      router.push(`/${locale}/account`);
      router.refresh();
    }, 1200);
  }

  if (!token) {
    return (
      <section className="premium-shell flex min-h-[60vh] items-center justify-center py-16 text-center">
        <div>
          <p className="text-muted-foreground">{t("resetInvalid")}</p>
          <Link href={`/${locale}/forgot-password`} className="mt-4 block text-sm underline">
            {t("backToLogin")}
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="premium-shell flex min-h-[60vh] items-center justify-center py-16">
      <div className="w-full max-w-md rounded-lg border border-border bg-card/65 p-8">
        <h1 className="text-3xl font-light">{t("resetTitle")}</h1>
        <p className="mt-3 text-sm text-muted-foreground">{t("resetCopy")}</p>

        {success ? (
          <p className="mt-6 text-sm text-foreground">{t("resetSuccess")}</p>
        ) : (
          <form className="mt-6 space-y-3" onSubmit={handleSubmit}>
            <Input
              type="password"
              name="new-password"
              autoComplete="new-password"
              placeholder={t("newPassword")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Input
              type="password"
              name="confirm-new-password"
              autoComplete="new-password"
              placeholder={t("confirmPassword")}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
            <Button type="submit" className="w-full" disabled={loading}>
              {t("resetSubmit")}
            </Button>
          </form>
        )}
      </div>
    </section>
  );
}
