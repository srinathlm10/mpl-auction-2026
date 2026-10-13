import { SiteHeader } from "@/components/layout/SiteHeader";

/** Auction screens: the site menu on top (hidden in full screen), the auction below. */
export default function AuctionLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      {children}
    </>
  );
}
