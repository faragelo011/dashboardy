# Badge

A compact status pill with a leading dot. The dot + text label mean status is never conveyed by color alone (WCAG 2.2 AA). Use for the connection lifecycle, execution outcomes, member status, and export flags.

```jsx
<Badge tone="ok">active</Badge>
<Badge tone="warn">pending test</Badge>
<Badge tone="danger">test failed</Badge>
<Badge tone="idle">not configured</Badge>
<Badge tone="info">override</Badge>
<Badge tone="neutral" dot={false}>Admin</Badge>
```

Tone → meaning: `ok`=active/success, `warn`=pending/queued, `danger`=failed/denied, `info`=accent note (override), `idle`=neutral/inactive. Lowercase, terse labels.
