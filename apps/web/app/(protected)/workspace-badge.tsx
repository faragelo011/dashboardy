import type { WorkspaceContext } from "@dashboardy/types";

export function WorkspaceBadge({
  workspace,
}: {
  workspace: Pick<WorkspaceContext, "workspace_name">;
}) {
  return (
    <div
      className="inline-flex items-center gap-2 rounded-[4px] border border-border-1 bg-surface-1 px-2.5 py-1 text-xs text-ink"
      data-testid="workspace-badge"
    >
      <span className="text-ink-muted">Workspace</span>
      <span className="font-medium text-ink-strong">{workspace.workspace_name}</span>
    </div>
  );
}

