# Widget

The dashboard widget frame (chrome) for KPI, bar, line, and table content. It owns the title, the **always-visible override indicator**, the per-widget **force-refresh** control, and independent **loading / error / empty** states so one slow widget never blocks the canvas. Pass the chart or table as children; pass a scalar via `kpi`.

```jsx
<Widget title="Total revenue" kpi="$23.8M" footer={<><span>Cache hit</span><span>10m TTL</span></>} onRefresh={refetch} />
<Widget title="Revenue by region" onRefresh={refetch}><BarChart …/></Widget>
<Widget title="Signups" state="loading" />
<Widget title="Churn" state="error" error="timeout: 30s" onRefresh={refetch} />
<Widget title="Orders" override onRefresh={refetch}><Table …/></Widget>
```

**Override rule:** whenever a widget's filter state diverges from the global filter bar, set `override` — hidden divergence is forbidden. States: `ok` / `loading` / `error` / `empty`. The override indicator is a labeled Badge (dot + text), not color alone.
