/** Site-wide settings. Most can be overridden with environment variables. */
export const siteConfig = {
  name: "Management Premiere League",
  shortName: "MPL",
  description:
    "The Management Premiere League – the MBA sports festival with Cricket, Volleyball and Football player auctions.",
  /** ISO date (YYYY-MM-DD) shown on the home page. */
  auctionDate: process.env.NEXT_PUBLIC_AUCTION_DATE || "2026-11-14",
  /** Shown next to the date on the home page. */
  venue: process.env.NEXT_PUBLIC_AUCTION_VENUE || "Conference Hall, School of Management",
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "mpl@yourcollege.edu",
  contactPhone: process.env.NEXT_PUBLIC_CONTACT_PHONE || "+91 00000 00000",
  /** Prefix shown before every amount. */
  currencySymbol: "₹",
};
