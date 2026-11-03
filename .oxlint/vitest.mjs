/**
 * Local oxlint plugin with rules for Vitest test files.
 */

// Must match ISOLATED_MARKER and the header length checked in vitest.config.mts.
const ISOLATED_MARKER = "@vitest-isolate true";
const HEADER_LENGTH = 512;

const MODULE_METHODS = new Set(["mock", "doMock", "resetModules"]);

/** Returns true if the file runs in the server Vitest projects. */
function isServerTestFile(filename) {
  return /(^|\/)(server|plugins)\/.*\.test\.tsx?$/.test(
    filename.replace(/\\/g, "/")
  );
}

/** Returns the method name if the callee is `vi.<method>`, else null. */
function viMethodName(callee) {
  if (
    callee.type !== "MemberExpression" ||
    callee.computed ||
    callee.object.type !== "Identifier" ||
    callee.object.name !== "vi" ||
    callee.property.type !== "Identifier"
  ) {
    return null;
  }
  return callee.property.name;
}

const plugin = {
  meta: {
    name: "vitest-local",
  },
  rules: {
    "require-isolate-directive": {
      meta: {
        type: "problem",
        docs: {
          description:
            "Require the `// @vitest-isolate true` header in server test files that mock or reset modules. Server tests share a module registry between files, so a mock leaks into other files.",
        },
        messages: {
          missing:
            "`vi.{{method}}` changes the module registry that server test files share. Add `// @vitest-isolate true` as the first line of this file so it runs isolated.",
        },
      },
      create(context) {
        if (!isServerTestFile(context.filename)) {
          return {};
        }

        const header = context.sourceCode.text.slice(0, HEADER_LENGTH);
        if (header.includes(ISOLATED_MARKER)) {
          return {};
        }

        return {
          CallExpression(node) {
            const method = viMethodName(node.callee);
            if (method && MODULE_METHODS.has(method)) {
              context.report({
                node: node.callee,
                messageId: "missing",
                data: { method },
              });
            }
          },
        };
      },
    },
  },
};

export default plugin;
