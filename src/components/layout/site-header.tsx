"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { Heart, Menu, ShoppingBag, UserRound, X } from "lucide-react";
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

      <AnimatePresence>
        {open && (
          <motion.div
            key="mobile-nav"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-0 z-[60] flex flex-col bg-background/97 backdrop-blur-2xl md:hidden"
          >
            <div className="flex h-[72px] items-center justify-between px-4">
              <Logo locale={locale} />
              <button
                onClick={() => setOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card/70 text-muted-foreground transition hover:bg-secondary"
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <motion.nav
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-1 flex-col justify-center gap-1 px-6"
            >
              {siteConfig.nav.map((item, idx) => (
                <motion.div
                  key={item.href}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + idx * 0.055, duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                >
                  <Link
                    href={`/${locale}${item.href}`}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "block rounded-xl px-5 py-4 text-2xl font-light transition duration-200 hover:bg-secondary/70 hover:text-foreground",
                      pathname === `/${locale}${item.href}`
                        ? "text-foreground"
                        : "text-muted-foreground",
                    )}
                  >
                    {t(item.label)}
                  </Link>
                </motion.div>
              ))}
            </motion.nav>
            <div className="flex items-center gap-3 px-6 pb-10 pt-6 border-t border-border/60">
              <ThemeToggle />
              <LanguageSwitcher locale={locale} />
              <Button asChild variant="default" className="ml-auto">
                <Link href={`/${locale}/cart`} onClick={() => setOpen(false)}>
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
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
