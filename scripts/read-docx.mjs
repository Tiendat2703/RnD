// Read-only: dump the project .docx as plain text, one line per paragraph.
// Usage: node scripts/read-docx.mjs "<path to .docx>" [grep phrase]
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";

const file = process.argv[2];
const needle = process.argv[3];
if (!file) {
  console.error("usage: node scripts/read-docx.mjs <docx> [grep]");
  process.exit(1);
}

const dir = mkdtempSync(path.join(tmpdir(), "docx-"));
execFileSync("unzip", ["-o", "-j", file, "word/document.xml", "-d", dir]);
const xml = readFileSync(path.join(dir, "document.xml"), "utf8");

const paras = xml
  .split("</w:p>")
  .map((p) =>
    p
      .replace(/<w:tab[^>]*\/>/g, "\t")
      .replace(/<w:br[^>]*\/>/g, " ")
      .replace(/<[^>]+>/g, "")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, " ")
      .trim()
  )
  .filter(Boolean);

const out = paras.map((t, i) => `${i}\t${t}`).join("\n");
if (needle) {
  const re = new RegExp(needle, "i");
  console.log(paras.filter((t) => re.test(t)).join("\n---\n"));
} else {
  writeFileSync(".run/docx/text.txt", out, "utf8");
  console.log(`${paras.length} paragraphs -> .run/docx/text.txt`);
}
