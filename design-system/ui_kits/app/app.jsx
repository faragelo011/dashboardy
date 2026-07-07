/* global React, ReactDOM */
// Dashboardy — interactive UI-kit recreation. Composes the design-system
// components (window.DashboardyDesignSystem_787e56) into click-through screens
// that mirror the real Next.js app: sign-in → workspace → admin → dashboards.

const NS = window.DashboardyDesignSystem_787e56;
const {
  TopNav, ThemeToggle, WorkspaceBadge, PageHeader, Card, Button, IconButton,
  Field, Input, Textarea, Select, Checkbox, Badge, Alert, EmptyState, Skeleton,
  Stat, DataTable, Divider, Widget, Kicker,
} = NS;
const { useState, useEffect, useRef, Fragment } = React;

/* ---------- tiny inline icons (Lucide-style, stroke 2) ---------- */
const Ico = {
  plus: "M12 5v14M5 12h14",
  search: "M11 11m-8 0a8 8 0 1 0 16 0a8 8 0 1 0-16 0M21 21l-4.3-4.3",
  download: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3",
  arrowLeft: "M19 12H5M12 19l-7-7 7-7",
  external: "M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6",
};
function Icon({ name, size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={Ico[name]} />
    </svg>
  );
}

/* ---------- lightweight SVG charts (viz palette) ---------- */
function BarChart({ data, height = 150 }) {
  const w = 320, pad = 6, max = Math.max(...data.map((d) => d.y));
  const bw = (w - pad * 2) / data.length;
  return (
    <svg viewBox={`0 0 ${w} ${height}`} width="100%" height={height} preserveAspectRatio="none" role="img" aria-label="Bar chart">
      {[0.25, 0.5, 0.75].map((g) => (
        <line key={g} x1="0" x2={w} y1={height * g} y2={height * g}
          stroke="oklch(var(--viz-grid))" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
      ))}
      {data.map((d, i) => {
        const bh = (d.y / max) * (height - 20);
        return (
          <rect key={i} x={pad + i * bw + bw * 0.15} y={height - bh} width={bw * 0.7} height={bh}
            rx="2" fill="oklch(var(--viz-1))" />
        );
      })}
    </svg>
  );
}
function LineChart({ data, height = 150 }) {
  const w = 320, max = Math.max(...data.map((d) => d.y)), min = Math.min(...data.map((d) => d.y));
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = height - 14 - ((d.y - min) / (max - min || 1)) * (height - 28);
    return [x, y];
  });
  const path = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  const area = path + ` L ${w} ${height} L 0 ${height} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${height}`} width="100%" height={height} preserveAspectRatio="none" role="img" aria-label="Line chart">
      {[0.25, 0.5, 0.75].map((g) => (
        <line key={g} x1="0" x2={w} y1={height * g} y2={height * g}
          stroke="oklch(var(--viz-grid))" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
      ))}
      <path d={area} fill="oklch(var(--viz-1) / 0.10)" />
      <path d={path} fill="none" stroke="oklch(var(--viz-1))" strokeWidth="2" />
    </svg>
  );
}

/* ---------- fake data ---------- */
const REVENUE = [
  { x: "Jan", y: 42 }, { x: "Feb", y: 55 }, { x: "Mar", y: 61 }, { x: "Apr", y: 58 },
  { x: "May", y: 73 }, { x: "Jun", y: 84 }, { x: "Jul", y: 91 },
];
const REGIONS = [
  { x: "NA", y: 128 }, { x: "EMEA", y: 92 }, { x: "APAC", y: 74 }, { x: "LATAM", y: 39 },
];
const MEMBERS = [
  { id: "m1", email: "amir@acme.com", role: "admin", status: "active", joined: "Feb 12, 2026" },
  { id: "m2", email: "lin@acme.com", role: "analyst", status: "active", joined: "Mar 03, 2026" },
  { id: "m3", email: "dana@acme.com", role: "viewer", status: "active", joined: "Mar 21, 2026" },
  { id: "m4", email: "sana@acme.com", role: "analyst", status: "active", joined: "Apr 19, 2026" },
  { id: "m5", email: "omar@acme.com", role: "viewer", status: "active", joined: "May 02, 2026" },
  { id: "m6", email: "partner@northwind.io", role: "external_client", status: "inactive", joined: "Apr 08, 2026" },
];
const COLLECTIONS = [
  { id: "c1", name: "Revenue", sort: 0 },
  { id: "c2", name: "Growth", sort: 1 },
  { id: "c3", name: "Operations", sort: 2 },
];
const DASHBOARDS = [
  { id: "d1", title: "Revenue Overview", collection: "Revenue", updated: "2h ago" },
  { id: "d2", title: "Growth & Retention", collection: "Growth", updated: "Yesterday" },
  { id: "d3", title: "Ops Health", collection: "Operations", updated: "Apr 30" },
];
const RESULT_ROWS = Array.from({ length: 23 }, (_, i) => ({
  region: ["NA", "EMEA", "APAC", "LATAM"][i % 4],
  segment: ["Enterprise", "Mid-market", "SMB"][i % 3],
  revenue: (42000 - i * 830).toLocaleString(),
  deals: 120 - i * 3,
}));

