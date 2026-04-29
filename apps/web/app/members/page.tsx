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

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Workspace members</h1>
        <p className="text-sm text-gray-600">
          Admin-only. Invite, change roles, or deactivate access.
        </p>
      </div>

      {loadError ? (
        <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {loadError}
        </div>
      ) : null}

      <form action={inviteMemberAction} className="rounded border p-4 space-y-3">
        <input type="hidden" name="workspace_id" value={workspaceId} />
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="sm:col-span-2">
            <div className="text-sm font-medium">Email</div>
            <input
              name="email"
              type="email"
              required
              className="mt-1 w-full rounded border px-3 py-2"
              placeholder="member@example.com"
            />
          </label>
          <label>
            <div className="text-sm font-medium">Role</div>
            <select
              name="role"
              className="mt-1 w-full rounded border px-3 py-2"
              defaultValue="viewer"
            >
              <option value="admin">admin</option>
              <option value="analyst">analyst</option>
              <option value="viewer">viewer</option>
              <option value="external_client">external_client</option>
            </select>
          </label>
        </div>
        <button className="rounded bg-black px-4 py-2 text-white">
          Invite member
        </button>
      </form>

      <div className="rounded border">
        <div className="grid grid-cols-12 gap-2 border-b bg-gray-50 px-4 py-2 text-xs font-medium text-gray-600">
          <div className="col-span-4">Email</div>
          <div className="col-span-2">Role</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-4 text-right">Actions</div>
        </div>

        {members.map((m) => (
          <div
            key={m.id}
            className="grid grid-cols-12 items-center gap-2 px-4 py-3 border-b last:border-b-0"
          >
            <div className="col-span-4 text-sm">{m.email}</div>
            <div className="col-span-2">
              <form action={updateMemberRoleAction} className="flex gap-2">
                <input type="hidden" name="workspace_id" value={workspaceId} />
                <input type="hidden" name="membership_id" value={m.id} />
                <select
                  name="role"
                  defaultValue={m.role}
                  className="w-full rounded border px-2 py-1 text-sm"
                  disabled={m.status !== "active"}
                >
                  <option value="admin">admin</option>
                  <option value="analyst">analyst</option>
                  <option value="viewer">viewer</option>
                  <option value="external_client">external_client</option>
                </select>
                <button
                  className="rounded border px-2 py-1 text-sm"
                  disabled={m.status !== "active"}
                >
                  Save
                </button>
              </form>
            </div>
            <div className="col-span-2 text-sm">{m.status}</div>
            <div className="col-span-4 text-right">
              <form action={deactivateMemberAction} className="inline">
                <input type="hidden" name="workspace_id" value={workspaceId} />
                <input type="hidden" name="membership_id" value={m.id} />
                <button
                  className="rounded border px-3 py-1 text-sm"
                  disabled={m.status !== "active"}
                >
                  Deactivate
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <div>
          <h2 className="text-xl font-semibold">External client asset grants</h2>
          <p className="text-sm text-gray-600">
            Admin-only. Grants allow external clients to access specific questions or
            dashboards.
          </p>
        </div>

        <form action={createAssetGrantAction} className="rounded border p-4 space-y-3">
          <input type="hidden" name="workspace_id" value={workspaceId} />
          <div className="grid gap-3 sm:grid-cols-4">
            <label className="sm:col-span-2">
              <div className="text-sm font-medium">External client</div>
              <select
                name="user_id"
                required
                className="mt-1 w-full rounded border px-3 py-2"
                defaultValue=""
              >
                <option value="" disabled>
                  Select an external client…
                </option>
                {members
                  .filter((m) => m.role === "external_client" && m.status === "active")
                  .map((m) => (
                    <option key={m.id} value={m.user_id}>
                      {m.email} ({m.role})
                    </option>
                  ))}
              </select>
            </label>
            <label>
              <div className="text-sm font-medium">Asset type</div>
              <select
                name="asset_type"
                className="mt-1 w-full rounded border px-3 py-2"
                defaultValue="dashboard"
              >
                <option value="dashboard">dashboard</option>
                <option value="question">question</option>
              </select>
            </label>
            <label>
              <div className="text-sm font-medium">Can export</div>
              <div className="mt-2 flex items-center gap-2">
                <input name="can_export" type="checkbox" />
                <span className="text-sm text-gray-700">Allow</span>
              </div>
            </label>
          </div>
          <label>
            <div className="text-sm font-medium">Asset id (UUID)</div>
            <input
              name="asset_id"
              required
              pattern="^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
              title="Enter UUID in format xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              className="mt-1 w-full rounded border px-3 py-2"
              placeholder="00000000-0000-0000-0000-000000000000"
            />
          </label>
          <button className="rounded bg-black px-4 py-2 text-white">
            Create grant
          </button>
        </form>

        <div className="rounded border">
          <div className="grid grid-cols-12 gap-2 border-b bg-gray-50 px-4 py-2 text-xs font-medium text-gray-600">
            <div className="col-span-3">User</div>
            <div className="col-span-2">Type</div>
            <div className="col-span-3">Asset</div>
            <div className="col-span-2">Export</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>
          {grants.map((g) => (
            <div
              key={g.id}
              className="grid grid-cols-12 items-center gap-2 px-4 py-3 border-b last:border-b-0"
            >
              <div className="col-span-3 text-sm font-mono truncate">{g.user_id}</div>
              <div className="col-span-2 text-sm">{g.asset_type}</div>
              <div className="col-span-3 text-sm font-mono truncate">{g.asset_id}</div>
              <div className="col-span-2 text-sm">
                {g.can_export ? "true" : "false"}
              </div>
              <div className="col-span-2 text-right">
                <form action={deleteAssetGrantAction} className="inline">
                  <input type="hidden" name="workspace_id" value={workspaceId} />
                  <input type="hidden" name="grant_id" value={g.id} />
                  <button className="rounded border px-3 py-1 text-sm">Delete</button>
                </form>
              </div>
            </div>
          ))}
          {grantsLoadSuccess && grants.length === 0 ? (
            <div className="px-4 py-6 text-sm text-gray-600">No grants yet.</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

