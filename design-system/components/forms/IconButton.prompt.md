# IconButton

A square, icon-only button (32px default). Use for the theme toggle, table-row actions, and compact toolbar controls. Always pass an `aria-label` and a 15px stroke-2 icon.

```jsx
<IconButton aria-label="Switch to dark theme"><MoonIcon/></IconButton>
<IconButton variant="ghost" size="sm" aria-label="More actions"><DotsIcon/></IconButton>
```

Variants: `default` (bordered surface, hover raises) · `ghost` (transparent until hover). Sizes: `sm` (28px) · `md` (32px).
