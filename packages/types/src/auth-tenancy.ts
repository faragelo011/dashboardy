export type MembershipRole = "admin" | "analyst" | "viewer" | "external_client";

export type MembershipStatus = "active" | "inactive";

export type AssetType = "question" | "dashboard";

export interface UserContext {
  id: string;
  email: string;
}

export interface WorkspaceContext {
  tenant_id: string;
  workspace_id: string;
  workspace_name: string;
  role: MembershipRole;
  membership_status: MembershipStatus;
}

export interface MeResponse {
  user: UserContext;
  current_workspace: WorkspaceContext;
  workspaces: WorkspaceContext[];
}

export interface Member {
  id: string;
  user_id: string;
  email: string;
  role: MembershipRole;
  status: MembershipStatus;
  created_at: string;
  deactivated_at?: string | null;
}

export interface InviteMemberRequest {
  email: string;
  role: MembershipRole;
}

type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = T & {
  [K in Keys]-?: Required<Pick<T, K>> & Partial<Omit<T, K>>;
}[Keys];

type UpdateMemberRequestFields = {
  role?: MembershipRole;
  status?: MembershipStatus;
};

export type UpdateMemberRequest = RequireAtLeastOne<
  UpdateMemberRequestFields,
  "role" | "status"
>;

export interface AssetGrant {
  id: string;
  user_id: string;
  asset_type: AssetType;
  asset_id: string;
  can_export: boolean;
  created_at: string;
}

export interface CreateAssetGrantRequest {
  user_id: string;
  asset_type: AssetType;
  asset_id: string;
  can_export?: boolean;
}
