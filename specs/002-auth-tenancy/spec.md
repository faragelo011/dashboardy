# Feature Specification: Auth + Tenancy

**Feature Branch**: `002-auth-tenancy`  
**Created**: 2026-04-27  
**Status**: Draft  
**Input**: User description: "Create a specification for Feature 2 only from docs/implementation-plan.md"

## Clarifications

### Session 2026-04-27

- Q: How do the first tenant, workspace, and initial admin membership come into existence for the MVP? → A: Tenants, workspaces, and initial admins are pre-provisioned by an operator for MVP.
- Q: How should admins remove a member's workspace access in Feature 2? → A: Admins deactivate memberships; inactive members lose access but history remains.
- Q: What baseline permissions should each membership role imply for planning and acceptance tests? → A: Admin manages members; analyst authors; viewer reads granted content; external client reads explicit asset grants only.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Access Protected Workspace (Priority: P1)

An existing workspace member signs in and reaches the application with their identity, tenant, workspace, and role resolved before any protected content is shown.

**Why this priority**: All later product features depend on every protected action being tied to the correct tenant, workspace, and membership role.

**Independent Test**: Can be tested by signing in as a known member and confirming that only that member's workspace context and role-aware navigation are available.

**Acceptance Scenarios**:

1. **Given** a valid signed-in workspace member, **When** the member opens the application, **Then** the system identifies the member, their tenant, their workspace, and their role before showing protected content.
2. **Given** a person who is not signed in, **When** they attempt to open protected content, **Then** they are blocked and guided to sign in.
3. **Given** a signed-in person with no workspace membership, **When** they attempt to access protected content, **Then** they are denied access and no tenant-scoped information is shown.

---

### User Story 2 - Admin Manages Workspace Members (Priority: P2)

An admin invites and manages workspace members, assigning one authoritative role per member so access decisions are consistent across the product.

**Why this priority**: The platform needs a reliable way to establish who belongs to a workspace and what each person is allowed to do.

**Independent Test**: Can be tested by signing in as an admin, inviting a member, assigning a role, and verifying the new member's access matches that role.

**Acceptance Scenarios**:

1. **Given** an admin is signed in, **When** they invite a person by email and assign a role, **Then** the invited person can complete account setup and becomes a member of the workspace with that role.
2. **Given** a non-admin member is signed in, **When** they attempt to manage workspace members, **Then** the system denies the action.
3. **Given** an admin changes a member's role, **When** the affected member next performs a protected action, **Then** the system applies the updated role.

---

### User Story 3 - External Client Receives Limited Access (Priority: P3)

An admin grants an external client access only to explicitly selected business assets, while hiding authoring details and underlying data connection information.

**Why this priority**: External clients must be able to consume shared outputs without receiving internal authoring capabilities or sensitive operational details.

**Independent Test**: Can be tested by inviting an external client, granting one asset, and verifying they can see only that granted asset and no authoring details.

**Acceptance Scenarios**:

1. **Given** an external client has been invited and granted one asset, **When** they sign in, **Then** they can access only the granted asset.
2. **Given** an external client has no grant for an asset, **When** they attempt to access it, **Then** the system denies access.
3. **Given** an external client views a granted asset, **When** the asset is displayed, **Then** underlying query text, connection details, and internal authoring controls are not shown.

---

### User Story 4 - Single-Workspace MVP Experience (Priority: P4)

A member in the MVP sees their single workspace clearly without being asked to choose among multiple workspaces.

**Why this priority**: The current product scope supports one workspace per tenant, so the experience should avoid unnecessary switching complexity while leaving the concept visible.

**Independent Test**: Can be tested by signing in as a member and verifying the workspace name is visible while workspace switching is hidden or disabled.

**Acceptance Scenarios**:

1. **Given** a signed-in member belongs to the tenant's workspace, **When** they open the application shell, **Then** they see the workspace name.
2. **Given** only one workspace is available, **When** the member looks for workspace switching, **Then** switching is either hidden or clearly disabled.

### Edge Cases

