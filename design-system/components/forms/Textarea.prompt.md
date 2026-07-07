# Textarea

Multi-line input. Defaults to the body font for prose (descriptions); pass `mono` for SQL, PEM keys, and other code-like content — matching the app's SQL editor field.

```jsx
<Field label="Description"><Textarea name="description" rows={2} /></Field>
<Field label="SQL"><Textarea mono rows={8} spellCheck={false} /></Field>
```

Props: `mono`, `invalid`, `rows`, plus all native `<textarea>` attributes. Resizes vertically only.
