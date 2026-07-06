# Button

The primary action control. Use `primary` for the single main action on a surface, `secondary` for neutral/most buttons, `ghost` for low-emphasis toolbar/row actions, and `danger` for destructive confirmations. Dense (4px radius, 13px label) to match the "Technical Dense" system.

```jsx
<Button variant="primary" onClick={save}>Save connection</Button>
<Button variant="secondary">Back to list</Button>
<Button variant="ghost" size="sm">Remove</Button>
<Button variant="danger">Rotate credentials</Button>
<Button variant="primary" fullWidth leftIcon={<PlusIcon/>}>New dashboard</Button>
```

Variants: `primary` · `secondary` · `ghost` · `danger`. Sizes: `sm` · `md` (default) · `lg`. Props: `fullWidth`, `leftIcon`, `rightIcon`, plus all native `<button>` attributes (`disabled`, `type`, `onClick`, `aria-*`). Never use color alone to signal danger — pair with a clear label.
