# Alert

An inline notice with a colored left rule. Sits in the content flow (not a toast). Use for typed execution outcomes, sanitized connection errors, security notes, and permission refusals. `danger` sets `role="alert"` automatically.

```jsx
<Alert tone="danger" title="Test failed">timeout: warehouse did not respond in 30s</Alert>
<Alert tone="info" title="Security">Credentials are write-only and never returned after saving.</Alert>
<Alert tone="warn" title="Queued">Execution is queued under load; results will appear shortly.</Alert>
```

Tones: `info` (accent), `danger`, `success`, `warn`. Props: `title`, `icon`, children (body). Keep messages sanitized — never surface secrets or raw SQL to consumers.
