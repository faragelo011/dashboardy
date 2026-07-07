# EmptyState

A dashed panel for "nothing here yet" surfaces: no collections, questions, dashboards, grants, or query results. Terse kicker title + one explanatory line, optional action.

```jsx
<EmptyState title="No grants" description="No external distributions have been authorized yet." />
<EmptyState
  title="No dashboards"
  description="Assemble KPI, chart, and table widgets from saved questions."
  action={<Button variant="primary">Create dashboard</Button>}
/>
```

Props: `title`, `description`, `icon`, `action`.
