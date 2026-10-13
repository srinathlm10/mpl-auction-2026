import { redirect } from "next/navigation";

/** Old address of the control screen – the auction now runs at /auction. */
export default function AuctionControlPage() {
  redirect("/auction");
}
