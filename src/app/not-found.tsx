import { Compass } from "lucide-react";
import Link from "next/link";
import { cookies } from "next/headers";

import { Button } from "@/components/ui/button";
import { isLocale } from "@/i18n/routing";

export default async function NotFound() {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value ?? "";
  const locale = isLocale(cookieLocale) ? cookieLocale : "ru";

  return (
    <section className="premium-shell flex min-h-screen items-center justify-center py-16">
      <div className="max-w-lg text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-border bg-card">
          <Compass className="h-8 w-8 text-bronze" />
        </div>
        <p className="mt-8 text-sm uppercase tracking-wide text-muted-foreground">404</p>
        <h1 className="mt-4 text-4xl font-light sm:text-5xl">
          {locale === "ru" ? "Страница не найдена" : "Page not found"}
        </h1>
        <p className="mt-4 leading-7 text-muted-foreground">
          {locale === "ru"
            ? "Похоже, эта страница была перемещена или удалена. Загляните в каталог — там всё на месте."
            : "This page may have been moved or removed. The catalog is a good place to start instead."}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild>
            <Link href={`/${locale}`}>{locale === "ru" ? "На главную" : "Back home"}</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href={`/${locale}/catalog`}>{locale === "ru" ? "В каталог" : "Open catalog"}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