const roleLabel = (r) => ({ admin: "Admin", analyst: "Analyst", viewer: "Viewer", external_client: "External client" }[r] || r);

/* ================= screens ================= */

function SignIn({ onSignIn }) {
  const [email, setEmail] = useState("analyst@acme.com");
  const [pw, setPw] = useState("••••••••");
  return (
    <main style={{ minHeight: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 24px", position: "relative", overflow: "hidden" }}>
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: "radial-gradient(680px 340px at 50% -8%, oklch(var(--accent) / 0.16), transparent 72%)", pointerEvents: "none" }} />
      <div style={{ width: "100%", maxWidth: 420, position: "relative" }}>
        <header style={{ marginBottom: 24, display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 19, letterSpacing: "-0.02em", color: "var(--text-strong)" }}>Dashboardy</span>
            <span style={{ height: 7, width: 7, borderRadius: "var(--radius-full)", background: "var(--gradient-brand)" }} />
          </div>
          <Kicker>Authorized access</Kicker>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 600, letterSpacing: "-0.01em", color: "var(--text-strong)" }}>Sign in</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>Sign in with your workspace credentials.</p>
        </header>
        <Card padding="lg" style={{ position: "relative", borderRadius: "var(--radius-xl)", boxShadow: "var(--shadow-lg)" }}>
          <form onSubmit={(e) => { e.preventDefault(); onSignIn(); }} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Field label="Email"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
            <Field label="Password"><Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} /></Field>
            <Button variant="primary" type="submit" fullWidth>Sign in</Button>
          </form>
        </Card>
        <p style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 16, textAlign: "center" }}>Demo — any credentials continue.</p>
      </div>
    </main>
  );
}

function SessionRow({ label, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <Kicker>{label}</Kicker>
      <div>{children}</div>
    </div>
  );
}

function Home({ role }) {
  return (
    <Fragment>
      <PageHeader above={<WorkspaceBadge name="Acme Analytics" />} kicker="Overview" title="Dashboardy"
        description="Your workspace overview. Analytics and dashboard modules appear here as they are provisioned." />
      <Card padding="lg" style={{ marginTop: 32 }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600, color: "var(--text-strong)", margin: "0 0 22px" }}>Session context</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 20 }}>
          <SessionRow label="Workspace"><span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-primary)" }}>acme-analytics</span></SessionRow>
          <SessionRow label="Role"><span style={{ fontSize: 15, textTransform: "capitalize", color: "var(--text-primary)" }}>{role}</span></SessionRow>
          <SessionRow label="Signed in as"><span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-muted)" }}>{role}@acme.com</span></SessionRow>
          <SessionRow label="Status"><Badge tone="ok">active</Badge></SessionRow>
        </div>
        <div style={{ marginTop: 24 }}><Divider /></div>
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "20px 0 0", maxWidth: "60ch" }}>
          Trust boundary: analytical data lives in Snowflake. The app stores only metadata, permissions, and a short-TTL result cache — you can always force a fresh run.
        </p>
      </Card>
    </Fragment>
  );
}

