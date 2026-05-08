import Link from "next/link";

import { getProtectedMe } from "./data";
import { WorkspaceBadge } from "./workspace-badge";

export default async function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const me = await getProtectedMe();
  const isAdmin = me.current_workspace.role === "admin";
  return (
    <div className="min-h-screen bg-surface-app text-ink">
      <div className="border-b border-border-1 bg-surface-3">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-sm font-semibold text-ink-strong">
              Dashboardy
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              {isAdmin ? (
                <>
                  <Link
                    href="/members"
                    className="text-ink-muted hover:text-ink transition"
                  >
                    Members
                  </Link>
                  <Link
                    href="/connections"
                    className="text-ink-muted hover:text-ink transition"
                  >
                    Connections
                  </Link>
                </>
              ) : null}
            </nav>
          </div>
          <WorkspaceBadge workspace={me.current_workspace} />
        </div>
      </div>
      {children}
    </div>
  );
}
