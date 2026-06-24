# Contracts: Saved Questions and Collections

Feature 5 exposes workspace-scoped collection and saved-question APIs documented in [saved-questions.openapi.yaml](saved-questions.openapi.yaml).

The contract covers:

- flat collection list/create/update/delete with duplicate-name and non-empty-delete refusals
- saved question list/create/detail/update/delete
- clone into a target collection
- execute through the Feature 4 query engine
- synchronous CSV export capped at 10,000 rows

External clients may access only explicitly granted saved questions and never receive `sql_text` or collection administration fields. Export requires separate export permission.
