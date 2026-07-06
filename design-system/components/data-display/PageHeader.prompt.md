# PageHeader

The standard screen header that opens every primary surface: kicker eyebrow + title + description, with an optional right-aligned actions cluster and an above-title slot for the workspace badge or status.

```jsx
<PageHeader
  kicker="Administrative settings"
  title="Data connection"
  description="Configure connectivity metadata and deploy credentials."
  actions={<Badge tone="ok">active</Badge>}
/>
<PageHeader above={<WorkspaceBadge name="Acme Analytics" />} kicker="Overview" title="Dashboardy" />
```

Props: `kicker`, `title`, `description`, `actions`, `above`, `bordered` (default true).
