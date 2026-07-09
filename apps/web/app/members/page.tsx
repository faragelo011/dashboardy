import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, UserPlus, Users } from "lucide-react";

import { AdminLuxuryNav } from "@/app/admin-luxury-nav";
import { getProtectedMe } from "@/app/(protected)/data";
import { listExternalAssetGrants } from "@/app/lib/asset-grants-api";
import { listWorkspaceMembers } from "@/app/lib/members-api";
import { createServerSupabase } from "@/app/lib/supabase-server";
import { DsIcon } from "@/components/ds/icon";
import { EmptyState } from "@/components/ds/empty-state";

import {
  createAssetGrantAction,
  deactivateMemberAction,
  deleteAssetGrantAction,
  updateMemberRoleAction,
} from "./actions";
import { ConfirmActionForm } from "./confirm-action-form";
import { MemberRoleForm } from "./member-role-form";
import { ProvisionMemberForm } from "./provision-member-form";

const roleOptions = [
  ["admin", "Admin", "Manage workspace access and settings."],
  ["analyst", "Analyst", "Explore dashboards and reporting data."],
  ["viewer", "Viewer", "View shared dashboards and answers."],
  ["external_client", "External client", "Access only granted assets."],
] as const;

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));

type PageProps = {
  searchParams: Promise<{
    invite?: string | string[];
    grant?: string | string[];
  }>;
};

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0]?.trim() || undefined;
  }
  return value?.trim() || undefined;
}

