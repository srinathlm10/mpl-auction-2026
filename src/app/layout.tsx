import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Saira_Condensed } from "next/font/google";
import { siteConfig } from "@/lib/site";
import "./globals.css";

// Body: Plus Jakarta Sans (clear at small sizes). Headings and numbers: Saira Condensed
// (scoreboard style, with a proper ₹ sign).
const sans = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const display = Saira_Condensed({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: `${siteConfig.name} – Player Auction`, template: `%s · ${siteConfig.shortName}` },
  description: siteConfig.description,
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f6fb" },
    { media: "(prefers-color-scheme: dark)", color: "#070a17" },
  ],
};

// Runs before first paint so the saved theme never flashes.
const themeScript = `try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}`;

// Netlify inserts a comment (and line breaks) into <head> when it serves a page. React sees that as a
// mismatch and rebuilds the whole page in the browser on every load, so take it out before React starts.
const cleanHeadScript = `try{[].slice.call(document.head.childNodes).forEach(function(n){if((n.nodeType===8&&/netlify/i.test(n.nodeValue))||(n.nodeType===3&&!n.nodeValue.trim()))n.remove()})}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script dangerouslySetInnerHTML={{ __html: cleanHeadScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
