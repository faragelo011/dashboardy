# Card

The flat, border-defined surface that holds almost everything — forms, panels, list rows, widgets. **No drop shadow**: elevation is a 1px border plus a surface tint. Use `inset` for a recessed area, `dashed` for empty placeholders.

```jsx
<Card padding="lg" title="Diagnostic test" actions={<Button size="sm">Test connection</Button>}>
  …
</Card>
<Card inset padding="md">Session context…</Card>
<Card dashed padding="lg">Save to render widget</Card>
```

Props: `inset`, `dashed`, `padding` (`none`/`sm`/`md`/`lg`), `title`, `actions`.
