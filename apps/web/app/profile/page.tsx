import Link from "next/link";
import {
  Database,
  FileCode2,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  Users,
} from "lucide-react";

import { AdminLuxuryNav } from "@/app/admin-luxury-nav";
import { getProtectedMe } from "@/app/(protected)/data";
import { WorkspaceBadge } from "@/app/(protected)/workspace-badge";
import { DsIcon } from "@/components/ds/icon";

const roleLabel = (role: string) => {
  switch (role) {
    case "admin":
      return "Admin";
    case "analyst":
      return "Analyst";
    case "viewer":
      return "Viewer";
    case "external_client":
      return "External client";
    default:
      return role;
  }
};

const roleDescription = (role: string) => {
  switch (role) {
    case "admin":
      return "Manage members, connections, and workspace settings.";
    case "analyst":
      return "Author questions, collections, and dashboards.";
    case "viewer":
      return "View shared dashboards and questions.";
    case "external_client":
      return "Access only assets explicitly granted to you.";
    default:
      return "Workspace membership role.";
  }
};

export default async function ProfilePage() {
  const me = await getProtectedMe();
  const role = me.current_workspace.role;
  const isAdmin = role === "admin";
  const canAuthor = role === "admin" || role === "analyst";
  const isActive = me.current_workspace.membership_status === "active";
  const emailInitial = (me.user.email?.trim().charAt(0) ?? "?").toUpperCase();

  const shortcuts = [
    {
      href: "/dashboards",
      label: "Dashboards",
      description: "Browse and open dashboards",
      icon: LayoutDashboard,
      show: true,
    },
    {
      href: "/questions",
      label: "Questions",
      description: "Saved SQL questions",
      icon: FileCode2,
      show: role !== "external_client",
    },
    {
      href: "/collections",
      label: "Collections",
      description: "Organize questions",
      icon: FolderOpen,
      show: role !== "external_client",
    },
    {
      href: "/members",
      label: "Members",
      description: "Invite and manage access",
      icon: Users,
      show: isAdmin,
    },
    {
      href: "/connections",
      label: "Connections",
      description: "Snowflake warehouse settings",
      icon: Database,
      show: isAdmin,
    },
  ].filter((item) => item.show);

  return (
    <div className="min-h-screen bg-surface-app text-ink">
      <AdminLuxuryNav />
      <main className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10 sm:px-8 lg:py-12">
        <header className="flex flex-col gap-5 border-b border-border-1 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div
              aria-hidden="true"
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-surface-2 font-display text-2xl font-medium text-ink-strong"
            >
              {emailInitial}
            </div>
            <div className="min-w-0 space-y-2">
              <p className="ds-kicker">Account</p>
              <h1 className="font-display text-3xl font-medium tracking-tight text-ink-strong sm:text-4xl">
                Profile
              </h1>
              <p className="truncate text-sm text-ink-muted">{me.user.email}</p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <WorkspaceBadge workspace={me.current_workspace} />
                <span
                  className={`ds-badge ${isActive ? "ds-badge--ok" : "ds-badge--idle"}`}
                >
                  {me.current_workspace.membership_status}
                </span>
              </div>
            </div>
          </div>
        </header>

        <section
          className="rounded-ds-md border border-border-1 bg-surface-0 p-5"
          aria-labelledby="membership-heading"
        >
          <h2
            id="membership-heading"
            className="font-display text-lg font-medium tracking-tight text-ink-strong"
          >
            Workspace membership
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            Your access in the current workspace.
          </p>

          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-ds-md bg-surface-1 px-4 py-3">
              <dt className="ds-kicker">Workspace</dt>
              <dd className="mt-1.5 text-sm font-medium text-ink-strong">
                {me.current_workspace.workspace_name}
              </dd>
            </div>
            <div className="rounded-ds-md bg-surface-1 px-4 py-3">
              <dt className="ds-kicker">Role</dt>
              <dd className="mt-1.5 text-sm font-medium text-ink-strong">
                {roleLabel(role)}
              </dd>
              <dd className="mt-1 text-xs text-ink-muted">{roleDescription(role)}</dd>
            </div>
            <div className="rounded-ds-md bg-surface-1 px-4 py-3">
              <dt className="ds-kicker">Signed in as</dt>
              <dd className="mt-1.5 truncate text-sm text-ink-strong">{me.user.email}</dd>
            </div>
            <div className="rounded-ds-md bg-surface-1 px-4 py-3">
              <dt className="ds-kicker">Membership status</dt>
              <dd className="mt-1.5">
                <span
                  className={`ds-badge ${isActive ? "ds-badge--ok" : "ds-badge--idle"}`}
                >
                  {me.current_workspace.membership_status}
                </span>
              </dd>
            </div>
          </dl>

          {canAuthor ? (
            <p className="mt-4 text-xs text-ink-faint">
              You can author questions and dashboards in this workspace.
            </p>
          ) : null}
        </section>

        {shortcuts.length > 0 ? (
          <section className="flex flex-col gap-4" aria-labelledby="shortcuts-heading">
            <div>
              <h2
                id="shortcuts-heading"
                className="font-display text-xl font-medium tracking-tight text-ink-strong"
              >
                Quick links
              </h2>
              <p className="mt-1 text-sm text-ink-muted">
                Jump to areas available for your role.
              </p>
            </div>
            <ul className="grid gap-2 sm:grid-cols-2">
              {shortcuts.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="flex items-start gap-3 rounded-ds-md border border-border-1 bg-surface-0 p-4 transition-colors hover:border-border-2 hover:bg-surface-1"
                  >
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-ds bg-surface-2 text-ink-muted">
                      <DsIcon icon={item.icon} size="sm" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-ink-strong">
                        {item.label}
                      </span>
                      <span className="mt-0.5 block text-xs text-ink-muted">
                        {item.description}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="border-t border-border-1 pt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-ink-strong">Sign out</p>
              <p className="text-xs text-ink-muted">
                End this session on this device.
              </p>
            </div>
            <form action="/sign-out" method="post">
              <button type="submit" className="dby-btn dby-btn--secondary">
                <DsIcon icon={LogOut} className="dby-btn__icon" />
                Sign out
              </button>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}
