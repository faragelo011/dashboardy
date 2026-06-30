import { redirect } from "next/navigation";

import { AdminLuxuryNav } from "@/app/admin-luxury-nav";
import { getProtectedMe } from "@/app/(protected)/data";
import { listExternalAssetGrants } from "@/app/lib/asset-grants-api";
import { listWorkspaceMembers } from "@/app/lib/members-api";
import { createServerSupabase } from "@/app/lib/supabase-server";

import {
  createAssetGrantAction,
  deactivateMemberAction,
  deleteAssetGrantAction,
  updateMemberRoleAction,
} from "./actions";
import { ProvisionMemberForm } from "./provision-member-form";

const roleOptions = [
  ["admin", "Admin", "Manage workspace access and settings."],
  ["analyst", "Analyst", "Explore dashboards and reporting data."],
  ["viewer", "Viewer", "View shared dashboards and answers."],
  ["external_client", "External client", "Access only granted assets."],
] as const;

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
    <div className="min-h-screen bg-surface-app text-ink">
      <AdminLuxuryNav />
      <div className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-10 sm:px-8 lg:py-14">

        {/* Header */}
        <header className="flex flex-col gap-6 border-b border-border-1 pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <p className="ds-kicker">Workspace directory</p>
            <h1 className="text-2xl font-semibold tracking-tight text-ink-strong sm:text-3xl">
              Members
            </h1>
            <p className="max-w-[55ch] text-sm leading-relaxed text-ink-muted">
              Manage access and roles for{" "}
              <span className="font-medium text-ink">{me.current_workspace.workspace_name}</span>.
            </p>
          </div>

          <dl className="flex gap-8 shrink-0 pt-4 lg:pt-0">
            <div>
              <dt className="ds-kicker">Admins</dt>
              <dd className="ds-stat mt-1">{adminCount.toString().padStart(2, "0")}</dd>
            </div>
            <div>
              <dt className="ds-kicker">Analysts</dt>
              <dd className="ds-stat mt-1">{analystCount.toString().padStart(2, "0")}</dd>
            </div>
            <div>
              <dt className="ds-kicker">Viewers</dt>
              <dd className="ds-stat mt-1">{viewerCount.toString().padStart(2, "0")}</dd>
            </div>
          </dl>
        </header>

        {loadError ? (
          <section className="ds-alert ds-alert--danger" role="alert">
            <div>
              <h2 className="mb-1 font-semibold">Failed to load</h2>
              <p>{loadError}</p>
            </div>
          </section>
        ) : null}

        {/* Invite + Sidebar stats */}
        <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:gap-10">
          <ProvisionMemberForm
            workspaceId={workspaceId}
            roleOptions={roleOptions}
          />

          <aside className="flex flex-col gap-6">
            <div className="ds-card flex flex-col gap-4 p-6">
              <h2 className="text-lg font-semibold tracking-tight text-ink-strong">Directory</h2>
              <dl className="flex flex-col gap-3">
                <div className="flex items-end justify-between border-b border-border-1 pb-3">
                  <dt className="ds-label text-ink-muted">Active members</dt>
                  <dd className="ds-mono text-ink">{activeMembers.length}</dd>
                </div>
                <div className="flex items-end justify-between border-b border-border-1 pb-3">
                  <dt className="ds-label text-ink-muted">Inactive</dt>
                  <dd className="ds-mono text-ink-faint">{inactiveMembers.length}</dd>
                </div>
                <div className="flex items-end justify-between">
                  <dt className="ds-label text-ink-muted">External partners</dt>
                  <dd className="ds-mono text-ink">{externalClients.length}</dd>
                </div>
              </dl>
              <p className="ds-help italic">Ensure at least two active admins for uninterrupted access.</p>
            </div>
          </aside>
        </section>

        {/* Member Roster */}
        <section>
          <div className="mb-6 flex items-end justify-between border-b border-border-1 pb-4">
            <h2 className="text-lg font-semibold tracking-tight text-ink-strong">Roster</h2>
            <span className="ds-help">{members.length} {members.length === 1 ? "member" : "members"}</span>
          </div>

          {/* Table header (desktop) */}
          <div className="hidden gap-4 px-4 pb-3 text-[11px] font-medium uppercase tracking-wider text-ink-faint md:grid md:grid-cols-[1.4fr_0.6fr_0.4fr_0.4fr_0.6fr]">
            <div>Identity</div>
            <div>Role</div>
            <div>Status</div>
            <div>Joined</div>
            <div className="text-right">Actions</div>
          </div>

          <div className="flex flex-col gap-1.5">
            {members.map((member) => {
              const isActive = member.status === "active";
              return (
                <div
                  key={member.id}
                  className="ds-card grid gap-4 p-4 transition-colors md:grid-cols-[1.4fr_0.6fr_0.4fr_0.4fr_0.6fr] md:items-center md:gap-4 md:px-4"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-ink">{member.email}</div>
                    <div className="mt-0.5 text-[11px] text-ink-faint ds-mono">
                      {member.user_id.split("-")[0]}…
                    </div>
                  </div>

                  <form action={updateMemberRoleAction} className="contents">
                    <input type="hidden" name="workspace_id" value={workspaceId} />
                    <input type="hidden" name="membership_id" value={member.id} />
                    <select
                      name="role"
                      defaultValue={member.role}
                      className="ds-select text-xs"
                      disabled={!isActive}
                    >
                      {roleOptions.map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <button
                      className="ds-btn ds-btn-ghost text-xs md:hidden"
                      disabled={!isActive}
                    >
                      Apply
                    </button>
                  </form>

                  <div>
                    <span className={`ds-badge ${isActive ? "ds-badge--ok" : "ds-badge--idle"}`}>
                      {isActive ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <div className="text-xs text-ink-muted">
                    {formatDate(member.created_at)}
                  </div>

                  <form action={deactivateMemberAction} className="md:flex md:justify-end">
                    <input type="hidden" name="workspace_id" value={workspaceId} />
                    <input type="hidden" name="membership_id" value={member.id} />
                    <button className="ds-btn ds-btn-ghost text-xs text-danger-ink hover:text-danger-ink hover:bg-danger-soft" disabled={!isActive}>
                      Remove
                    </button>
                  </form>
                </div>
              );
            })}
          </div>
        </section>

        {/* Asset Grants */}
        <section className="border-t border-border-1 pt-10">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.5fr]">

            <div className="flex flex-col gap-8">
              <div>
                <p className="ds-kicker">External distribution</p>
                <h2 className="mt-2 text-xl font-semibold tracking-tight text-ink-strong">Asset grants</h2>
                <p className="ds-help mt-2 max-w-[40ch]">
                  Grant access to specific assets for external partners with the External client role.
                </p>
              </div>

              <form action={createAssetGrantAction} className="ds-card flex flex-col gap-5 p-6">
                <input type="hidden" name="workspace_id" value={workspaceId} />

                <div className="flex flex-col gap-5">
                  <label className="flex flex-col gap-1.5">
                    <span className="ds-label">Partner</span>
                    <select
                      name="user_id"
                      required
                      className="ds-select"
                      defaultValue=""
                      disabled={externalClients.length === 0}
                    >
                      <option value="" disabled>
                        {externalClients.length === 0
                          ? "No external partners registered"
                          : "Select partner"}
                      </option>
                      {externalClients.map((member) => (
                        <option key={member.id} value={member.user_id}>
                          {member.email} ({roleLabel(member.role)})
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <label className="flex flex-col gap-1.5">
                      <span className="ds-label">Asset type</span>
                      <select
                        name="asset_type"
                        className="ds-select"
                        defaultValue="dashboard"
                      >
                        <option value="dashboard">Visual dashboard</option>
                        <option value="question">Saved question</option>
                      </select>
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className="ds-label">Allow export</span>
                      <div className="flex h-9 items-center gap-3">
                        <input
                          name="can_export"
                          type="checkbox"
                          className="h-4 w-4 cursor-pointer rounded-[4px] border border-border-2 accent-accent"
                        />
                        <span className="text-sm text-ink-muted">Authorize download</span>
                      </div>
                    </label>
                  </div>

                  <label className="flex flex-col gap-1.5">
                    <span className="ds-label">Asset ID</span>
                    <input
                      name="asset_id"
                      required
                      pattern="^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
                      title="Enter a UUID like 00000000-0000-4000-8000-000000000000"
                      className="ds-input ds-mono text-xs tracking-wider"
                      placeholder="00000000-0000-4000-8000-000000000000"
                    />
                  </label>

                  <button
                    className="ds-btn ds-btn-primary w-full"
                    disabled={externalClients.length === 0}
                  >
                    Authorize distribution
                  </button>
                </div>
              </form>
            </div>

            <div className="flex flex-col gap-4 pt-2">
              {/* Table header (desktop) */}
              <div className="hidden gap-4 border-b border-border-1 pb-3 text-[11px] font-medium uppercase tracking-wider text-ink-faint md:grid md:grid-cols-[1.2fr_100px_90px_auto]">
                <div>Asset</div>
                <div>Type</div>
                <div>Export</div>
                <div className="text-right">Action</div>
              </div>

              <div className="flex flex-col gap-1.5">
                {grants.map((grant) => (
                  <div
                    key={grant.id}
                    className="ds-card grid gap-3 p-4 transition-colors md:grid-cols-[1.2fr_100px_90px_auto] md:items-center md:gap-4 md:px-4"
                  >
                    <div className="min-w-0">
                      <div className="mb-0.5 text-[11px] text-ink-faint md:hidden">Asset</div>
                      <div className="ds-mono truncate text-xs text-ink">{grant.asset_id}</div>
                      <div className="mt-0.5 text-[11px] text-ink-faint">
                        User: {grant.user_id.split("-")[0]}…
                      </div>
                    </div>
                    <div>
                      <span className="text-[11px] text-ink-faint md:hidden">Type </span>
                      <span className="text-xs capitalize text-ink">{grant.asset_type}</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-ink-faint md:hidden">Export </span>
                      <span className="ds-badge ds-badge--idle">
                        {grant.can_export ? "Allowed" : "Denied"}
                      </span>
                    </div>
                    <form action={deleteAssetGrantAction} className="md:text-right">
                      <input type="hidden" name="workspace_id" value={workspaceId} />
                      <input type="hidden" name="grant_id" value={grant.id} />
                      <button className="ds-btn ds-btn-ghost text-xs text-danger-ink hover:text-danger-ink hover:bg-danger-soft">
                        Revoke
                      </button>
                    </form>
                  </div>
                ))}

                {grantsLoadSuccess && grants.length === 0 ? (
                  <div className="ds-card flex flex-col items-center gap-2 border-dashed p-12 text-center">
                    <p className="ds-kicker">No grants</p>
                    <p className="ds-help max-w-[40ch]">
                      No external distributions have been authorized yet.
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
