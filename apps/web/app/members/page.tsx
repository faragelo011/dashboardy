import { redirect } from "next/navigation";

import { getProtectedMe } from "@/app/(protected)/data";
import { listWorkspaceMembers } from "@/app/lib/members-api";
import { createServerSupabase } from "@/app/lib/supabase-server";

import {
  deactivateMemberAction,
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
  if (!token) {
    redirect("/sign-in");
  }

  const workspaceId = me.current_workspace.workspace_id;
  const { members } = await listWorkspaceMembers(token, workspaceId);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Workspace members</h1>
        <p className="text-sm text-gray-600">
          Admin-only. Invite, change roles, or deactivate access.
        </p>
      </div>

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
                <button className="rounded border px-2 py-1 text-sm">
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
    </div>
  );
}

