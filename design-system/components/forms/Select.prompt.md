# Select

Native dropdown styled to match `.ds-select` (custom chevron, accent focus ring). Used for role pickers, collection filters, widget types, parameter types.

```jsx
<Field label="Widget type">
  <Select options={["KPI","Bar","Line","Table"]} defaultValue="KPI" />
</Field>

<Select size="sm" name="role" defaultValue="viewer">
  <option value="admin">Admin</option>
  <option value="viewer">Viewer</option>
</Select>
```

Props: `options` (array of strings or `{value,label,disabled}`), `size` (`sm`/`md`), plus all native `<select>` attributes.
