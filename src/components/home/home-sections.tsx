"use client";

import gsap from "gsap";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { ArrowRight, Ban, Check, Clock, Droplets, ShieldCheck, Sparkles, Wind } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";

import { ProductCard } from "@/components/product/product-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/routing";
import {
  cn,
  formatCurrency,
  lineLabel,
  localizedProductName,
  localizedProductShort,
} from "@/lib/utils";
import type { Product } from "@/types/product";

export function HeroSection({ locale, featured }: { locale: Locale; featured: Product }) {
  const t = useTranslations("home");
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 80, damping: 24 });
  const springY = useSpring(mouseY, { stiffness: 80, damping: 24 });
  const transform = useMotionTemplate`rotateY(${springX}deg) rotateX(${springY}deg)`;
  const heroTextY = useTransform(scrollYProgress, [0, 1], [0, 88]);
  const heroProductY = useTransform(scrollYProgress, [0, 1], [0, -62]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.72], [1, 0.18]);
  const rail = [
    locale === "ru" ? "мягкость" : "softness",
    locale === "ru" ? "сухость 12h" : "12h dryness",
    locale === "ru" ? "дышащие слои" : "breathable layers",
    locale === "ru" ? "японский абсорбент" : "Japanese absorbent",
    locale === "ru" ? "без отдушек" : "fragrance-free",
  ];

  useEffect(() => {
    if (!ref.current) return;

    const ctx = gsap.context(() => {
      gsap.to(".quiet-particle", {
        x: "random(-24, 24)",
        y: "random(-18, 18)",
        opacity: "random(0.18, 0.46)",
        duration: "random(4, 8)",
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        stagger: 0.12,
      });
    }, ref);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={ref}
      className="relative isolate min-h-[calc(100vh-72px)] overflow-hidden border-b border-border/60 bg-[linear-gradient(180deg,rgba(255,252,245,0.72),rgba(238,230,217,0.38)_58%,transparent)] dark:bg-[linear-gradient(180deg,rgba(30,27,24,0.88),rgba(27,24,21,0.62)_58%,transparent)]"
      onMouseMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        mouseX.set(x * 7);
        mouseY.set(y * -5);
      }}
    >
      <div className="soft-grid absolute inset-0 opacity-70" />
      <div className="silk-veil" />
      <div className="grain-layer" />
      <span className="kinetic-line left-[9%] top-[22%]" />
      <span className="kinetic-line right-[14%] top-[18%]" />
      <span className="kinetic-line bottom-[18%] left-[42%]" />
      {Array.from({ length: 16 }).map((_, index) => (
        <span
          key={index}
          className="quiet-particle"
          style={{
            left: `${8 + ((index * 17) % 84)}%`,
            top: `${14 + ((index * 23) % 62)}%`,
          }}
        />
      ))}

      <div className="premium-shell relative grid min-h-[calc(100vh-72px)] items-center gap-10 py-12 lg:grid-cols-[0.92fr_1.08fr]">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ y: heroTextY, opacity: heroOpacity }}
          transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 max-w-3xl"
        >
          <div className="inline-flex items-center gap-3 rounded-full border border-border bg-card/70 px-4 py-2 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur-xl">
            <span className="h-px w-8 bg-bronze/70" />
            {t("eyebrow")}
          </div>
          <h1 className="mt-7 max-w-[760px] text-5xl font-light leading-[1.02] text-foreground sm:text-6xl xl:text-7xl">
            <motion.span
              initial={{ opacity: 0, y: 28, filter: "blur(12px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
              className="block"
            >
              {t("heroTitle")}
            </motion.span>
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-muted-foreground sm:text-xl">
            {t("heroCopy")}
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href={`/${locale}/catalog`}>
                {t("catalogCta")}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href={`/${locale}/catalog?size=M`}>{t("sizeCta")}</Link>
            </Button>
          </div>
          <div className="mt-10 grid max-w-2xl gap-3 text-sm text-muted-foreground sm:grid-cols-3">
            {[t("trustA"), t("trustB"), t("trustC")].map((item) => (
              <motion.div
                key={item}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.55 }}
                className="flex items-center gap-2 rounded-full border border-border/70 bg-card/50 px-3 py-2 backdrop-blur-xl"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full border border-bronze/40 text-bronze">
                  <Check className="h-3.5 w-3.5" />
                </span>
                {item}
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div
          style={{ transform, y: heroProductY }}
          className="lift-card relative mx-auto w-full max-w-[680px]"
        >
          <div className="absolute -inset-8 -z-10 rounded-[40px] border border-border/50 bg-card/30 blur-2xl" />
          <div className="premium-surface rounded-lg p-3">
            <div className="relative aspect-[0.86] overflow-hidden rounded-lg bg-[linear-gradient(145deg,rgba(255,252,245,0.9),rgba(221,209,189,0.62)_52%,rgba(250,247,240,0.94))] dark:bg-[linear-gradient(145deg,rgba(52,47,41,0.9),rgba(38,34,30,0.92)_52%,rgba(72,61,49,0.62))]">
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.38),transparent_28%,transparent_72%,rgba(155,132,101,0.18))] dark:bg-[linear-gradient(90deg,rgba(255,255,255,0.08),transparent_28%,transparent_72%,rgba(203,184,146,0.12))]" />
              {featured.images[0] ? (
                <Image
                  src={featured.images[0]}
                  alt={localizedProductName(featured, locale)}
                  fill
                  priority
                  sizes="(min-width: 1024px) 48vw, 92vw"
                  className="object-cover opacity-[0.16] blur-[1px] saturate-[0.35] contrast-[0.82]"
                  style={{ objectPosition: "center bottom" }}
                />
              ) : null}
              <motion.div
                className="absolute left-[10%] top-[10%] w-[58%] max-w-[360px] origin-bottom rounded-[26px] border border-white/55 bg-[linear-gradient(155deg,rgba(255,252,245,0.96),rgba(235,226,211,0.9)_54%,rgba(248,244,235,0.98))] p-6 shadow-[0_34px_90px_rgba(55,52,48,0.22)] dark:border-white/10 dark:bg-[linear-gradient(155deg,rgba(64,57,49,0.96),rgba(38,34,30,0.96)_54%,rgba(83,69,54,0.82))]"
                animate={{ y: [0, -12, 0], rotate: [-4, -2.6, -4] }}
                transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
              >
                <div className="flex items-center justify-between text-xs uppercase text-muted-foreground">
                  <span>SONKEI</span>
                  <span>{featured.size}</span>
                </div>
                <div className="mt-12 h-px w-full bg-gradient-to-r from-transparent via-bronze/45 to-transparent" />
                <div className="mt-10">
                  <p className="text-5xl font-light tracking-normal sm:text-6xl">SONKEI</p>
                  <p className="mt-2 text-xs uppercase text-muted-foreground">Japanese quality</p>
                </div>
                <div className="mt-10 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg border border-border/70 bg-background/55 p-3 backdrop-blur-xl">
                    <p className="text-xs text-muted-foreground">{locale === "ru" ? "вес" : "weight"}</p>
                    <p className="mt-1 font-medium">{featured.weightRange}</p>
                  </div>
                  <div className="rounded-lg border border-border/70 bg-background/55 p-3 backdrop-blur-xl">
                    <p className="text-xs text-muted-foreground">{locale === "ru" ? "сухость" : "dryness"}</p>
                    <p className="mt-1 font-medium">12h</p>
                  </div>
                </div>
              </motion.div>
              <motion.div
                className="absolute bottom-[15%] right-[8%] h-[28%] w-[48%] rounded-[54%_46%_48%_52%] border border-white/55 bg-[linear-gradient(145deg,rgba(255,255,255,0.72),rgba(221,209,189,0.38))] shadow-[0_26px_70px_rgba(55,52,48,0.14)] backdrop-blur-xl dark:border-white/10 dark:bg-[linear-gradient(145deg,rgba(238,226,206,0.2),rgba(255,255,255,0.05))]"
                animate={{ y: [0, 10, 0], rotate: [1.5, 0, 1.5] }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(248,244,235,0.08),transparent_32%,rgba(34,30,26,0.18))]" />
              <div className="absolute left-5 top-5 rounded-full border border-white/45 bg-background/75 px-4 py-2 text-xs text-muted-foreground backdrop-blur-xl dark:border-white/10">
                SONKEI · {featured.size}
              </div>
              <div className="absolute bottom-5 left-5 right-5 rounded-lg border border-white/45 bg-background/80 p-4 backdrop-blur-2xl dark:border-white/10">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm text-muted-foreground">{featured.size} · {featured.weightRange}</p>
                    <p className="mt-1 line-clamp-1 font-medium">{localizedProductName(featured, locale)}</p>
                  </div>
                  <p className="shrink-0 text-lg font-medium">{formatCurrency(featured.price, locale)}</p>
                </div>
              </div>
            </div>
          </div>
          {[
            ["Dry touch", "12h", "-right-3 top-10"],
            ["Reward", `+${featured.bonusPoints}`, "-left-3 bottom-28"],
            [locale === "ru" ? "Без отдушек" : "Fragrance free", "0%", "right-8 bottom-36"],
          ].map(([label, value, position], index) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 18, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.55 + index * 0.12, duration: 0.6 }}
              className={`absolute hidden rounded-lg border border-border bg-card/80 p-4 shadow-premium backdrop-blur-xl sm:block ${position}`}
            >
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 text-2xl font-light">{value}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
      <div className="premium-shell pointer-events-none absolute inset-x-0 bottom-5 hidden lg:block">
        <div className="cinematic-mask overflow-hidden border-y border-border/70 py-3 text-xs uppercase text-muted-foreground">
          <div className="word-rail flex w-max gap-10">
            {[...rail, ...rail, ...rail, ...rail].map((word, index) => (
              <span key={`${word}-${index}`} className="inline-flex items-center gap-10">
                {word}
                <span className="h-px w-12 bg-bronze/40" />
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function StorySection({ locale }: { locale: Locale }) {
  const t = useTranslations("home");
  const cards = [
    {
      icon: ShieldCheck,
      title: locale === "ru" ? "Японское качество" : "Japanese quality",
      copy:
        locale === "ru"
          ? "Сдержанная система ухода без лишнего шума: материалы, посадка и сухость работают вместе."
          : "A restrained care system: material, fit and dryness work together without noise.",
    },
    {
      icon: Sparkles,
      title: locale === "ru" ? "Мягкость к коже" : "Skin softness",
      copy:
        locale === "ru"
          ? "Деликатное касание и дышащая структура для ежедневного контакта с кожей малыша."
          : "A delicate touch and breathable structure for everyday contact with baby skin.",
    },
    {
      icon: Check,
      title: locale === "ru" ? "День и ночь" : "Day and night",
      copy:
        locale === "ru"
          ? "Защита рассчитана на спокойные прогулки, сон и активное движение."
          : "Protection designed for calm walks, sleep and active movement.",
    },
  ];

  return (
    <section className="relative overflow-hidden py-28">
      <div className="silk-veil opacity-60" />
      <div className="premium-shell">
        <div className="grid gap-10 lg:grid-cols-[0.88fr_1.12fr]">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-120px" }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            className="lg:sticky lg:top-28 lg:h-fit"
          >
            <div className="inline-flex items-center gap-3 rounded-full border border-border bg-card/60 px-4 py-2 text-xs uppercase text-muted-foreground backdrop-blur-xl">
              <span className="h-px w-8 bg-bronze/70" />
              SONKEI method
            </div>
            <h2 className="mt-7 max-w-xl text-4xl font-light leading-tight sm:text-5xl">
              {t("storyTitle")}
            </h2>
            <p className="mt-6 max-w-lg text-lg leading-8 text-muted-foreground">
              {t("storyCopy")}
            </p>
            <div className="mt-10 grid max-w-xl grid-cols-2 gap-3">
              {[
                [locale === "ru" ? "Сухость" : "Dryness", "12h"],
                [locale === "ru" ? "Отзывы" : "Reviews", "98%"],
                [locale === "ru" ? "Линейки" : "Lines", "3"],
                [locale === "ru" ? "SKU" : "SKUs", "12"],
              ].map(([label, value], index) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05, duration: 0.5 }}
                  className="rounded-lg border border-border/70 bg-card/45 p-4 backdrop-blur-xl"
                >
                  <p className="text-xs uppercase text-muted-foreground">{label}</p>
                  <p className="mt-3 text-3xl font-light">{value}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <div className="grid gap-4">
            <motion.article
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-120px" }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="premium-surface rounded-lg p-7 sm:p-9"
            >
              <div className="relative z-10 grid gap-8 md:grid-cols-[0.78fr_1.22fr] md:items-end">
                <div>
                  <ShieldCheck className="h-6 w-6 text-bronze" />
                  <h3 className="mt-8 text-3xl font-light leading-tight">
                    {locale === "ru" ? "Уход без визуального шума" : "Care without visual noise"}
                  </h3>
                </div>
                <p className="text-base leading-8 text-muted-foreground">
                  {locale === "ru"
                    ? "Мы оставили главное: сухость, посадку, мягкий контакт и понятные размеры. Визуально это должно ощущаться как дорогой предмет ухода, а не карточка маркетплейса."
                    : "We keep the essentials: dryness, fit, soft contact and clear sizing. Visually it should feel like a refined care object, not a marketplace tile."}
                </p>
              </div>
              <div className="kinetic-line bottom-7 left-9" />
            </motion.article>

            <div className="grid gap-4 md:grid-cols-3">
              {cards.map((card, index) => {
                const Icon = card.icon;
                return (
                  <motion.article
                    key={card.title}
                    initial={{ opacity: 0, y: 26 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-80px" }}
                    whileHover={{ y: -6 }}
                    transition={{ delay: index * 0.08, duration: 0.55 }}
                    className="group rounded-lg border border-border/70 bg-card/55 p-6 shadow-sm backdrop-blur-xl transition duration-500 hover:border-bronze/40 hover:shadow-premium"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background/70 transition duration-500 group-hover:border-bronze/50 group-hover:text-bronze">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-8 text-xl font-medium">{card.title}</h3>
                    <p className="mt-4 text-sm leading-7 text-muted-foreground">{card.copy}</p>
                  </motion.article>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function ProductShowcase({ locale, products }: { locale: Locale; products: Product[] }) {
  const t = useTranslations("home");
  const lead = products[0];
  const secondary = products.slice(1);

  return (
    <section className="relative overflow-hidden border-y border-border/70 bg-[linear-gradient(180deg,rgba(221,209,189,0.34),rgba(248,244,235,0.72)_42%,rgba(221,209,189,0.26))] py-28 dark:bg-[linear-gradient(180deg,rgba(38,34,30,0.68),rgba(30,27,24,0.92)_42%,rgba(51,44,37,0.48))]">
      <div className="soft-grid absolute inset-0 opacity-50" />
      <div className="grain-layer" />
      <span className="kinetic-line right-[10%] top-[18%]" />
      <span className="kinetic-line bottom-[14%] left-[12%]" />
      <div className="premium-shell">
        <div className="relative z-10 mb-12 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <Badge variant="bronze">{locale === "ru" ? "Каталог ухода" : "Care catalog"}</Badge>
            <h2 className="mt-5 text-4xl font-light leading-tight sm:text-5xl">{t("showcaseTitle")}</h2>
            <p className="mt-5 text-lg leading-8 text-muted-foreground">{t("showcaseCopy")}</p>
          </div>
          <Button asChild variant="secondary" className="w-fit">
            <Link href={`/${locale}/catalog`}>
              {t("catalogCta")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="relative z-10 grid gap-5 lg:grid-cols-[1.12fr_0.88fr]">
          {lead ? (
            <motion.article
              initial={{ opacity: 0, y: 34 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-120px" }}
              whileHover={{ y: -8 }}
              transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
              className="premium-surface rounded-lg p-4"
            >
              <div className="relative z-10 grid h-full gap-5 lg:grid-rows-[1fr_auto]">
                <Link
                  href={`/${locale}/product/${lead.slug}`}
                  className="group relative block min-h-[440px] overflow-hidden rounded-lg bg-[linear-gradient(145deg,rgba(255,252,245,0.94),rgba(221,209,189,0.58)_56%,rgba(248,244,235,0.9))] dark:bg-[linear-gradient(145deg,rgba(48,43,38,0.95),rgba(30,27,24,0.98)_56%,rgba(75,62,49,0.52))] sm:min-h-[520px]"
                >
                  <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.36),transparent_28%,transparent_76%,rgba(155,132,101,0.18))] dark:bg-[linear-gradient(90deg,rgba(255,255,255,0.08),transparent_28%,transparent_76%,rgba(203,184,146,0.12))]" />
                  {lead.images[0] ? (
                    <Image
                      src={lead.images[0]}
                      alt={localizedProductName(lead, locale)}
                      fill
                      sizes="(min-width: 1024px) 58vw, 92vw"
                      className="object-cover opacity-[0.9] saturate-[0.82] contrast-[0.96] transition duration-1000 group-hover:scale-105 group-hover:saturate-100"
                      style={{ objectPosition: "center bottom" }}
                    />
                  ) : null}
                  <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-background/90 via-background/34 to-transparent" />
                  <div className="absolute left-5 top-5 rounded-full border border-white/45 bg-background/75 px-4 py-2 text-xs text-muted-foreground backdrop-blur-xl dark:border-white/10">
                    {lineLabel(lead.line, locale)} · {lead.size}
                  </div>
                  <div className="absolute bottom-5 left-5 right-5 grid gap-3 rounded-lg border border-white/45 bg-background/80 p-5 backdrop-blur-2xl dark:border-white/10 sm:grid-cols-[1fr_auto] sm:items-end">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {lead.count} {locale === "ru" ? "шт" : "pcs"} · {lead.weightRange}
                      </p>
                      <h3 className="mt-2 text-2xl font-light leading-tight">
                        {localizedProductName(lead, locale)}
                      </h3>
                    </div>
                    <p className="text-2xl font-medium">{formatCurrency(lead.price, locale)}</p>
                  </div>
                </Link>

                <div className="grid gap-4 rounded-lg border border-border/70 bg-card/45 p-5 backdrop-blur-xl md:grid-cols-[1fr_auto] md:items-center">
                  <div>
                    <p className="text-sm leading-7 text-muted-foreground">
                      {localizedProductShort(lead, locale)}
                    </p>
                  </div>
                  <Button asChild>
                    <Link href={`/${locale}/product/${lead.slug}`}>
                      {locale === "ru" ? "Открыть продукт" : "Open product"}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </motion.article>
          ) : null}

          <div className="grid gap-5 sm:grid-cols-3 lg:grid-cols-1">
            {secondary.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                locale={locale}
                priority={index < 1}
                compact
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function WholesaleCtaSection({ locale }: { locale: Locale }) {
  const t = useTranslations("home");

  return (
    <section className="premium-shell py-12">
      <motion.div
        initial={{ opacity: 0, y: 22 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6 }}
        className="premium-surface rounded-lg p-5 md:p-7"
      >
        <div className="relative z-10 grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
          <div className="max-w-3xl">
            <p className="text-xs font-medium uppercase text-bronze">{t("wholesaleEyebrow")}</p>
            <h2 className="mt-2 text-2xl font-light">{t("wholesaleTitle")}</h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">{t("wholesaleCopy")}</p>
          </div>
          <Button asChild variant="secondary" className="w-fit shrink-0">
            <Link href={`/${locale}/cooperation`}>
              {t("wholesaleCta")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="kinetic-line bottom-4 right-8" />
      </motion.div>
    </section>
  );
}

export function CareDetailsSection({ locale }: { locale: Locale }) {
  const t = useTranslations("home");
  const details = [
    {
      icon: ShieldCheck,
      title: locale === "ru" ? "Анатомическая посадка" : "Anatomical fit",
      copy:
        locale === "ru"
          ? "Свободная выкройка подходит девочкам и мальчикам, а двойные манжеты помогают защищать от протеканий."
          : "A free anatomical cut works for girls and boys, while double cuffs help protect from leaks.",
    },
    {
      icon: Wind,
      title: locale === "ru" ? "Дышащие слои" : "Breathable layers",
      copy:
        locale === "ru"
          ? "Воздушные каналы отводят тепло и влагу, сохраняя мягкий микроклимат внутри."
          : "Air channels help move heat and moisture away, keeping a softer inner climate.",
    },
    {
      icon: Droplets,
      title: locale === "ru" ? "Японский абсорбент" : "Japanese absorbent",
      copy:
        locale === "ru"
          ? "SUMITOMO-полимер быстро превращает жидкость в гель и удерживает влагу даже под давлением."
          : "SUMITOMO polymer turns liquid into gel quickly and holds moisture even under pressure.",
    },
    {
      icon: Clock,
      title: locale === "ru" ? "До 12 часов сухости" : "Up to 12h dryness",
      copy:
        locale === "ru"
          ? "Формат рассчитан на дневной ритм, прогулки и спокойную ночную защиту."
          : "Designed for daytime rhythm, walks and calm overnight protection.",
    },
    {
      icon: Sparkles,
      title: locale === "ru" ? "Индикатор наполнения" : "Wetness indicator",
      copy:
        locale === "ru"
          ? "Желтые полоски меняют цвет, когда подгузник пора заменить."
          : "Yellow lines change color when it is time to change the diaper.",
    },
    {
      icon: Ban,
      title: locale === "ru" ? "Без лишних компонентов" : "No extra irritants",
      copy:
        locale === "ru"
          ? "Без спирта, хлора, отдушек и латекса — для спокойного контакта с кожей."
          : "No alcohol, chlorine, fragrances or latex for calmer skin contact.",
    },
  ];

  return (
    <section className="relative overflow-hidden py-28">
      <div className="premium-shell">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.62 }}
            className="lg:sticky lg:top-28 lg:h-fit"
          >
            <Badge variant="bronze">{t("reviewsTrust")}</Badge>
            <h2 className="mt-6 max-w-xl text-4xl font-light leading-tight sm:text-5xl">
              {t("detailsTitle")}
            </h2>
            <p className="mt-6 max-w-lg text-lg leading-8 text-muted-foreground">
              {t("detailsCopy")}
            </p>
            <div className="mt-10 hidden max-w-lg overflow-hidden rounded-lg border border-border/70 bg-card/45 backdrop-blur-xl lg:block">
              {[
                locale === "ru" ? "без спирта" : "alcohol-free",
                locale === "ru" ? "без хлора" : "chlorine-free",
                locale === "ru" ? "без латекса" : "latex-free",
              ].map((item) => (
                <div key={item} className="flex items-center justify-between border-b border-border/70 px-5 py-4 last:border-0">
                  <span className="text-sm text-muted-foreground">{item}</span>
                  <Check className="h-4 w-4 text-bronze" />
                </div>
              ))}
            </div>
          </motion.div>

          <div className="grid gap-4 sm:grid-cols-2">
            {details.map((item, index) => {
              const Icon = item.icon;
              const wide = index === 0 || index === 3;

              return (
                <motion.article
                  key={item.title}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  whileHover={{ y: -6 }}
                  transition={{ delay: index * 0.04, duration: 0.55 }}
                  className={cn(
                    "group premium-surface rounded-lg p-6 transition duration-500 hover:border-bronze/40",
                    wide && "sm:col-span-2",
                  )}
                >
                  <div className={cn("relative z-10", wide && "sm:grid sm:grid-cols-[0.78fr_1.22fr] sm:gap-8 sm:items-end")}>
                    <div>
                      <div className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background/70 transition duration-500 group-hover:border-bronze/50 group-hover:text-bronze">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="mt-6 text-xl font-medium">{item.title}</h3>
                    </div>
                    <p className={cn("mt-3 text-sm leading-7 text-muted-foreground", wide && "sm:mt-0")}>
                      {item.copy}
                    </p>
                  </div>
                </motion.article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

export function LoyaltySection({ locale }: { locale: Locale }) {
  const t = useTranslations("home");
  const tiers = [
    ["Silk", "0-999", "3%"],
    ["Calm", "1 000-4 999", "5%"],
    ["Sora", "5 000+", "7%"],
  ];

  return (
    <section className="relative overflow-hidden py-28">
      <div className="silk-veil opacity-50" />
      <div className="premium-shell">
        <div className="grid gap-8 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-120px" }}
            transition={{ duration: 0.65 }}
          >
            <Badge variant="bronze">SONKEI rewards</Badge>
            <h2 className="mt-6 max-w-xl text-4xl font-light leading-tight sm:text-5xl">
              {t("loyaltyTitle")}
            </h2>
            <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
              {t("loyaltyCopy")}
            </p>
            <Button asChild className="mt-8" variant="secondary">
              <Link href={`/${locale}/account`}>
                {locale === "ru" ? "Открыть кабинет" : "Open account"}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </motion.div>

          <div className="grid gap-4">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-120px" }}
              transition={{ duration: 0.65 }}
              className="premium-surface rounded-lg p-6"
            >
              <div className="relative z-10">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">
                      {locale === "ru" ? "Пример баланса" : "Sample balance"}
                    </p>
                    <p className="mt-2 text-4xl font-light">1 240</p>
                  </div>
                  <div className="rounded-full border border-bronze/35 px-4 py-2 text-sm text-bronze">
                    Calm
                  </div>
                </div>
                <div className="mt-8 h-2 overflow-hidden rounded-full bg-secondary">
                  <motion.div
                    initial={{ width: "18%" }}
                    whileInView={{ width: "62%" }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                    className="h-full rounded-full bg-bronze"
                  />
                </div>
                <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Silk</span>
                  <span>Sora</span>
                </div>
              </div>
            </motion.div>

            <div className="grid gap-4 sm:grid-cols-3">
              {tiers.map(([tier, range, bonus], index) => (
                <motion.div
                  key={tier}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  whileHover={{ y: -5 }}
                  transition={{ delay: index * 0.07, duration: 0.52 }}
                  className="rounded-lg border border-border/70 bg-card/55 p-5 shadow-sm backdrop-blur-xl transition duration-500 hover:border-bronze/40 hover:shadow-premium"
                >
                  <p className="text-lg font-medium">{tier}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{range} pts</p>
                  <p className="mt-7 text-3xl font-light">{bonus}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
