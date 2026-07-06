# DataTable

Columnar data with optional **client-side** pagination over a server-capped result set (never an unbounded "load more" — that maps to the platform's hard row cap). Used for the member roster, asset grants, saved-question results, and table widgets.

```jsx
<DataTable
  pageSize={10}
  columns={[
    { key: "email", header: "Identity" },
    { key: "role", header: "Role" },
    { key: "status", header: "Status", render: (r) => <Badge tone={r.ok ? "ok" : "idle"}>{r.status}</Badge> },
    { key: "joined", header: "Joined", mono: true, align: "right" },
  ]}
  rows={members}
  getRowKey={(r) => r.id}
/>
```

Columns declare `align`, `mono`, `width`, and a custom `render`. Empty cells render as "—". Pagination shows an "X–Y of N" range with Previous / Next.
