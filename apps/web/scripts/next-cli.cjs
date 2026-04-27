/**
 * Run the Next.js CLI from this package without relying on hoisted root
 * node_modules or a broken pnpm symlink to `next`.
 */
const path = require("path");
const { spawnSync } = require("child_process");

const pkgRoot = path.join(__dirname, "..");
const nextBin = require.resolve("next/dist/bin/next", { paths: [pkgRoot] });
const args = process.argv.slice(2);
const result = spawnSync(process.execPath, [nextBin, ...args], {
  stdio: "inherit",
  cwd: pkgRoot,
  env: process.env,
});
process.exit(result.status === null ? 1 : result.status);
