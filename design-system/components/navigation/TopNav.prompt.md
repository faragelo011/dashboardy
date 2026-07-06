# TopNav

The sticky workspace shell header — blurred translucent bar with the **Dashboardy** text wordmark (there is no logo mark), permission-gated nav links, and a right-side actions slot for the theme toggle and sign-out.

```jsx
<TopNav
  items={[
    { label: "Home", href: "/", active: true },
    { label: "Members", href: "/members" },
    { label: "Connections", href: "/connections" },
    { label: "Collections", href: "/collections" },
    { label: "Dashboards", href: "/dashboards" },
  ]}
  actions={<><ThemeToggle/><Button variant="secondary" size="sm">Sign out</Button></>}
/>
```

Gate `items` by role — **hide** unreachable areas, never show-then-disable. Set `active` on the current route. Props: `brand`, `brandHref`, `items`, `actions`, `sticky`, `maxWidth`.
