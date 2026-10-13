import type { Metadata } from "next";
import { Icon, type IconName } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { about, auctionRules, contactNote, leagueRules } from "@/lib/content";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = { title: "About & Rules" };

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title={about.title} eyebrow="Rules & contact" />

      <div className="space-y-4 text-lg leading-relaxed text-foreground/90">
        {about.paragraphs.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </div>

      <div className="mt-12 grid gap-6 lg:grid-cols-2">
        <RuleList id="league-rules" title="League rules" icon="shield" rules={leagueRules} />
        <RuleList id="auction-rules" title="Auction rules" icon="gavel" rules={auctionRules} />
      </div>

      <section id="contact" className="mt-12 scroll-mt-24" aria-labelledby="contact-heading">
        <h2 id="contact-heading" className="section-title mb-4">Contact</h2>
        <div className="card p-5 sm:p-6">
          <p className="mb-5 text-muted">{contactNote}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <a href={`mailto:${siteConfig.contactEmail}`} className="card-link flex items-center gap-3 p-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon name="mail" />
              </span>
              <span className="min-w-0">
                <span className="block text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Email</span>
                <span className="block truncate font-semibold text-primary">{siteConfig.contactEmail}</span>
              </span>
            </a>
            <a href={`tel:${siteConfig.contactPhone.replace(/\s+/g, "")}`} className="card-link flex items-center gap-3 p-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon name="phone" />
              </span>
              <span>
                <span className="block text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Phone</span>
                <span className="block font-semibold">{siteConfig.contactPhone}</span>
              </span>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

function RuleList({ id, title, icon, rules }: { id: string; title: string; icon: IconName; rules: string[] }) {
  return (
    <section id={id} className="card scroll-mt-24 p-5 sm:p-6" aria-labelledby={`${id}-heading`}>
      <h2 id={`${id}-heading`} className="mb-5 flex items-center gap-3 font-display text-3xl font-bold uppercase leading-none">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Icon name={icon} />
        </span>
        {title}
      </h2>
      <ol className="space-y-4">
        {rules.map((rule, index) => (
          <li key={rule} className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 font-display text-base font-bold text-primary">
              {index + 1}
            </span>
            <span className="pt-0.5 text-[15px]">{rule}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
