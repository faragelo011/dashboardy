/**
 * Mirrors `contracts/data-connections.openapi.yaml` (Dashboardy Feature 3).
 * Credential fields (`SnowflakeCredentials`) are intentionally write-only there;
 * omit them when typing API responses (`DataConnection`).
 */
export type ConnectionStatus =
  | "not_configured"
  | "pending_test"
  | "active"
  | "test_failed";

export type FailureCategory =
  | "credential"
  | "network"
  | "permission"
  | "timeout"
  | "unknown";

export interface DataConnection {
  id?: string;
  tenant_id?: string;
  name?: string;
  warehouse?: string;
  database?: string;
  schema?: string | null;
  status: ConnectionStatus;
  has_credentials: boolean;
  secret_version?: number;
  last_tested_at?: string | null;
  last_successful_test_at?: string | null;
  last_error?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface SnowflakeCredentials {
  account: string;
  username: string;
  role: string;
  /** Password auth; omit when using private_key_pem */
  password?: string;
  /** PEM PKCS#8 private key for key-pair auth; omit when using password */
  private_key_pem?: string;
  /** Optional passphrase if private_key_pem is encrypted */
  private_key_passphrase?: string;
}

export interface UpsertConnectionRequest {
  name: string;
  warehouse: string;
  database: string;
  schema?: string | null;
  credentials?: SnowflakeCredentials;
}

export interface RotateConnectionRequest {
  credentials: SnowflakeCredentials;
}

export type ConnectionTestStatus = "success" | "failure";

export interface ConnectionTestResponse {
  connection: DataConnection;
  test_status: ConnectionTestStatus;
  failure_category?: FailureCategory;
  sanitized_error?: string | null;
}

/** Normalized Problem JSON for Feature 3 routes (`components.schemas.ErrorResponse`). */
export interface DataConnectionsErrorResponse {
  error_code: string;
  message: string;
  details?: Record<string, unknown> | null;
}
