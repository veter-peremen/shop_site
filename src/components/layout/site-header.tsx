"use client";

import Link from "next/link";
import { Heart, Menu, ShoppingBag, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import type { Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { useCommerceStore } from "@/store/commerce-store";

export function SiteHeader({ locale }: { locale: Locale }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const cartCount = useCommerceStore((state) =>
    state.cart.reduce((total, item) => total + item.quantity, 0),
  );
  const wishlistCount = useCommerceStore((state) => state.wishlist.length);
  const loadCart = useCommerceStore((state) => state.loadCart);
  const loadWishlist = useCommerceStore((state) => state.loadWishlist);
  const loadBonusBalance = useCommerceStore((state) => state.loadBonusBalance);

  useEffect(() => {
    setMounted(true);
    loadCart();
    loadWishlist();
    loadBonusBalance();
  }, [loadCart, loadWishlist, loadBonusBalance]);

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/72 shadow-[0_1px_0_rgba(255,255,255,0.45)] backdrop-blur-2xl dark:shadow-[0_1px_0_rgba(255,255,255,0.06)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-champagne/70 to-transparent" />
      <div className="premium-shell flex h-[72px] items-center justify-between gap-4">
        <Logo locale={locale} />

        <nav className="hidden items-center gap-1 rounded-full border border-border/70 bg-card/55 p-1 shadow-sm backdrop-blur-xl lg:flex">
          {siteConfig.nav.map((item) => {
            const href = `/${locale}${item.href}`;
            const active = pathname === href || pathname.startsWith(`${href}/`);

            return (
              <Link
                key={item.href}
                href={href}
                className={cn(
                  "rounded-full px-4 py-2 text-sm text-muted-foreground transition duration-300 hover:bg-secondary/80 hover:text-foreground",
                  active && "bg-background/90 text-foreground shadow-sm",
                )}
              >
                {t(item.label)}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
          <LanguageSwitcher locale={locale} />
          <Button asChild variant="icon" size="icon" aria-label={t("wishlist")}>
            <Link href={`/${locale}/account`}>
              <Heart className="h-4 w-4" />
              {mounted && wishlistCount > 0 ? (
                <span className="absolute -mt-7 ml-7 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-bronze px-1 text-[10px] text-white">
                  {wishlistCount}
                </span>
              ) : null}
            </Link>
          </Button>
          <Button asChild variant="icon" size="icon" aria-label={t("account")}>
            <Link href={`/${locale}/account`}>
              <UserRound className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="default" aria-label={t("cart")}>
            <Link href={`/${locale}/cart`}>
              <ShoppingBag className="h-4 w-4" />
              {t("cart")}
              {mounted && cartCount > 0 ? (
                <span className="rounded-full bg-primary-foreground/15 px-2 py-0.5 text-xs">
                  {cartCount}
                </span>
              ) : null}
            </Link>
          </Button>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <Button asChild variant="icon" size="icon" aria-label={t("cart")}>
            <Link href={`/${locale}/cart`}>
              <ShoppingBag className="h-4 w-4" />
              {mounted && cartCount > 0 ? (
                <span className="absolute -mt-7 ml-7 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-bronze px-1 text-[10px] text-white">
                  {cartCount}
                </span>
              ) : null}
            </Link>
          </Button>
          <Button variant="icon" size="icon" onClick={() => setOpen((value) => !value)}>
            <Menu className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {open ? (
        <div className="border-t border-border/70 bg-background/95 px-4 py-4 md:hidden">
          <div className="grid gap-2">
            {siteConfig.nav.map((item) => (
              <Link
                key={item.href}
                href={`/${locale}${item.href}`}
                onClick={() => setOpen(false)}
                className={cn(
                  "rounded-full border border-border bg-card/70 px-4 py-3 text-sm transition",
                  pathname === `/${locale}${item.href}` && "border-bronze/50 bg-secondary/80",
                )}
              >
                {t(item.label)}
              </Link>
            ))}
            <div className="flex gap-2 pt-2">
              <ThemeToggle />
              <LanguageSwitcher locale={locale} />
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
