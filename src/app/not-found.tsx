import Link from "next/link";

export default function NotFound() {
  return (
    <main className="container-page flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p className="font-display text-8xl font-extrabold text-primary">404</p>
      <h1 className="mt-2 font-display text-3xl font-bold uppercase">Out of bounds</h1>
      <p className="mt-2 text-muted">We couldn&apos;t find the page you were looking for.</p>
      <Link href="/" className="btn-primary mt-6">Back to home</Link>
    </main>
  );
}
