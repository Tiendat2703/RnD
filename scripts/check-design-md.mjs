#!/usr/bin/env node
// Gate for DESIGN.md: the frontmatter must stay valid YAML-shaped and every
// {group.key} reference in prose or frontmatter must point at a real token.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const file = resolve(import.meta.dirname ?? ".", "..", process.argv[2] ?? "DESIGN.md");
const src = readFileSync(file, "utf8");

const problems = [];
const fmMatch = src.match(/^---\r?\n([\s\S]*?)\r?\n---/);
if (!fmMatch) {
  console.error("FAIL: no YAML frontmatter block found");
  process.exit(1);
}
const fm = fmMatch[1].split(/\r?\n/);

// --- structural check on the frontmatter subset we actually use ---
const defined = new Map(); // "colors.primary" -> true
let currentGroup = null;
let currentComponent = null;
fm.forEach((line, i) => {
  const no = i + 1;
  if (line.includes("\t")) problems.push(`frontmatter L${no}: tab character`);
  if (/^\s*#/.test(line)) return;
  if (!line.trim()) return;
  const indent = line.length - line.trimStart().length;
  const m = line.match(/^(\s*)([A-Za-z0-9_.-]+):\s*(.*)$/);
  if (!m) {
    problems.push(`frontmatter L${no}: not a "key: value" line -> ${line.slice(0, 60)}`);
    return;
  }
  const [, , key, value] = m;
  if (indent === 0) {
    currentGroup = key;
    currentComponent = null;
    if (value !== "") defined.set(key, true);
    return;
  }
  if (indent % 2 !== 0 || indent > 4) {
    problems.push(`frontmatter L${no}: unexpected indent ${indent}`);
  }
  if (indent === 2) {
    defined.set(`${currentGroup}.${key}`, true);
    if (currentGroup === "components") {
      if (value !== "") problems.push(`frontmatter L${no}: component "${key}" must be a token map, not a scalar`);
      currentComponent = key;
    }
    return;
  }
  if (indent === 4 && currentGroup === "components") {
    if (!/^(backgroundColor|textColor|typography|rounded|padding|size|height|width)$/.test(key)) {
      problems.push(`frontmatter L${no}: "${key}" is not an official component sub-token`);
    }
    return;
  }
});

// --- reference check: every {group.key} must resolve ---
const refs = new Set();
for (const m of src.matchAll(/\{(colors|typography|rounded|spacing|components)\.([A-Za-z0-9_.-]+)\}/g)) {
  refs.add(`${m[1]}.${m[2]}`);
}
// typography levels address children like {typography.body-md.fontSize} too
for (const ref of refs) {
  const parts = ref.split(".");
  const group = parts[0];
  if (group === "components" || group === "colors" || group === "rounded" || group === "spacing") {
    if (!defined.has(ref)) problems.push(`orphan reference {${ref}}`);
    continue;
  }
  if (parts.length > 2) {
    // a path below a level: check the level itself exists
    if (!defined.has(`${parts[0]}.${parts[1]}`)) problems.push(`orphan reference {${parts[0]}.${parts[1]}}`);
  } else if (!defined.has(ref)) {
    problems.push(`orphan reference {${ref}}`);
  }
}

// --- required sections ---
const REQUIRED = ["Overview", "Colors", "Typography", "Layout", "Elevation", "Shapes", "Components", "Do", "Responsive Behavior", "Known Gaps"];
const headings = src.match(/^## .+$/gm)?.map((h) => h.replace(/^## /, "")) ?? [];
for (const r of REQUIRED) {
  if (!headings.some((h) => h.toLowerCase().startsWith(r.toLowerCase()))) problems.push(`missing "## ${r}" section`);
}

// --- schema groups ---
for (const g of ["version", "name", "description", "colors", "typography", "rounded", "spacing", "components"]) {
  if (!fm.some((l) => new RegExp(`^${g}:`).test(l))) problems.push(`frontmatter missing top-level "${g}"`);
}

console.log(`DESIGN.md: ${src.split(/\r?\n/).length} lines, ${defined.size} tokens defined, ${refs.size} distinct references`);
console.log(`  colors ${[...defined.keys()].filter((k) => k.startsWith("colors.")).length}`);
console.log(`  typography ${[...defined.keys()].filter((k) => k.startsWith("typography.")).length}`);
console.log(`  components ${[...defined.keys()].filter((k) => k.startsWith("components.")).length}`);
if (problems.length) {
  console.error(`\nFAIL (${problems.length})`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log("\nOK: frontmatter parses, no orphan token references, all required sections present");
