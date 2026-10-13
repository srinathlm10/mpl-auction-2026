"use client";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="container-page flex min-h-[60vh] flex-col items-center justify-center text-center">
      <h1 className="font-display text-4xl font-bold uppercase">Something went wrong</h1>
      <p className="mt-2 max-w-md text-muted">{error.message || "An unexpected error occurred."}</p>
      <button type="button" onClick={reset} className="btn-primary mt-6">Try again</button>
    </main>
  );
}
