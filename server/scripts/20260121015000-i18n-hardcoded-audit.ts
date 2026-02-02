import { readdirSync, readFileSync, statSync } from "fs";
import path from "path";

type Finding = {
  file: string;
  line: number;
  match: string;
};

const ROOT = path.join(__dirname, "../..");
const TARGET_DIRS = ["app", "shared"];
const IGNORE_DIRS = ["shared/i18n/locales", "node_modules"];
const EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);

function isIgnored(filePath: string) {
  return IGNORE_DIRS.some((segment) => filePath.includes(segment));
}

function walk(dir: string, files: string[] = []) {
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    if (isIgnored(fullPath)) {
      continue;
    }
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      walk(fullPath, files);
    } else if (stats.isFile()) {
      const ext = path.extname(fullPath);
      if (EXTENSIONS.has(ext) && !fullPath.endsWith(".d.ts")) {
        files.push(fullPath);
      }
    }
  }
  return files;
}

function lineNumberForIndex(text: string, index: number) {
  return text.slice(0, index).split("\n").length;
}

function findTextNodes(text: string) {
  const results: Finding[] = [];
  const regex =
    />([^<>{}][^<]*[A-Za-zА-Яа-яӘәҚқҢңӨөҰұҮүІі][^<]*)</g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const raw = match[1].trim();
    if (!raw) {
      continue;
    }
    results.push({
      file: "",
      line: lineNumberForIndex(text, match.index),
      match: raw.slice(0, 120),
    });
  }
  return results;
}

function findLiteralProps(text: string) {
  const results: Finding[] = [];
  const regex =
    /(label|placeholder|title|description|textTitle|aria-label|ariaLabel|help|empty|subtitle|caption)\s*=\s*"([^"]+)"/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const raw = match[2].trim();
    if (!raw) {
      continue;
    }
    results.push({
      file: "",
      line: lineNumberForIndex(text, match.index),
      match: `${match[1]}="${raw.slice(0, 120)}"`,
    });
  }
  return results;
}

export default function main() {
  const files = TARGET_DIRS.flatMap((dir) => walk(path.join(ROOT, dir)));
  const findings: Finding[] = [];

  for (const file of files) {
    const content = readFileSync(file, "utf8");
    const textNodes = findTextNodes(content).map((f) => ({
      ...f,
      file,
    }));
    const props = findLiteralProps(content).map((f) => ({
      ...f,
      file,
    }));
    findings.push(...textNodes, ...props);
  }

  console.log(JSON.stringify({ count: findings.length, findings }, null, 2));
}

if (process.env.NODE_ENV !== "test") {
  main();
}
