"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Locale } from "@/i18n/routing";
import { csrfFetch } from "@/lib/csrf-client";
import { useCommerceStore } from "@/store/commerce-store";

type Captcha = { question: string; token: string };

export function RegisterClient({ locale }: { locale: Locale }) {
  const t = useTranslations("authFlow");
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [captcha, setCaptcha] = useState<Captcha | null>(null);
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadCaptcha() {
    const response = await fetch("/api/auth/captcha");
    const data = await response.json();
    setCaptcha(data);
    setCaptchaAnswer("");
  }

  useEffect(() => {
    loadCaptcha();
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!captcha) return;

    setLoading(true);
    setError(null);
    const response = await csrfFetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        locale,
        captchaToken: captcha.token,
        captchaAnswer,
      }),
    });
    setLoading(false);

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(
        data?.error === "email-taken"
          ? t("registerEmailTaken")
          : data?.error === "invalid-captcha"
            ? t("captchaError")
            : t("registerPasswordTooShort"),
      );
      await loadCaptcha();
      return;
    }

    await Promise.all([
      useCommerceStore.getState().loadCart(),
      useCommerceStore.getState().loadWishlist(),
      useCommerceStore.getState().loadBonusBalance(),
    ]);
    router.push(`/${locale}/account`);
    router.refresh();
  }

  return (
    <section className="premium-shell flex min-h-[60vh] items-center justify-center py-16">
      <div className="w-full max-w-md rounded-lg border border-border bg-card/65 p-8">
        <h1 className="text-3xl font-light">{t("registerTitle")}</h1>
        <p className="mt-3 text-sm text-muted-foreground">{t("registerCopy")}</p>

        <form className="mt-6 space-y-3" autoComplete="on" onSubmit={handleSubmit}>
          <Input
            placeholder={t("email")}
            type="email"
            name="registration-email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            placeholder={t("password")}
            type="password"
            name="new-password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {captcha ? (
            <div className="flex items-center gap-3">
              <div className="flex h-10 min-w-[110px] items-center justify-center rounded-md border border-border bg-background/70 px-3 text-sm font-medium tracking-wide select-none">
                {captcha.question} = ?
              </div>
              <Input
                placeholder={t("captchaPlaceholder")}
                inputMode="numeric"
                autoComplete="off"
                value={captchaAnswer}
                onChange={(e) => setCaptchaAnswer(e.target.value)}
              />
            </div>
          ) : null}

          {error ? <p className="text-xs text-destructive">{error}</p> : null}

          <Button
            type="submit"
            variant="secondary"
            className="w-full"
            disabled={loading || !email || password.length < 8 || !captchaAnswer}
          >
            {t("continue")}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {t("haveAccount")}{" "}
          <Link href={`/${locale}/login`} className="text-foreground underline">
            {t("goToLogin")}
          </Link>
        </p>
      </div>
    </section>
  );
}
