import type { WorkspaceContext } from "@dashboardy/types";

export function WorkspaceBadge({
  workspace,
}: {
  workspace: Pick<WorkspaceContext, "workspace_name">;
}) {
  return (
    <div
      className="inline-flex items-center gap-2 rounded border bg-white px-3 py-1 text-sm"
      data-testid="workspace-badge"
    >
      <span className="text-gray-600">Workspace</span>
      <span className="font-medium">{workspace.workspace_name}</span>
    </div>
  );
}