function Connections() {
  const [status, setStatus] = useState("active");
  const [testing, setTesting] = useState(false);
  const test = () => { setTesting(true); setStatus("pending_test"); setTimeout(() => { setStatus("active"); setTesting(false); }, 1100); };
  const badge = { active: "ok", pending_test: "warn", test_failed: "danger", not_configured: "idle" }[status];
  return (
    <Fragment>
      <PageHeader kicker="Administrative settings" title="Data connection"
        description="Configure connectivity metadata and deploy credentials. Secrets are stored write-only and never displayed after saving."
        actions={<Badge tone={badge}>{status.replace(/_/g, " ")}</Badge>} />
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 32, marginTop: 32, alignItems: "start" }} className="kit-cols">
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <Card padding="lg">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600, color: "var(--text-strong)", margin: 0 }}>Connection details</h2>
              <Badge tone="neutral" dot={false}>Admin</Badge>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <Field label="Display name"><Input defaultValue="Primary Snowflake" /></Field>
              <Field label="Warehouse"><Input defaultValue="COMPUTE_WH" /></Field>
              <Field label="Database"><Input defaultValue="ANALYTICS_DB" /></Field>
              <Field label="Schema" optional><Input defaultValue="PUBLIC" /></Field>
            </div>
            <div style={{ margin: "22px 0" }}><Divider /></div>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: "var(--text-strong)", margin: "0 0 4px" }}>Credentials</h3>
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 16px" }}>Leave blank to keep existing. Use a password or an encrypted private key (PEM), not both.</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <Field label="Account"><Input placeholder="acme.us-east-1" /></Field>
              <Field label="Role"><Input placeholder="SYSADMIN" /></Field>
              <div style={{ gridColumn: "1 / -1" }}><Field label="Password"><Input type="password" placeholder="Enter password" /></Field></div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 22 }}><Button variant="primary">Save connection</Button></div>
          </Card>

          <Card padding="lg">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, borderBottom: "1px solid var(--border-subtle)", paddingBottom: 18, marginBottom: 18 }}>
              <div>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600, color: "var(--text-strong)", margin: "0 0 4px" }}>Diagnostic test</h2>
                <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0, maxWidth: "44ch" }}>Runs a handshake against the warehouse. On success the connection becomes active.</p>
              </div>
              <Button variant="secondary" onClick={test} disabled={testing}>{testing ? "Testing…" : "Test connection"}</Button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <SessionRow label="Last tested"><span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-primary)" }}>Jul 06, 2026 14:20 UTC</span></SessionRow>
              <SessionRow label="Last successful"><span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-primary)" }}>Jul 06, 2026 14:20 UTC</span></SessionRow>
            </div>
          </Card>
        </div>

        <aside style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <Card padding="lg">
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600, color: "var(--text-strong)", margin: "0 0 16px" }}>Procedure</h2>
            <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 16 }}>
              {[["Step 1 · Save", "Enter metadata and initial credentials. Moves to pending test."],
                ["Step 2 · Test", "Run the diagnostic. A successful handshake activates the connection."],
                ["Step 3 · Rotate", "Replace credentials when needed. Rotation is gated by a successful test."]].map(([k, v]) => (
                <li key={k} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <Kicker>{k}</Kicker>
                  <span style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>{v}</span>
                </li>
              ))}
            </ol>
          </Card>
          <Alert tone="info" title="Security">Credentials are write-only. The API never returns secrets after they are saved.</Alert>
        </aside>
      </div>
    </Fragment>
  );
}