- A valid signed-in person without a membership is denied access and no tenant data is disclosed.
- A member with a revoked or changed role receives permissions based on the latest membership state.
- Duplicate invitations or repeated membership creation attempts do not create duplicate memberships for the same person and workspace.
- Deactivated members are denied protected tenant-scoped access while historical references to their prior membership remain available for audit and records.
- External clients cannot access assets through collection-level sharing unless they also have an explicit asset grant.
- Protected tenant-scoped actions fail closed if tenant, workspace, membership, or role cannot be resolved.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST require sign-in before showing protected tenant-scoped application content.
- **FR-002**: The system MUST associate every protected tenant-scoped action with exactly one signed-in user, tenant, workspace, and membership role.
- **FR-003**: The system MUST deny protected tenant-scoped access when any required identity, tenant, workspace, membership, or role context is missing.
- **FR-004**: The system MUST support the roles analyst, admin, viewer, and external client as the authoritative membership roles for this feature.
- **FR-005**: The system MUST treat admins as the only role allowed to manage workspace members, roles, and membership status.
- **FR-006**: The system MUST treat analysts as internal authors who can create and manage authored BI content when later content features are available.
- **FR-007**: The system MUST treat viewers as internal consumers who can read granted content without authoring or member-management permissions.
- **FR-008**: The system MUST treat external clients as external consumers who can read only explicitly granted assets.
- **FR-009**: The system MUST store one authoritative role per member per workspace and prevent duplicate memberships for the same person and workspace.
- **FR-010**: The system MUST support one workspace per tenant for the MVP experience.
- **FR-011**: The system MUST rely on operator pre-provisioning for tenant, workspace, and initial admin membership creation in the MVP.
- **FR-012**: The system MUST let signed-in members view their own profile context, including available workspace and role information.
- **FR-013**: The system MUST let admins invite people to the workspace by email and assign a membership role during or after invitation.
- **FR-014**: The system MUST let admins deactivate memberships to remove future workspace access while preserving historical membership references.
- **FR-015**: The system MUST deny protected tenant-scoped access to inactive memberships.
- **FR-016**: The system MUST prevent non-admin members from inviting members, changing roles, deactivating memberships, or otherwise managing workspace membership.
- **FR-017**: The system MUST apply role and membership-status changes to subsequent protected actions without requiring manual data cleanup by an operator.
- **FR-018**: The system MUST provide a consistent permission decision for protected actions, including an allow or deny result and a reason when denied.
- **FR-019**: The system MUST support internal collection-level sharing using workspace memberships.
- **FR-020**: The system MUST support explicit external-client grants for individual questions and dashboards.
- **FR-021**: The system MUST default external-client export permission to off unless an admin explicitly enables it for a granted asset.
- **FR-022**: The system MUST ensure external clients only receive assets explicitly granted to them and never receive underlying query text, connection details, or internal authoring controls.
- **FR-023**: The system MUST show the current workspace name in the signed-in experience and hide or disable workspace switching while only one workspace is available.

### Key Entities *(include if feature involves data)*

- **Tenant**: The customer or organization boundary that owns workspace data and isolates it from other tenants.
- **Workspace**: The user's working area within a tenant; the MVP supports one workspace per tenant.
- **Member**: A signed-in person connected to a workspace with one role and an active or inactive membership status.
- **Role**: The access level assigned to a member: admin manages members, analyst authors content, viewer reads granted internal content, and external client reads explicit asset grants only.
- **Collection Grant**: Internal sharing permission that gives workspace members access to a collection.
- **Asset Grant**: External-client permission for a specific question or dashboard, with optional export permission.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of protected tenant-scoped actions either resolve a user, tenant, workspace, and role or are denied before tenant data is returned.
- **SC-002**: Signed-in members with valid memberships can reach their protected workspace context in under 3 seconds under normal operating conditions.
- **SC-003**: 100% of users without a valid membership are denied protected tenant-scoped access without exposure to tenant-specific content.
- **SC-004**: Admins can invite a new workspace member and assign a role in under 2 minutes during usability testing.
- **SC-005**: 100% of non-admin attempts to manage workspace membership are denied.
- **SC-006**: External clients can access only explicitly granted assets in access tests, with no exposure of authoring details or connection information.
- **SC-007**: At least 95% of role or grant changes are reflected on the affected user's next protected action without requiring sign-out.
- **SC-008**: 100% of deactivated memberships are denied protected tenant-scoped access on their next protected action while historical membership references remain available.

## Assumptions

- The MVP supports one workspace per tenant, even though the product model may support more workspaces later.
- Tenant, workspace, and first admin membership records are created by an operator before normal member invitation begins.
- Users already have or can complete an email-based sign-in flow before accessing protected content.
- Workspace membership is the authoritative source for a user's role in this feature.
- External clients are invited as signed-in users, not anonymous public link recipients.
- Export access for external clients is disabled by default and must be explicitly granted per asset.
- Detailed dashboard, question, and connection capabilities are handled by later features; this feature only establishes access context and permissions needed by those capabilities.
