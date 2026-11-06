"use client";

import { useEffect } from "react";

const LAST_RELOAD = "mpl-stale-reload";
const RELOAD_GAP_MS = 30_000; // so a page that keeps failing can't reload forever

/** After a new deploy, a page from the old one can ask for script files that are gone. A fresh load fixes it. */
const isStalePage = (error: Error) => /chunk/i.test(`${error.name} ${error.message}`);

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const stale = isStalePage(error);

  useEffect(() => {
    if (!stale) return;
    try {
      if (Date.now() - Number(sessionStorage.getItem(LAST_RELOAD) ?? 0) < RELOAD_GAP_MS) return;
      sessionStorage.setItem(LAST_RELOAD, String(Date.now()));
    } catch {
      return;
    }
    window.location.reload();
  }, [stale]);

  return (
    <main className="container-page flex min-h-[60vh] flex-col items-center justify-center text-center">
      <h1 className="font-display text-4xl font-bold uppercase">{stale ? "The site was updated" : "Something went wrong"}</h1>
      <p className="mt-2 max-w-md text-muted">{stale ? "Reload to get the latest version." : error.message || "An unexpected error occurred."}</p>
      <button type="button" onClick={stale ? () => window.location.reload() : reset} className="btn-primary mt-6">{stale ? "Reload" : "Try again"}</button>
    </main>
  );
}
