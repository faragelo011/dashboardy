import type { WorkspaceContext } from "@dashboardy/types";

export function WorkspaceBadge({
  workspace,
}: {
  workspace: Pick<WorkspaceContext, "workspace_name">;
}) {
  return (
    <div
      className="inline-flex items-center gap-2 rounded-xl border border-border-1 bg-surface-0 px-3 py-1 text-sm text-ink"
      data-testid="workspace-badge"
    >
      <span className="text-ink-muted">Workspace</span>
      <span className="font-medium">{workspace.workspace_name}</span>
    </div>
  );
}

