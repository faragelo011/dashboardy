# Forward-fix plan for migration <revision_id>

**When this is required**: the migration's `downgrade()` is unsafe or cannot reverse data loss.

- Trigger condition: <describe the scenario that would prompt a forward-fix instead of a downgrade>
- Proposed forward-fix migration: <describe what the next migration would do to recover>
- Validation steps: <how to verify recovery in staging before applying to production>
- On-call notification: <who to page>

