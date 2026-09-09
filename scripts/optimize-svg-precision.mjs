#!/usr/bin/env node
/**
 * Rounds the coordinate precision of SVG assets.
 *
 * The category avatars are auto-traced icons drawn on a 48×48 viewBox whose
 * path data carries 4–5 decimal places per coordinate (a single shirt icon was
 * 183 KB / ~70 KB gzipped). At the ~80 px the storefront renders them, anything
 * past two decimals is 1/100 of a viewBox unit — far below one device pixel —
 * so the extra digits are pure transfer and parse cost on mobile.
 *
 * Usage:
 *   node scripts/optimize-svg-precision.mjs [dir=uploads/avatars/categories] [decimals=2]
 *   node scripts/optimize-svg-precision.mjs --dry-run
 *
 * Run it again after uploading new category avatars.
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const args = process.argv.slice(2).filter((a) => a !== "--dry-run");
const dryRun = process.argv.includes("--dry-run");
const dir = resolve(args[0] ?? "uploads/avatars/categories");
const decimals = Number(args[1] ?? 2);

/** Round every decimal literal; integers, hex colours and ids are untouched. */
function roundPrecision(svg, places) {
  return svg.replace(/-?\d+\.\d+/g, (match) => {
    const rounded = Number.parseFloat(match).toFixed(places);
    const trimmed = rounded.replace(/\.?0+$/, "");
    return trimmed === "" || trimmed === "-" || trimmed === "-0" ? "0" : trimmed;
  });
}

const files = (await readdir(dir)).filter((name) => name.endsWith(".svg"));
let before = 0;
let after = 0;

for (const name of files.sort()) {
  const path = join(dir, name);
  const original = await readFile(path, "utf8");
  const optimized = roundPrecision(original, decimals);
  before += Buffer.byteLength(original);
  after += Buffer.byteLength(optimized);

  if (optimized !== original && !dryRun) {
    await writeFile(path, optimized);
  }
}

const kb = (bytes) => (bytes / 1024).toFixed(0).padStart(5);
console.log(`${files.length} files in ${dir}`);
console.log(`before ${kb(before)} KB   after ${kb(after)} KB   (-${(100 - (after / before) * 100).toFixed(0)}%)`);
if (dryRun) console.log("dry run – nothing written");
