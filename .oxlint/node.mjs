/**
 * Local oxlint plugin with rules for Node.js built-in modules.
 */

const urlModules = new Set(["url", "node:url"]);

/** Returns true if the member expression accesses the given property name. */
function isProperty(node, name) {
  if (node.type !== "MemberExpression") {
    return false;
  }

  if (!node.computed) {
    return node.property.type === "Identifier" && node.property.name === name;
  }

  return node.property.type === "Literal" && node.property.value === name;
}

/** Returns the name of an import specifier's imported binding. */
function importedName(specifier) {
  return specifier.imported.type === "Identifier"
    ? specifier.imported.name
    : specifier.imported.value;
}

const plugin = {
  meta: {
    name: "node-local",
  },
  rules: {
    "no-url-parse": {
      meta: {
        type: "problem",
        docs: {
          description:
            "Disallow the legacy `url.parse()`, which is deprecated (DEP0169).",
        },
        messages: {
          forbidden:
            "`url.parse()` is deprecated and not standardized. Use the WHATWG `URL` API instead.",
        },
      },
      create(context) {
        const moduleNames = new Set();

        return {
          ImportDeclaration(node) {
            if (!urlModules.has(node.source.value)) {
              return;
            }

            for (const specifier of node.specifiers) {
              if (specifier.type === "ImportSpecifier") {
                if (importedName(specifier) === "parse") {
                  context.report({ node: specifier, messageId: "forbidden" });
                }
                continue;
              }
              moduleNames.add(specifier.local.name);
            }
          },
          MemberExpression(node) {
            if (
              node.object.type === "Identifier" &&
              moduleNames.has(node.object.name) &&
              isProperty(node, "parse")
            ) {
              context.report({ node, messageId: "forbidden" });
            }
          },
        };
      },
    },
  },
};

export default plugin;