function Members() {
  const cols = [
    { key: "email", header: "Identity", render: (r) => (
      <div><div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>{r.email}</div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-faint)" }}>{r.id}…</div></div>
    ) },
    { key: "role", header: "Role", render: (r) => <span style={{ fontSize: 13, color: "var(--text-primary)" }}>{roleLabel(r.role)}</span> },
    { key: "status", header: "Status", render: (r) => <Badge tone={r.status === "active" ? "ok" : "idle"}>{r.status}</Badge> },
    { key: "joined", header: "Joined", mono: true, align: "right" },
    { key: "act", header: "", align: "right", render: () => <Button variant="ghost" size="sm">Remove</Button> },
  ];
  return (
    <Fragment>
      <PageHeader kicker="Workspace directory" title="Members" description="Manage access and roles for Acme Analytics."
        actions={<div style={{ display: "flex", gap: 28 }}>
          <Stat label="Admins" value="01" /><Stat label="Analysts" value="02" /><Stat label="Viewers" value="02" />
        </div>} />
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 32, marginTop: 32, alignItems: "start" }} className="kit-cols">
        <Card padding="lg">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600, color: "var(--text-strong)", margin: 0 }}>Invite member</h2>
            <Badge tone="neutral" dot={false}>Admin</Badge>
          </div>
          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 18px" }}>A temporary password is created and must be reset on first sign-in.</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <Field label="Email"><Input type="email" placeholder="you@company.com" /></Field>
            <Field label="Role"><Select options={[{ value: "viewer", label: "Viewer" }, { value: "analyst", label: "Analyst" }, { value: "admin", label: "Admin" }, { value: "external_client", label: "External client" }]} /></Field>
            <div style={{ gridColumn: "1 / -1" }}><Field label="Temporary password"><Input type="password" placeholder="Minimum 8 characters" /></Field></div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}><Button variant="primary">Invite member</Button></div>
        </Card>
        <Card padding="lg">
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600, color: "var(--text-strong)", margin: "0 0 14px" }}>Directory</h2>
          {[["Active members", "5"], ["Inactive", "1"], ["External partners", "1"]].map(([k, v], i) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: i < 2 ? "1px solid var(--border-subtle)" : "none" }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-muted)" }}>{k}</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-primary)" }}>{v}</span>
            </div>
          ))}
        </Card>
      </div>
      <section style={{ marginTop: 32 }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600, color: "var(--text-strong)", margin: "0 0 16px" }}>Roster</h2>
        <Card padding="md"><DataTable columns={cols} rows={MEMBERS} pageSize={5} getRowKey={(r) => r.id} /></Card>
      </section>
    </Fragment>
  );
}

function Collections() {
  return (
    <Fragment>
      <PageHeader kicker="Saved questions" title="Collections"
        description="Organize reusable questions into flat collections for Acme Analytics. Authors can create, rename, and delete empty collections." />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 32, marginTop: 32, alignItems: "start" }} className="kit-cols">
        <Card padding="md">
          <h2 style={{ fontSize: 13, fontWeight: 600, color: "var(--text-strong)", margin: "0 0 14px" }}>New collection</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Field label="Name"><Input placeholder="Revenue" /></Field>
            <Field label="Sort order"><Input type="number" defaultValue="0" /></Field>
            <Button variant="primary">Create collection</Button>
          </div>
        </Card>
        <div>
          <h2 style={{ fontSize: 13, fontWeight: 500, color: "var(--text-muted)", margin: "0 0 14px" }}>Active collections ({COLLECTIONS.length})</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {COLLECTIONS.map((c) => (
              <Card key={c.id} padding="md" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div><div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-strong)" }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Sort order {c.sort}</div></div>
                <div style={{ display: "flex", gap: 8 }}><Button variant="secondary" size="sm">Rename</Button><Button variant="ghost" size="sm">Delete</Button></div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </Fragment>
  );
}

