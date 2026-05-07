import { getProtectedMe } from "./data";
import { WorkspaceBadge } from "./workspace-badge";

export default async function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const me = await getProtectedMe();
  return (
    <div className="min-h-screen bg-surface-app text-ink">
      <div className="border-b border-border-1 bg-surface-3">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <div className="text-sm font-semibold text-ink-strong">Dashboardy</div>
          <WorkspaceBadge workspace={me.current_workspace} />
        </div>
      </div>
      {children}
    </div>
  );
}
