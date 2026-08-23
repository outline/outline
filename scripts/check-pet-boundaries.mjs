import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const forbiddenImportPrefixes = [
  "apps/web/src/",
  "@pet-store-app/ui",
  "@pet-store-app/web",
  "packages/@pet-store-app/ui",
];

/**
 * Finds imports that would couple the Outline frontend to Pet Store frontend
 * implementation details or to the unused duplicate UI package.
 *
 * @param {readonly string[]} files root app files to inspect.
 * @param {ReadonlyMap<string, string>} contents file contents keyed by path.
 * @returns {string[]} sorted boundary violations.
 */
export function findPetBoundaryViolations(files, contents) {
  const violations = [];

  for (const file of files) {
    const source = contents.get(file) ?? "";
    const lines = source.split("\n");

    lines.forEach((line, index) => {
      const importMatch = line.match(/(?:from\s+|import\s*\()(['"])([^'"]+)\1/);
      const importPath = importMatch?.[2];
      if (!importPath) {
        return;
      }

      const forbiddenPrefix = forbiddenImportPrefixes.find((prefix) =>
        importPath.startsWith(prefix),
      );
      if (forbiddenPrefix) {
        violations.push(`${file}:${index + 1}: ${importPath}`);
      }
    });
  }

  return violations.sort();
}

function scanRootApp() {
  const files = execFileSync("rg", ["--files", "app"], {
    encoding: "utf8",
  })
    .trim()
    .split("\n")
    .filter(Boolean);
  const contents = new Map(
    files.map((file) => [file, readFileSync(file, "utf8")]),
  );
  return findPetBoundaryViolations(files, contents);
}

if (process.argv[1]?.endsWith("check-pet-boundaries.mjs")) {
  const violations = scanRootApp();
  if (violations.length > 0) {
    console.error(violations.join("\n"));
    process.exitCode = 1;
  } else {
    console.log(`Pet Store boundary check passed (${contentsCount()} files)`);
  }
}

function contentsCount() {
  return execFileSync("rg", ["--files", "app"], {
    encoding: "utf8",
  })
    .trim()
    .split("\n")
    .filter(Boolean).length;
}
