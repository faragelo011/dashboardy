# ThemeToggle

Light/dark switch. Sets `data-theme` on `<html>` and persists to localStorage under `dashboardy-theme` (matching the app's no-FOUC bootstrap). Shows a sun in dark mode, a moon in light mode. Built on `IconButton`.

```jsx
<TopNav actions={<><ThemeToggle/><Button size="sm" variant="secondary">Sign out</Button></>} />
```

No required props. To avoid a flash, set `document.documentElement.dataset.theme` from localStorage in an inline `<head>` script before first paint.