function DashboardsList({ onOpen }) {
  return (
    <Fragment>
      <PageHeader kicker="Dashboard builder" title="Dashboards"
        description="Assemble governed KPI, chart, and table widgets from saved questions for Acme Analytics." />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 32, marginTop: 32, alignItems: "start" }} className="kit-cols">
        <Card padding="md">
          <h2 style={{ fontSize: 13, fontWeight: 600, color: "var(--text-strong)", margin: "0 0 14px" }}>New dashboard</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Field label="Collection"><Select options={COLLECTIONS.map((c) => ({ value: c.id, label: c.name }))} /></Field>
            <Field label="Title"><Input placeholder="Revenue Overview" /></Field>
            <Button variant="primary" leftIcon={<Icon name="plus" />}>Create dashboard</Button>
          </div>
        </Card>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 14, gap: 12 }}>
            <h2 style={{ fontSize: 13, fontWeight: 500, color: "var(--text-muted)", margin: 0 }}>Dashboards ({DASHBOARDS.length})</h2>
            <Select size="sm" options={["All collections", ...COLLECTIONS.map((c) => c.name)]} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {DASHBOARDS.map((d) => (
              <Card key={d.id} padding="md" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <div><button onClick={() => onOpen(d)} style={{ all: "unset", cursor: "pointer", fontSize: 15, fontWeight: 600, color: "var(--text-strong)" }}>{d.title}</button>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{d.collection} · updated {d.updated}</div></div>
                <div style={{ display: "flex", gap: 8 }}>
                  <Button variant="secondary" size="sm" onClick={() => onOpen(d)}>View</Button>
                  <Button variant="secondary" size="sm">Edit</Button>
                  <Button variant="ghost" size="sm">Delete</Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </Fragment>
  );
}

function DashboardView({ dashboard, onBack }) {
  const [range, setRange] = useState("Last 6 months");
  const [region, setRegion] = useState("All regions");
  const [loading, setLoading] = useState({});
  const [nonce, setNonce] = useState(0);

  // Changing a global filter auto-refreshes bound widgets (all but the overridden one).
  const refreshBound = () => {
    setLoading({ rev: true, kpi1: true, kpi2: true, line: true, table: true });
    setTimeout(() => setLoading({}), 750);
  };
  const onFilter = (setter) => (e) => { setter(e.target.value); refreshBound(); };
  const refreshOne = (key) => { setLoading((l) => ({ ...l, [key]: true })); setTimeout(() => setLoading((l) => ({ ...l, [key]: false })), 700); setNonce((n) => n + 1); };
  const st = (k) => (loading[k] ? "loading" : "ok");

  const tableCols = [
    { key: "region", header: "Region" }, { key: "segment", header: "Segment" },
    { key: "revenue", header: "Revenue", mono: true, align: "right", render: (r) => "$" + r.revenue },
    { key: "deals", header: "Deals", align: "right" },
  ];

  return (
    <Fragment>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, borderBottom: "1px solid var(--border-subtle)", paddingBottom: 20 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <Kicker>Dashboard</Kicker>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 600, letterSpacing: "-0.01em", color: "var(--text-strong)", margin: 0 }}>{dashboard.title}</h1>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button variant="secondary" leftIcon={<Icon name="arrowLeft" />} onClick={onBack}>Back to list</Button>
          <Button variant="primary">Edit</Button>
        </div>
      </header>

      {/* Global filter bar */}
      <Card padding="sm" style={{ marginTop: 20, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 14 }}>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-muted)" }}>Global filters</span>
        <Field htmlFor="f-range"><Select id="f-range" size="sm" value={range} onChange={onFilter(setRange)} options={["Last 6 months", "Last 12 months", "YTD", "Last 30 days"]} /></Field>
        <Field htmlFor="f-region"><Select id="f-region" size="sm" value={region} onChange={onFilter(setRegion)} options={["All regions", "NA", "EMEA", "APAC", "LATAM"]} /></Field>
        <span style={{ fontSize: 12, color: "var(--text-faint)" }}>Bound widgets refresh immediately.</span>
        <div style={{ marginLeft: "auto" }}><Button variant="secondary" size="sm" leftIcon={<Icon name="download" />}>Export CSV</Button></div>
      </Card>

      {/* Widget grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gridAutoRows: "minmax(120px, auto)", gap: 12, marginTop: 16 }} className="kit-wgrid">
        <Widget title="Total revenue" state={st("kpi1")} kpi="$23.8M" onRefresh={() => refreshOne("kpi1")} footer={<Fragment><span>Cache hit</span><span>10m TTL</span></Fragment>} />
        <Widget title="Active deals" state={st("kpi2")} kpi="1,284" onRefresh={() => refreshOne("kpi2")} footer={<span>Fresh</span>} />
        <div style={{ gridColumn: "span 2", gridRow: "span 2" }}>
          <Widget title="Revenue by month" state={st("rev")} onRefresh={() => refreshOne("rev")} minHeight={252} footer={<Fragment><span>Fresh</span><span>7 rows</span></Fragment>}>
            <BarChart data={REVENUE} height={190} />
          </Widget>
        </div>
        <div style={{ gridColumn: "span 2" }}>
          <Widget title="Revenue by region" override state={st("line")} onRefresh={() => refreshOne("line")} minHeight={120} footer={<span>Overridden: EMEA</span>}>
            <LineChart data={REGIONS} height={92} />
          </Widget>
        </div>
        <div style={{ gridColumn: "span 4" }}>
          <Widget title="Revenue detail" state={st("table")} onRefresh={() => refreshOne("table")} footer={<Fragment><span>Cache miss</span><span>23 of 23 rows</span><span>2m TTL</span></Fragment>}>
            <DataTable key={nonce} columns={tableCols} rows={RESULT_ROWS} pageSize={6} getRowKey={(r, i) => i} />
          </Widget>
        </div>
      </div>
    </Fragment>
  );
}

function Questions() {
  const [ran, setRan] = useState(false);
  const [running, setRunning] = useState(false);
  const run = () => { setRunning(true); setTimeout(() => { setRunning(false); setRan(true); }, 800); };
  const cols = [
    { key: "region", header: "Region" }, { key: "segment", header: "Segment" },
    { key: "revenue", header: "Revenue", mono: true, align: "right", render: (r) => "$" + r.revenue },
    { key: "deals", header: "Deals", align: "right" },
  ];
  return (
    <Fragment>
      <PageHeader kicker="Saved questions" title="Revenue by region"
        description="Governed SQL with declared scalar parameters. Run against the workspace's active Snowflake connection." />
      <Card padding="lg" style={{ marginTop: 32 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <Field label="Collection"><Select options={COLLECTIONS.map((c) => c.name)} /></Field>
          <Field label="Title"><Input defaultValue="Revenue by region" /></Field>
        </div>
        <div style={{ marginTop: 20 }}>
          <Field label="SQL">
            <Textarea mono rows={4} defaultValue={"SELECT region, segment, revenue, deals\nFROM analytics.revenue\nWHERE period >= :start_date AND region = :region\nORDER BY revenue DESC"} />
          </Field>
        </div>
        <div style={{ margin: "22px 0" }}><Divider /></div>
        <Kicker>Run question</Kicker>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 12 }}>
          <Field label="start_date" hint="date · required"><Input type="date" defaultValue="2026-01-01" /></Field>
          <Field label="region" hint="string"><Input defaultValue="NA" /></Field>
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
          <Button variant="primary" onClick={run} disabled={running}>{running ? "Running…" : "Execute"}</Button>
          <Button variant="secondary" onClick={run} disabled={running}>Force fresh</Button>
          <Button variant="ghost" leftIcon={<Icon name="download" />}>Export CSV</Button>
        </div>
      </Card>

      {running ? (
        <Card padding="md" style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
          <Skeleton width="30%" height={12} /><Skeleton width="90%" height={12} /><Skeleton width="80%" height={12} />
        </Card>
      ) : ran ? (
        <Card padding="md" style={{ marginTop: 20 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-faint)", marginBottom: 12 }}>
            <span>Status: ok</span><span>412 ms</span><span>23 rows</span><span>Cache: miss</span>
          </div>
          <DataTable columns={cols} rows={RESULT_ROWS} pageSize={6} getRowKey={(r, i) => i} />
        </Card>
      ) : null}
    </Fragment>
  );
}

/* ================= shell / router ================= */
const NAV = [
  ["home", "Home"], ["members", "Members"], ["connections", "Connections"],
  ["collections", "Collections"], ["questions", "Questions"], ["dashboards", "Dashboards"],
];

function App() {
  const [signedIn, setSignedIn] = useState(false);
  const [screen, setScreen] = useState("home");
  const [openDash, setOpenDash] = useState(null);
  const role = "analyst";

  if (!signedIn) return <SignIn onSignIn={() => { setSignedIn(true); setScreen("home"); }} />;

  const go = (s) => { setScreen(s); setOpenDash(null); };
  let content;
  if (screen === "home") content = <Home role={role} />;
  else if (screen === "connections") content = <Connections />;
  else if (screen === "members") content = <Members />;
  else if (screen === "collections") content = <Collections />;
  else if (screen === "questions") content = <Questions />;
  else if (screen === "dashboards") content = openDash
    ? <DashboardView dashboard={openDash} onBack={() => setOpenDash(null)} />
    : <DashboardsList onOpen={(d) => setOpenDash(d)} />;

  return (
    <Fragment>
      <TopNav
        items={NAV.map(([k, label]) => ({ label, href: "#", active: screen === k, onClick: (e) => { e.preventDefault(); go(k); } }))}
        actions={<Fragment><ThemeToggle /><Button variant="secondary" size="sm" onClick={() => setSignedIn(false)}>Sign out</Button></Fragment>}
      />
      <main style={{ maxWidth: "var(--container-max)", margin: "0 auto", padding: "40px 32px 64px" }}>{content}</main>
    </Fragment>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
