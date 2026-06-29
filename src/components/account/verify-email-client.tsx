"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/routing";
import { csrfFetch } from "@/lib/csrf-client";

export function VerifyEmailClient({ locale }: { locale: Locale }) {
  const t = useTranslations("authFlow");
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [status, setStatus] = useState<"pending" | "success" | "error">("pending");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      return;
    }

    csrfFetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((response) => setStatus(response.ok ? "success" : "error"))
      .catch(() => setStatus("error"));
  }, [token]);

  return (
    <section className="premium-shell flex min-h-[60vh] items-center justify-center py-16 text-center">
      <div className="w-full max-w-md rounded-lg border border-border bg-card/65 p-8">
        <h1 className="text-3xl font-light">{t("verifyTitle")}</h1>

        <p className="mt-4 text-sm text-muted-foreground">
          {status === "pending" ? t("verifyPending") : status === "success" ? t("verifySuccess") : t("verifyError")}
        </p>

        {status !== "pending" ? (
          <Button asChild className="mt-6">
            <Link href={`/${locale}/account`}>{t("goToAccount")}</Link>
          </Button>
        ) : null}
      </div>
    </section>
  );
}
