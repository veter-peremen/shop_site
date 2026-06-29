import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import type { Locale, Product } from "@/types/product";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, locale: Locale = "ru") {
  return new Intl.NumberFormat(locale === "ru" ? "ru-RU" : "en-US", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(value);
}

export function localizedProductName(product: Product, locale: Locale) {
  return locale === "ru" ? product.nameRu : product.nameEn;
}

export function localizedProductShort(product: Product, locale: Locale) {
  return locale === "ru" ? product.shortRu : product.shortEn;
}

export function localizedProductDescription(product: Product, locale: Locale) {
  return locale === "ru" ? product.descriptionRu : product.descriptionEn;
}

export function lineLabel(line: Product["line"], locale: Locale) {
  const labels = {
    premium: { ru: "Premium", en: "Premium" },
    ultrathin: { ru: "Super thin", en: "Ultra Thin" },
    daily: { ru: "Daily Soft", en: "Daily Soft" },
  };

  return labels[line][locale];
}

export function categoryLabel(category: Product["category"], locale: Locale) {
  const labels = {
    pants: { ru: "Трусики", en: "Pants" },
    diapers: { ru: "Подгузники", en: "Diapers" },
  };

  return labels[category][locale];
}

export function absoluteUrl(path = "") {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://sonkei.ru";
  return `${base}${path}`;
}
