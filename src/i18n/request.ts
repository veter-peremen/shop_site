import { getRequestConfig } from "next-intl/server";

import { defaultLocale, isLocale } from "@/i18n/routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = requested && isLocale(requested) ? requested : defaultLocale;

  return {
    locale,
    timeZone: "Europe/Moscow",
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