export default async function MembersPage({ searchParams }: PageProps) {
  const me = await getProtectedMe();
  if (me.current_workspace.role !== "admin") {
    redirect("/dashboards");
  }

  const params = await searchParams;
  const showInvite = firstParam(params.invite) === "1";
  const showGrant = firstParam(params.grant) === "1";

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
  const emailByUserId = new Map(members.map((m) => [m.user_id, m.email]));

  const adminCount = activeMembers.filter((member) => member.role === "admin").length;
  const analystCount = activeMembers.filter(
    (member) => member.role === "analyst",
  ).length;
  const viewerCount = activeMembers.filter((member) => member.role === "viewer").length;

  return (
    <div className="min-h-screen bg-surface-app text-ink">
      <AdminLuxuryNav />
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10 sm:px-8 lg:py-12">
        <header className="flex flex-col gap-4 border-b border-border-1 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl space-y-2">
            <p className="ds-kicker">Workspace directory</p>
            <h1 className="font-display text-3xl font-medium tracking-tight text-ink-strong sm:text-4xl">
              Members
            </h1>
            <p className="max-w-[55ch] text-sm leading-relaxed text-ink-muted">
              Manage access and roles for{" "}
              <span className="font-medium text-ink">
                {me.current_workspace.workspace_name}
              </span>
              .
            </p>
            <p className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-muted">
              <span>
                <span className="font-medium text-ink">{adminCount}</span> admin
                {adminCount === 1 ? "" : "s"}
              </span>
              <span aria-hidden="true">·</span>
              <span>
                <span className="font-medium text-ink">{analystCount}</span> analyst
                {analystCount === 1 ? "" : "s"}
              </span>
              <span aria-hidden="true">·</span>
              <span>
                <span className="font-medium text-ink">{viewerCount}</span> viewer
                {viewerCount === 1 ? "" : "s"}
              </span>
              <span aria-hidden="true">·</span>
              <span>
                <span className="font-medium text-ink">{externalClients.length}</span>{" "}
                external
              </span>
              {inactiveMembers.length > 0 ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{inactiveMembers.length} inactive</span>
                </>
              ) : null}
            </p>
          </div>
          {!showInvite ? (
            <Link href="/members?invite=1" className="dby-btn dby-btn--primary shrink-0">
              <DsIcon icon={UserPlus} className="dby-btn__icon" />
              Invite member
            </Link>
          ) : null}
        </header>

        {loadError ? (
          <section className="dby-alert dby-alert--danger" role="alert">
            <div className="dby-alert__body">
              <span className="dby-alert__title">Failed to load</span>
              <span>{loadError}</span>
            </div>
          </section>
        ) : null}

        {showInvite ? (
          <ProvisionMemberForm
            workspaceId={workspaceId}
            roleOptions={roleOptions}
            cancelHref="/members"
          />
        ) : null}

        <section className="flex flex-col gap-4" aria-labelledby="roster-heading">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2
              id="roster-heading"
              className="font-display text-xl font-medium tracking-tight text-ink-strong"
            >
              Roster{" "}
              <span className="text-ink-muted">({members.length})</span>
            </h2>
            <p className="text-xs text-ink-faint">
              Keep at least two active admins.
            </p>
          </div>

          {members.length === 0 ? (
            <EmptyState
              icon={<DsIcon icon={Users} size="md" />}
              kicker="No members"
              description="Invite someone to this workspace to get started."
              action={
                <Link href="/members?invite=1" className="dby-btn dby-btn--primary">
                  <DsIcon icon={UserPlus} className="dby-btn__icon" />
                  Invite member
                </Link>
              }
            />
          ) : (
            <ul className="flex flex-col gap-2">
              {members.map((member) => {
                const isActive = member.status === "active";
                return (
                  <li
                    key={member.id}
                    className="rounded-ds-md border border-border-1 bg-surface-0 p-4 transition-colors hover:border-border-2 hover:bg-surface-1"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink-strong">
                          {member.email}
                        </p>
                        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-muted">
                          <span
                            className={`ds-badge ${isActive ? "ds-badge--ok" : "ds-badge--idle"}`}
                          >
                            {isActive ? "Active" : "Inactive"}
                          </span>
                          <span>Joined {formatDate(member.created_at)}</span>
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <MemberRoleForm
                          workspaceId={workspaceId}
                          membershipId={member.id}
                          email={member.email}
                          role={member.role}
                          disabled={!isActive}
                          roleOptions={roleOptions}
                          action={updateMemberRoleAction}
                        />

                        <ConfirmActionForm
                          action={deactivateMemberAction}
                          fields={{
                            workspace_id: workspaceId,
                            membership_id: member.id,
                          }}
                          title="Remove member?"
                          description={`“${member.email}” will lose access to this workspace.`}
                          confirmLabel="Remove member"
                          buttonLabel="Remove"
                          disabled={!isActive}
                        />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section
          className="flex flex-col gap-4 border-t border-border-1 pt-8"
          aria-labelledby="grants-heading"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-xl space-y-1">
              <p className="ds-kicker">External distribution</p>
              <h2
                id="grants-heading"
                className="font-display text-xl font-medium tracking-tight text-ink-strong"
              >
                Asset grants{" "}
                <span className="text-ink-muted">({grants.length})</span>
              </h2>
              <p className="text-sm text-ink-muted">
                Give external clients access to specific dashboards or questions.
              </p>
            </div>
            {!showGrant && externalClients.length > 0 ? (
              <Link href="/members?grant=1" className="dby-btn dby-btn--secondary shrink-0">
                <DsIcon icon={Plus} className="dby-btn__icon" />
                New grant
              </Link>
            ) : null}
          </div>

          {showGrant ? (
            <form
              action={createAssetGrantAction}
              className="rounded-ds-md border border-border-1 bg-surface-2 p-5"
              aria-labelledby="new-grant-heading"
            >
              <input type="hidden" name="workspace_id" value={workspaceId} />
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h3
                    id="new-grant-heading"
                    className="font-display text-lg font-medium tracking-tight text-ink-strong"
                  >
                    New asset grant
                  </h3>
                  <p className="mt-1 text-sm text-ink-muted">
                    Authorize one asset for an external partner.
                  </p>
                </div>
                <Link
                  href="/members"
                  className="dby-btn dby-btn--ghost ds-btn--sm"
                >
                  Cancel
                </Link>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5 sm:col-span-2">
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
                        {member.email}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="ds-label">Asset type</span>
                  <select
                    name="asset_type"
                    className="ds-select"
                    defaultValue="dashboard"
                  >
                    <option value="dashboard">Dashboard</option>
                    <option value="question">Saved question</option>
                  </select>
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="ds-label">Allow export</span>
                  <label className="dby-checkbox mt-2">
                    <input name="can_export" type="checkbox" />
                    <span className="dby-checkbox__text">Authorize download</span>
                  </label>
                </label>

                <label className="flex flex-col gap-1.5 sm:col-span-2">
                  <span className="ds-label">Asset ID</span>
                  <input
                    name="asset_id"
                    required
                    pattern="^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
                    title="Enter a UUID like 00000000-0000-4000-8000-000000000000"
                    className="ds-input ds-mono text-xs tracking-wider"
                    placeholder="00000000-0000-4000-8000-000000000000"
                    autoFocus
                  />
                </label>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  type="submit"
                  className="ds-btn ds-btn-primary"
                  disabled={externalClients.length === 0}
                >
                  Authorize grant
                </button>
              </div>
            </form>
          ) : null}

          {externalClients.length === 0 && !showGrant ? (
            <p className="rounded-ds-md border border-dashed border-border-2 bg-surface-1 px-4 py-3 text-sm text-ink-muted">
              Invite someone with the External client role before creating grants.
            </p>
          ) : null}

          <div className="flex flex-col gap-2">
            {grants.map((grant) => {
              const partnerEmail = emailByUserId.get(grant.user_id);
              return (
                <div
                  key={grant.id}
                  className="flex flex-col gap-3 rounded-ds-md border border-border-1 bg-surface-0 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="ds-mono truncate text-xs text-ink-strong">
                      {grant.asset_id}
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-muted">
                      <span className="inline-flex items-center rounded-pill bg-surface-2 px-2.5 py-0.5 font-medium capitalize text-ink">
                        {grant.asset_type}
                      </span>
                      <span>
                        {partnerEmail ?? `User ${grant.user_id.split("-")[0]}…`}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{grant.can_export ? "Export allowed" : "Export denied"}</span>
                    </p>
                  </div>
                  <ConfirmActionForm
                    action={deleteAssetGrantAction}
                    fields={{
                      workspace_id: workspaceId,
                      grant_id: grant.id,
                    }}
                    title="Revoke grant?"
                    description={`Access for ${partnerEmail ?? "this partner"} will be removed.`}
                    confirmLabel="Revoke grant"
                    buttonLabel="Revoke"
                  />
                </div>
              );
            })}

            {grantsLoadSuccess && grants.length === 0 ? (
              <EmptyState
                kicker="No grants yet"
                description="Authorize a dashboard or question for an external partner when you’re ready."
                action={
                  externalClients.length > 0 ? (
                    <Link href="/members?grant=1" className="dby-btn dby-btn--secondary">
                      <DsIcon icon={Plus} className="dby-btn__icon" />
                      New grant
                    </Link>
                  ) : null
                }
              />
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
