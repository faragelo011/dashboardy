import type { WorkspaceContext } from "@dashboardy/types";

import { WorkspaceBadge as DsWorkspaceBadge } from "@/components/ds/workspace-badge";

export function WorkspaceBadge({
  workspace,
}: {
  workspace: Pick<WorkspaceContext, "workspace_name">;
}) {
  return (
    <DsWorkspaceBadge name={workspace.workspace_name} data-testid="workspace-badge" />
  );
}
