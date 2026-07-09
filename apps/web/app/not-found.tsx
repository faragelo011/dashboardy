export const dynamic = "force-static";

export default function NotFound() {
  return (
    <main className="min-h-dvh bg-surface-app p-8 text-ink">
      <header className="max-w-3xl space-y-3">
        <p className="ds-kicker">Error</p>
        <h1 className="font-display text-2xl font-medium tracking-tight text-ink-strong sm:text-3xl">
          Not found
        </h1>
        <p className="text-sm text-ink-muted">The requested page does not exist.</p>
      </header>
    </main>
  );
}
