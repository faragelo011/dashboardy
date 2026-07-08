/**
 * Run the Next.js CLI from this package without relying on hoisted root
 * node_modules or a broken pnpm symlink to `next`.
 */
const path = require("path");
const { spawnSync } = require("child_process");

const pkgRoot = path.join(__dirname, "..");
// In dev Docker we sometimes bind-mount source into `/repo/apps/web` while
// keeping dependencies installed at the repo root (`/repo/node_modules`).
// Next's CLI resolution must therefore consider both locations.
const repoRoot = path.join(pkgRoot, "..", "..");
const nextBin = require.resolve("next/dist/bin/next", { paths: [pkgRoot, repoRoot] });
const args = process.argv.slice(2);
const result = spawnSync(process.execPath, [nextBin, ...args], {
  stdio: "inherit",
  cwd: pkgRoot,
  env: process.env,
});
process.exit(result.status === null ? 1 : result.status);
