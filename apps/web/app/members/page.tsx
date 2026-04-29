import { redirect } from "next/navigation";

import { getProtectedMe } from "@/app/(protected)/data";
import { listExternalAssetGrants } from "@/app/lib/asset-grants-api";
import { listWorkspaceMembers } from "@/app/lib/members-api";
import { createServerSupabase } from "@/app/lib/supabase-server";

import {
  createAssetGrantAction,
  deactivateMemberAction,
  deleteAssetGrantAction,
  inviteMemberAction,
  updateMemberRoleAction,
} from "./actions";

const roleOptions = [
  ["admin", "Admin", "Manage workspace access and settings."],
  ["analyst", "Analyst", "Explore dashboards and reporting data."],
  ["viewer", "Viewer", "View shared dashboards and answers."],
  ["external_client", "External client", "Access only granted assets."],
] as const;

const fieldClass =
  "min-h-11 w-full rounded-xl border border-border-4 bg-surface-1 px-3 py-2 text-sm outline-none transition focus-visible:border-focus focus-visible:ring-2 focus-visible:ring-focus-ring/35 disabled:cursor-not-allowed disabled:bg-surface-5 disabled:text-ink-muted";

const primaryButtonClass =
  "min-h-11 rounded-xl bg-accent px-5 py-2 text-sm font-semibold text-surface-3 transition hover:bg-accent-hover active:bg-accent-active disabled:cursor-not-allowed disabled:bg-border-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

const quietButtonClass =
  "min-h-10 rounded-xl border border-border-4 px-3 py-2 text-sm font-medium transition hover:bg-surface-5 disabled:cursor-not-allowed disabled:text-ink-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

const dangerButtonClass =
  "min-h-10 rounded-xl border border-danger-border px-3 py-2 text-sm font-medium text-danger-ink transition hover:bg-danger-soft disabled:cursor-not-allowed disabled:border-border-2 disabled:text-ink-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

const roleLabel = (role: string) =>
  roleOptions.find(([value]) => value === role)?.[1] ?? role;

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));

