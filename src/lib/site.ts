/** Site-wide settings. Most can be overridden with environment variables. */
export const siteConfig = {
  name: "Management Premier League",
  shortName: "MPL",
  description:
    "The Management Premier League – the MBA sports festival with Cricket, Volleyball and Football: teams, players and live scores.",
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "mpl@yourcollege.edu",
  contactPhone: process.env.NEXT_PUBLIC_CONTACT_PHONE || "+91 00000 00000",
  /** Prefix shown before every amount. */
  currencySymbol: "₹",
};
