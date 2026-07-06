# Checkbox

Boolean control with an inline label, tinted with the accent color. Used for "Allow export", "Required" parameter flags, boolean parameter inputs.

```jsx
<Checkbox label="Authorize download" name="can_export" />
<Checkbox defaultChecked label="Required" />
```

Props: `label` (or children), plus all native checkbox attributes (`checked`, `defaultChecked`, `disabled`, `onChange`).