export default async function MembersPage() {
  const me = await getProtectedMe();
  if (me.current_workspace.role !== "admin") {
    redirect("/");
  }

  const supabase = await createServerSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  const tokenAvailable = Boolean(token);

  const workspaceId = me.current_workspace.workspace_id;
  let members: Awaited<ReturnType<typeof listWorkspaceMembers>>["members"] = [];
  let grants: Awaited<
    ReturnType<typeof listExternalAssetGrants>
  >["grants"] = [];
  let grantsLoadSuccess = false;
  let loadError: string | null = null;
  if (!tokenAvailable) {
    loadError = "Unable to load session token. Please refresh and try again.";
  } else {
    try {
      const resp = await listWorkspaceMembers(token as string, workspaceId);
      members = resp.members;
      const grantsResp = await listExternalAssetGrants(token as string, workspaceId);
      grants = grantsResp.grants;
      grantsLoadSuccess = true;
    } catch (err) {
      console.error("failed to load members or grants", { workspaceId, err });
      loadError = "Failed to load members or grants. Please try again.";
    }
  }

  const activeMembers = members.filter((member) => member.status === "active");
  const inactiveMembers = members.filter((member) => member.status !== "active");
  const externalClients = members.filter(
    (member) => member.role === "external_client" && member.status === "active",
  );
  const adminCount = activeMembers.filter((member) => member.role === "admin").length;
  const analystCount = activeMembers.filter(
    (member) => member.role === "analyst",
  ).length;
  const viewerCount = activeMembers.filter((member) => member.role === "viewer").length;

  return (
    <main className="bg-surface-app text-ink">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
              Access control
            </p>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-[-0.03em] text-ink-strong">
                Workspace members
              </h1>
              <p className="max-w-[65ch] text-sm leading-6 text-ink-muted">
                Invite teammates, adjust roles, and review external access for{" "}
                <span className="font-medium text-ink">
                  {me.current_workspace.workspace_name}
                </span>
                .
              </p>
            </div>
          </div>

          <dl className="grid grid-cols-3 overflow-hidden rounded-2xl border border-border-3 bg-surface-2">
            <div className="border-r border-border-1 px-4 py-3">
              <dt className="text-xs text-ink-faint">Admins</dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums">{adminCount}</dd>
            </div>
            <div className="border-r border-border-1 px-4 py-3">
              <dt className="text-xs text-ink-faint">Analysts</dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums">
                {analystCount}
              </dd>
            </div>
            <div className="px-4 py-3">
              <dt className="text-xs text-ink-faint">Viewers</dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums">{viewerCount}</dd>
            </div>
          </dl>
        </header>

        {loadError ? (
          <section
            className="rounded-2xl border border-danger-border bg-danger-soft-strong p-4 text-sm text-danger-ink-strong"
            role="alert"
          >
            <h2 className="font-semibold">Access data did not load</h2>
            <p className="mt-1 leading-6">
              {loadError} Check your connection, then refresh this page.
            </p>
          </section>
        ) : null}

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.55fr)]">
          <form
            action={inviteMemberAction}
            className="rounded-3xl border border-border-3 bg-surface-0 p-5 sm:p-6"
          >
            <input type="hidden" name="workspace_id" value={workspaceId} />
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold tracking-[-0.02em]">
                    Invite teammate
                  </h2>
                  <p className="mt-1 max-w-[56ch] text-sm leading-6 text-ink-muted">
                    Choose the access level before sending. External clients should
                    only receive grants for specific assets.
                  </p>
                </div>
                <span className="w-fit rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent-soft-ink">
                  Admin only
                </span>
              </div>

              <div className="grid gap-4 md:grid-cols-[minmax(0,1.3fr)_minmax(220px,0.7fr)]">
                <label className="space-y-2">
                  <span className="text-sm font-medium">Email address</span>
                  <input
                    name="email"
                    type="email"
                    required
                    className={fieldClass}
                    placeholder="alex@company.com"
                  />
                  <span className="block text-xs leading-5 text-ink-faint">
                    We will send a workspace invitation to this address.
                  </span>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium">Role</span>
                  <select name="role" className={fieldClass} defaultValue="viewer">
                    {roleOptions.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {roleOptions.map(([value, label, description]) => (
                  <div
                    key={value}
                    className="rounded-2xl border border-border-2 bg-surface-3 px-3 py-3"
                  >
                    <div className="text-sm font-medium">{label}</div>
                    <p className="mt-1 text-xs leading-5 text-ink-faint">
                      {description}
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-3 border-t border-border-1 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs leading-5 text-ink-faint">
                  Review the role before sending. You can change access later from
                  the roster.
                </p>
                <button className={primaryButtonClass}>Send invite</button>
              </div>
            </div>
          </form>

          <aside className="rounded-3xl border border-border-3 bg-surface-5 p-5">
            <h2 className="text-sm font-semibold">Access review</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-ink-faint">Active members</dt>
                <dd className="font-semibold tabular-nums">{activeMembers.length}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-ink-faint">Inactive members</dt>
                <dd className="font-semibold tabular-nums">{inactiveMembers.length}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-ink-faint">External clients</dt>
                <dd className="font-semibold tabular-nums">{externalClients.length}</dd>
              </div>
            </dl>
            <p className="mt-5 rounded-2xl bg-surface-2 p-3 text-xs leading-5 text-ink-muted">
              Keep at least two admins active so workspace access does not depend
              on one person.
            </p>
          </aside>
        </section>

        <section className="rounded-3xl border border-border-3 bg-surface-1">
          <div className="flex flex-col gap-2 border-b border-border-1 px-5 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-6">
            <div>
              <h2 className="text-lg font-semibold tracking-[-0.02em]">
                Member roster
              </h2>
              <p className="mt-1 text-sm text-ink-muted">
                Change roles inline or deactivate access when someone leaves.
              </p>
            </div>
            <span className="text-xs font-medium text-ink-faint">
              {members.length} total
            </span>
          </div>

          <div className="hidden grid-cols-[minmax(0,1.6fr)_minmax(150px,0.7fr)_minmax(110px,0.45fr)_minmax(120px,0.5fr)_minmax(170px,0.75fr)] gap-3 border-b border-border-1 bg-surface-4 px-6 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-ink-faint md:grid">
            <div>Email</div>
            <div>Role</div>
            <div>Status</div>
            <div>Joined</div>
            <div className="text-right">Actions</div>
          </div>

          {members.length === 0 && !loadError ? (
            <div className="px-5 py-10 text-center sm:px-6">
              <h3 className="text-base font-semibold">Invite your first teammate</h3>
              <p className="mx-auto mt-2 max-w-[48ch] text-sm leading-6 text-ink-muted">
                This workspace only has the current admin. Send an invite to make
                reporting and access reviews easier to share.
              </p>
            </div>
          ) : null}

          <div className="divide-y divide-border-0">
            {members.map((member) => {
              const isActive = member.status === "active";
              return (
                <div
                  key={member.id}
                  className="grid gap-4 px-5 py-4 md:grid-cols-[minmax(0,1.6fr)_minmax(150px,0.7fr)_minmax(110px,0.45fr)_minmax(120px,0.5fr)_minmax(170px,0.75fr)] md:items-center md:gap-3 md:px-6"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{member.email}</div>
                    <div className="mt-1 truncate font-mono text-xs text-ink-faint">
                      {member.user_id}
                    </div>
                  </div>

                  <form
                    action={updateMemberRoleAction}
                    className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] md:block"
                  >
                    <input type="hidden" name="workspace_id" value={workspaceId} />
                    <input type="hidden" name="membership_id" value={member.id} />
                    <label className="sr-only" htmlFor={`role-${member.id}`}>
                      Member role
                    </label>
                    <select
                      id={`role-${member.id}`}
                      name="role"
                      defaultValue={member.role}
                      className={fieldClass}
                      disabled={!isActive}
                    >
                      {roleOptions.map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <button
                      className={`${quietButtonClass} md:mt-2 md:w-full`}
                      disabled={!isActive}
                    >
                      Save role
                    </button>
                  </form>

                  <div>
                    <span
                      className={
                        isActive
                          ? "inline-flex rounded-full bg-success-soft px-2.5 py-1 text-xs font-medium text-success-soft-ink"
                          : "inline-flex rounded-full bg-surface-4 px-2.5 py-1 text-xs font-medium text-ink-faint"
                      }
                    >
                      {isActive ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <div className="text-sm text-ink-muted">
                    {formatDate(member.created_at)}
                  </div>

                  <form action={deactivateMemberAction} className="md:text-right">
                    <input type="hidden" name="workspace_id" value={workspaceId} />
                    <input type="hidden" name="membership_id" value={member.id} />
                    <button className={dangerButtonClass} disabled={!isActive}>
                      Deactivate
                    </button>
                  </form>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl border border-border-3 bg-surface-4">
          <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:p-6">
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">
                  External access
                </p>
                <h2 className="mt-2 text-lg font-semibold tracking-[-0.02em]">
                  Asset grants
                </h2>
                <p className="mt-2 max-w-[56ch] text-sm leading-6 text-ink-muted">
                  Grant external clients access to specific dashboards or questions.
                  Use this after inviting someone as an external client.
                </p>
              </div>

              <form
                action={createAssetGrantAction}
                className="space-y-4 rounded-2xl border border-border-2 bg-surface-2 p-4"
              >
                <input type="hidden" name="workspace_id" value={workspaceId} />
                <label className="block space-y-2">
                  <span className="text-sm font-medium">External client</span>
                  <select
                    name="user_id"
                    required
                    className={fieldClass}
                    defaultValue=""
                    disabled={externalClients.length === 0}
                  >
                    <option value="" disabled>
                      {externalClients.length === 0
                        ? "Invite an external client first"
                        : "Select an external client"}
                    </option>
                    {externalClients.map((member) => (
                      <option key={member.id} value={member.user_id}>
                        {member.email} ({roleLabel(member.role)})
                      </option>
                    ))}
                  </select>
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block space-y-2">
                    <span className="text-sm font-medium">Asset type</span>
                    <select
                      name="asset_type"
                      className={fieldClass}
                      defaultValue="dashboard"
                    >
                      <option value="dashboard">Dashboard</option>
                      <option value="question">Question</option>
                    </select>
                  </label>
                  <label className="block space-y-2">
                    <span className="text-sm font-medium">Export access</span>
                    <span className="flex min-h-11 items-center gap-3 rounded-xl border border-border-4 bg-surface-1 px-3 py-2">
                      <input
                        name="can_export"
                        type="checkbox"
                        className="h-4 w-4 rounded border-border-4 accent-accent"
                      />
                      <span className="text-sm text-ink-muted">
                        Allow exports
                      </span>
                    </span>
                  </label>
                </div>

                <label className="block space-y-2">
                  <span className="text-sm font-medium">Asset ID</span>
                  <input
                    name="asset_id"
                    required
                    pattern="^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
                    title="Enter a UUID like 00000000-0000-4000-8000-000000000000"
                    className={`${fieldClass} font-mono`}
                    placeholder="00000000-0000-4000-8000-000000000000"
                  />
                </label>

                <button
                  className={primaryButtonClass}
                  disabled={externalClients.length === 0}
                >
                  Create grant
                </button>
              </form>
            </div>

            <div className="overflow-hidden rounded-2xl border border-border-2 bg-surface-2">
              <div className="hidden grid-cols-[minmax(0,1fr)_110px_90px_auto] gap-3 border-b border-border-1 bg-surface-3 px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-ink-faint md:grid">
                <div>Asset</div>
                <div>Type</div>
                <div>Export</div>
                <div className="text-right">Action</div>
              </div>

              <div className="divide-y divide-border-0">
                {grants.map((grant) => (
                  <div
                    key={grant.id}
                    className="grid gap-3 px-4 py-3 md:grid-cols-[minmax(0,1fr)_110px_90px_auto] md:items-center"
                  >
                    <div className="min-w-0">
                      <div className="mb-1 text-xs font-semibold uppercase tracking-[0.08em] text-ink-faint md:hidden">
                        Asset
                      </div>
                      <div className="truncate font-mono text-xs text-ink">
                        {grant.asset_id}
                      </div>
                      <div className="mt-1 truncate font-mono text-xs text-ink-muted">
                        User {grant.user_id}
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-sm md:block">
                      <span className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-faint md:hidden">
                        Type
                      </span>
                      <span className="capitalize">{grant.asset_type}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-sm md:block">
                      <span className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-faint md:hidden">
                        Export
                      </span>
                      <span>{grant.can_export ? "Yes" : "No"}</span>
                    </div>
                    <form action={deleteAssetGrantAction} className="md:text-right">
                      <input type="hidden" name="workspace_id" value={workspaceId} />
                      <input type="hidden" name="grant_id" value={grant.id} />
                      <button className={dangerButtonClass}>Delete</button>
                    </form>
                  </div>
                ))}
              </div>

              {grantsLoadSuccess && grants.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <h3 className="text-sm font-semibold">No grants yet</h3>
                  <p className="mx-auto mt-2 max-w-[42ch] text-sm leading-6 text-ink-muted">
                    Create a grant when an external client needs access to one
                    dashboard or question.
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
