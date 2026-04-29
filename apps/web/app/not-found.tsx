export const dynamic = "force-static";

export default function NotFound() {
  return (
    <main className="min-h-dvh bg-surface-app p-8 text-lg text-ink">
      <h1 className="text-2xl font-semibold text-ink-strong">Not found</h1>
      <p className="text-sm text-ink-muted">The requested page does not exist.</p>
    </main>
  );
}
