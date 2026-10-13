import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { about, auctionRules, contactNote, leagueRules } from "@/lib/content";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = { title: "About & Rules" };

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={about.title} eyebrow="Rules & contact" />

      <div className="space-y-4 text-lg leading-relaxed">
        {about.paragraphs.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </div>

      <RuleList id="league-rules" title="League rules" rules={leagueRules} />
      <RuleList id="auction-rules" title="Auction rules" rules={auctionRules} />

      <section id="contact" className="mt-12" aria-labelledby="contact-heading">
        <h2 id="contact-heading" className="section-title mb-3">Contact</h2>
        <div className="card p-5">
          <p className="mb-4 text-muted">{contactNote}</p>
          <dl className="space-y-2">
            <div className="flex gap-3">
              <dt className="w-16 shrink-0 text-sm font-semibold uppercase tracking-wide text-muted">Email</dt>
              <dd><a className="font-semibold text-primary hover:underline" href={`mailto:${siteConfig.contactEmail}`}>{siteConfig.contactEmail}</a></dd>
            </div>
            <div className="flex gap-3">
              <dt className="w-16 shrink-0 text-sm font-semibold uppercase tracking-wide text-muted">Phone</dt>
              <dd className="font-semibold">{siteConfig.contactPhone}</dd>
            </div>
          </dl>
        </div>
      </section>
    </div>
  );
}

function RuleList({ id, title, rules }: { id: string; title: string; rules: string[] }) {
  return (
    <section id={id} className="mt-12 scroll-mt-24" aria-labelledby={`${id}-heading`}>
      <h2 id={`${id}-heading`} className="section-title mb-4">{title}</h2>
      <ol className="space-y-3">
        {rules.map((rule, index) => (
          <li key={rule} className="card flex gap-4 p-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 font-display text-lg font-bold text-primary">
              {index + 1}
            </span>
            <span className="pt-0.5">{rule}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
