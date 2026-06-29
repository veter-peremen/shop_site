import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";
import { locales } from "@/i18n/routing";
import { getAllProducts } from "@/lib/products";

// Revalidate periodically so the sitemap picks up new products without a rebuild —
// matters when the DB is empty/unreachable at build time (e.g. a fresh Docker image).
export const revalidate = 60;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = [
    "",
    "/catalog",
    "/contacts",
    "/cooperation",
    "/privacy",
    "/offer",
    "/cart",
    "/account",
    "/admin",
  ];
  // If the database isn't reachable at build time (e.g. building a Docker image
  // without a live DB), fall back to just the static routes instead of failing the build.
  const products = await getAllProducts().catch(() => []);
  const productRoutes = products.map((product) => `/product/${product.slug}`);

  return locales.flatMap((locale) =>
    [...staticRoutes, ...productRoutes].map((route) => ({
      url: `${siteConfig.url}/${locale}${route}`,
      lastModified: new Date(),
      changeFrequency: route.startsWith("/product") ? "weekly" : "daily",
      priority: route === "" ? 1 : route.startsWith("/product") ? 0.8 : 0.7,
    })),
  );
}
