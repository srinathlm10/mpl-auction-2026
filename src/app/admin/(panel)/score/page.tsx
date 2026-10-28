import { ScoreConsole } from "@/components/admin/ScoreConsole";

export const metadata = { title: "Live scoring" };

export default function ScorePage() {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl font-extrabold uppercase tracking-wide">Live scoring</h1>
      <ScoreConsole />
    </div>
  );
}
