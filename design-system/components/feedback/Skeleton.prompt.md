# Skeleton

A pulsing placeholder for loading states — the app shell on first paint, per-widget loading on the dashboard canvas, and table rows. Respects reduced-motion (animation off). Compose several to mirror the eventual layout.

```jsx
<Skeleton width={112} height={32} />
<Skeleton width="60%" height={16} />
<Skeleton circle width={28} height={28} />
```

Per-widget loading pattern: render a Skeleton inside the Widget frame while `state="loading"`, so one slow widget never blocks the rest of the canvas.
