# Research: Saved Questions and Collections

**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## Decision: Use a dedicated `questions` backend domain

**Rationale**: Saved questions own collection CRUD, question lifecycle, clone, scalar parameter validation, execute orchestration, and CSV export. A dedicated domain keeps authoring behavior separate from the lower-level Feature 4 query engine while still delegating actual warehouse execution and audit writes to it.

**Alternatives considered**:

- Put saved-question routes directly in `query_engine`: rejected because CRUD, grants, clone, and collection lifecycle are asset-management concerns, not execution-pipeline concerns.
- Put collection logic in `tenancy`: rejected because tenancy should remain the central permission decision service, not the owner of saved-question persistence and authoring workflows.

## Decision: Treat Feature 2 collection grant enum as a reserved pre-Feature-5 shape to align to `view`/`edit`

**Rationale**: The clarified Feature 5 spec says collection and question grants support only `view` and `edit`; export is separate. Feature 2 reserved a `collection_grants` shape with `read`/`write`/`admin`, but no Feature 5 collection asset existed yet. Feature 5 should migrate or normalize the enum to the product vocabulary before production usage, mapping `read` → `view` and `write`/`admin` → `edit` only if legacy test fixtures or seed data exist.

**Alternatives considered**:

- Keep `read`/`write`/`admin`: rejected because it contradicts the clarified spec and implies grant administration semantics not approved for Feature 5.
- Add `export` to collection grants: rejected because export is intentionally separate and must remain explicit, especially for external clients.

## Decision: Use `collections`, `saved_questions`, and `question_grants`

**Rationale**: The implementation plan requires flat collections, one collection per saved question, and explicit question-level widens. Existing `collection_grants` and `asset_grants` provide internal and external sharing inputs. A `question_grants` table is needed for internal per-question widens without overloading external `asset_grants`.

**Alternatives considered**:

- Store question grants inside saved-question JSON: rejected because permission queries must be tenant-scoped, indexable, and centrally enforceable.
- Use only collection grants: rejected because the spec explicitly allows per-question widens beyond collection inheritance.

## Decision: Refuse deletion of non-empty collections

**Rationale**: Refusing collection deletion while active saved questions remain prevents accidental content loss, avoids silent orphaning, and keeps MVP deletion flows straightforward. Users must move or delete active questions first.

**Alternatives considered**:

- Cascade soft-delete questions: rejected due to accidental broad deletion risk.
- Prompt for move/delete during deletion: deferred because it adds a bulk workflow beyond the Feature 5 baseline.

## Decision: Require unique collection names within a workspace

**Rationale**: Flat collections should be easy to scan and grant. Unique names avoid ambiguity in move, clone, delete, and permission-management flows while still allowing the same name in different workspaces.

**Alternatives considered**:

- Allow duplicate display names with generated locators: rejected because it makes flat navigation and support/debugging harder.
- Allow duplicates after confirmation: rejected because it preserves the ambiguity the product is trying to avoid.

## Decision: Limit parameter schema to scalar types

**Rationale**: `string`, `number`, `boolean`, and `date` cover core MVP filters and are straightforward to validate before execution/export. List or complex types can be added later once dashboard filter binding semantics need them.

**Alternatives considered**:

- Support scalar plus list parameters: deferred to avoid query-binding and UI complexity before dashboards.
- Support string only: rejected because it pushes type coercion ambiguity into SQL and weakens validation.

## Decision: Reject stale updates

**Rationale**: Collection and question editors can be open in multiple sessions. Stale-update rejection prevents silent overwrites and gives clear user feedback when the underlying record changed after load.

**Alternatives considered**:

- Last-write-wins: rejected because it can lose authored SQL or grant changes silently.
- Warning-only concurrency: rejected because it still allows accidental overwrite.

## Decision: Execute saved questions via Feature 4 saved-question mode

**Rationale**: Feature 4 already defines `mode: saved_question`, audit fields, cache identity, row limits, timeout behavior, and bypass-cache semantics. Feature 5 should resolve saved-question authorization and SQL/parameter declarations, then call the shared execution service with `saved_question_id`.

**Alternatives considered**:

- Implement a separate execution path in `questions`: rejected because it would duplicate parser, binding, queue, cache, and audit behavior.
- Continue using only ad hoc execution: rejected because saved-question audit attribution and permission checks are required.

## Decision: CSV export is synchronous and capped

**Rationale**: The constitution and implementation plan require manual CSV export only, with a hard 10,000 row cap and no async export jobs. Reusing the saved-question execution path ensures authorization, parameter validation, row limits, and audit behavior remain consistent.

**Alternatives considered**:

- Background export jobs: explicitly out of MVP scope.
- XLSX or multiple export formats: explicitly out of MVP scope.
