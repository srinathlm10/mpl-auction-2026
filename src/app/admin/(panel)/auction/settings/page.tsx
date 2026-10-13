import { SettingsForm } from "@/components/admin/SettingsForm";

export default function AuctionSettingsPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-5 font-display text-4xl font-extrabold uppercase tracking-wide">Auction settings</h1>
      <SettingsForm />
    </div>
  );
}
