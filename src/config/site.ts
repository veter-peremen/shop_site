export const siteConfig = {
  name: "SONKEI",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://sonkei.ru",
  telegram: "https://t.me/Sonkei_ru",
  phone: "8 800 707-90-16",
  phoneHref: "tel:+78007079016",
  email: "info@sonkei.ru",
  emailHref: "mailto:info@sonkei.ru",
  legal: {
    company: "ООО «Сонкей»",
    innKpp: "1655444739 / 165501001",
    ogrn: "1201600072541",
  },
  warehouse:
    "Московская область, г. Домодедово, мкр. Белые Столбы, Индустриальный парк «Южные Врата», склады 104, 6 линия, строение 2, ворота с 611 по 617",
  nav: [
    { href: "/catalog", label: "catalog" },
    { href: "/contacts", label: "contacts" },
    { href: "/cooperation", label: "cooperation" },
    { href: "/account", label: "account" },
  ],
  footerNav: [
    { href: "/catalog", label: "catalog" },
    { href: "/contacts", label: "contacts" },
    { href: "/cooperation", label: "wholesale" },
    { href: "/privacy", label: "privacy" },
    { href: "/offer", label: "offer" },
  ],
};
