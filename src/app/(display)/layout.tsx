import { SiteHeader } from "@/components/layout/SiteHeader";

export const revalidate = 300;

/** Auction screens: the site menu on top (hidden in full screen), the auction below. */
export default function AuctionLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      {children}
    </>
  );
}
