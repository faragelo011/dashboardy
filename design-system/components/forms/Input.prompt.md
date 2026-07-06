# Input

Single-line text field for all native input types. Mirrors `.ds-input` — 4px radius, 13px text, accent focus ring. Wrap in a `Field` for the label + help + error.

```jsx
<Field label="Email"><Input type="email" name="email" placeholder="you@company.com" /></Field>
<Input mono placeholder="00000000-0000-4000-8000-000000000000" />
<Input invalid aria-describedby="err" />
```

Props: `size` (`sm`/`md`), `mono`, `invalid`, plus all native `<input>` attributes. Use `type="number"|"date"` for numeric/date parameters.
