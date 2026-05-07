import fs from "node:fs";
import path from "node:path";

function requireString(value, keyPath) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Expected non-empty string at ${keyPath}`);
  }
  return value.trim();
}

function parseOklchTriplet(oklchString, keyPath) {
  const raw = requireString(oklchString, keyPath);
  const match = raw.match(/^oklch\(\s*([^)]+?)\s*\)$/i);
  if (!match) {
    throw new Error(`Expected OKLCH like "oklch(L C H)" at ${keyPath}, got: ${raw}`);
  }
  const inner = match[1].replace(/\s+/g, " ").trim();
  const parts = inner.split(" ");
  if (parts.length !== 3) {
    throw new Error(`Expected 3 OKLCH parts at ${keyPath}, got: ${inner}`);
  }
  const [l, c, h] = parts;
  return `${l} ${c} ${h}`;
}

function extractFrontmatter(text) {
  const normalized = text.replace(/\r\n/g, "\n");
  const start = normalized.indexOf("---\n");
  if (start !== 0) {
    throw new Error("DESIGN.md must start with YAML frontmatter (---)");
  }
  const end = normalized.indexOf("\n---", 4);
  if (end === -1) {
    throw new Error("DESIGN.md frontmatter is missing closing ---");
  }
  return normalized.slice(4, end + 1);
}

function extractColorsMapFromFrontmatter(frontmatter) {
  const lines = frontmatter.split("\n");
  const colorsStart = lines.findIndex((l) => l.trim() === "colors:");
  if (colorsStart === -1) {
    throw new Error("DESIGN.md frontmatter missing `colors:` block");
  }

  const colors = new Map();
  for (let i = colorsStart + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line) continue;

    // stop when indentation returns to 0 (next top-level key)
    if (/^[a-zA-Z0-9_-]+:/.test(line)) break;

    // Expect two-space indent: "  token-name: \"oklch(...)\""
    const m = line.match(/^\s{2}([a-zA-Z0-9_-]+):\s*"(.*)"\s*$/);
    if (!m) continue;
    const [, name, value] = m;
    colors.set(name, value);
  }

  if (colors.size === 0) {
    throw new Error("DESIGN.md frontmatter `colors:` block is empty or unparseable");
  }

  return colors;
}

function formatCssVarBlock(vars) {
  const lines = [];
  lines.push(":root {");
  for (const [name, triplet] of vars) {
    lines.push(`    --${name}: ${triplet};`);
  }
  lines.push("  }");
  return lines.join("\n");
}

function replaceBetweenMarkers(css, newBlock) {
  const start = "/* DESIGN_TOKENS_START (generated from DESIGN.md) */";
  const end = "/* DESIGN_TOKENS_END */";
  const startIdx = css.indexOf(start);
  const endIdx = css.indexOf(end);
  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
    throw new Error(
      "Could not find DESIGN_TOKENS_START/END markers in apps/web/app/globals.css",
    );
  }
  const before = css.slice(0, startIdx + start.length);
  const after = css.slice(endIdx);
  return `${before}\n  ${newBlock}\n  ${after}`;
}

const repoRoot = path.resolve(process.cwd(), "../..");
const designMdPath = path.join(repoRoot, "DESIGN.md");
const globalsCssPath = path.join(process.cwd(), "app", "globals.css");

const designMd = fs.readFileSync(designMdPath, "utf8");
const frontmatter = extractFrontmatter(designMd);
const colorsMap = extractColorsMapFromFrontmatter(frontmatter);

// Canonical token mapping. Add here if you add new tokens to DESIGN.md.
const tokenNames = [
  "ink-strong",
  "ink",
  "ink-muted",
  "ink-faint",
  "surface-app",
  "surface-0",
  "surface-1",
  "surface-2",
  "surface-3",
  "surface-4",
  "surface-5",
  "border-0",
  "border-1",
  "border-2",
  "border-3",
  "border-4",
  "accent",
  "accent-hover",
  "accent-active",
  "accent-soft",
  "accent-soft-ink",
  "focus",
  "focus-ring",
  "success-soft",
  "success-soft-ink",
  "danger-border",
  "danger-soft",
  "danger-soft-strong",
  "danger-ink",
  "danger-ink-strong",
];

const vars = tokenNames.map((name) => {
  const value = colorsMap.get(name);
  if (!value) {
    throw new Error(`DESIGN.md is missing colors.${name} in frontmatter`);
  }
  return [name, parseOklchTriplet(value, `colors.${name}`)];
});

const globalsCss = fs.readFileSync(globalsCssPath, "utf8");
const newBlock = formatCssVarBlock(vars);
const updated = replaceBetweenMarkers(globalsCss, newBlock);

fs.writeFileSync(globalsCssPath, updated);
process.stdout.write(`Synced ${vars.length} tokens into ${globalsCssPath}\n`);

