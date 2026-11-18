/**
 * Local oxlint plugin with ProseMirror editor-specific rules.
 */

/** Files that contain editor schema code. */
const EDITOR_FILE =
  /(^|[\\/])(shared[\\/]editor|plugins[\\/][^\\/]+[\\/]shared)[\\/]/;

/** Module that exports the url sanitizers, matched by any alias or relative path. */
const SANITIZER_SOURCE = /(^|\/)utils\/urls$/;

/** Exported names that sanitize a url for use in the DOM. */
const SANITIZER_NAMES = new Set(["sanitizeUrl", "sanitizeImageSrc"]);

/** Attributes that the browser can follow or load as a url. */
const URL_ATTRIBUTES = new Set(["href", "src"]);

/** Returns the static name of a property key, or null if it is computed. */
function keyName(node, computed) {
  if (!computed && node.type === "Identifier") {
    return node.name;
  }
  if (node.type === "Literal" && typeof node.value === "string") {
    return node.value;
  }
  return null;
}

/** Returns true if the function is a `toDOM` method or `toDOM:` property. */
function isToDOMFunction(node) {
  const parent = node.parent;
  if (!parent || parent.value !== node) {
    return false;
  }
  if (parent.type !== "Property" && parent.type !== "MethodDefinition") {
    return false;
  }
  return keyName(parent.key, parent.computed) === "toDOM";
}

/** Returns true if the node is inside the body of a `toDOM` function. */
function isInsideToDOM(node) {
  for (let current = node.parent; current; current = current.parent) {
    if (
      (current.type === "FunctionExpression" ||
        current.type === "ArrowFunctionExpression") &&
      isToDOMFunction(current)
    ) {
      return true;
    }
  }
  return false;
}

/** Returns the variable that the identifier refers to, or null if it is not declared. */
function resolveVariable(scope, identifier) {
  for (let current = scope; current; current = current.upper) {
    const variable = current.set.get(identifier.name);
    if (variable) {
      return variable;
    }
  }
  return null;
}

/**
 * Returns true if the value cannot carry an unsafe url: a constant, an empty
 * value, a direct sanitizer call, or a choice between such values.
 */
function isSafeValue(node, isSanitizer) {
  switch (node.type) {
    case "Literal":
      return typeof node.value === "string" || node.value === null;
    case "TemplateLiteral":
      return node.expressions.length === 0;
    case "Identifier":
      return node.name === "undefined";
    case "CallExpression":
      return node.callee.type === "Identifier" && isSanitizer(node.callee);
    case "ConditionalExpression":
      return (
        isSafeValue(node.consequent, isSanitizer) &&
        isSafeValue(node.alternate, isSanitizer)
      );
    case "LogicalExpression":
      return (
        isSafeValue(node.left, isSanitizer) &&
        isSafeValue(node.right, isSanitizer)
      );
    default:
      return false;
  }
}

const plugin = {
  meta: {
    name: "editor",
  },
  rules: {
    "sanitize-url-in-to-dom": {
      meta: {
        type: "problem",
        docs: {
          description:
            "Require `sanitizeUrl()` for `href` and `src` values in ProseMirror `toDOM` methods, which write raw DOM attributes.",
        },
        messages: {
          unsanitized:
            "Wrap the `{{name}}` value in `sanitizeUrl()` or `sanitizeImageSrc()` from `utils/urls`. `toDOM` writes raw DOM attributes, so a `javascript:` url in a node or mark attribute can run.",
        },
      },
      create(context) {
        if (!EDITOR_FILE.test(context.filename)) {
          return {};
        }

        const sanitizerImports = new Set();

        // Resolve by binding so a local function that shadows the import is not trusted.
        const isSanitizer = (identifier) => {
          const variable = resolveVariable(
            context.sourceCode.getScope(identifier),
            identifier
          );
          return (
            !!variable &&
            variable.defs.some((def) => sanitizerImports.has(def.node))
          );
        };

        const check = (node, name, value) => {
          if (!isSafeValue(value, isSanitizer)) {
            context.report({
              node,
              messageId: "unsanitized",
              data: { name },
            });
          }
        };

        return {
          ImportDeclaration(node) {
            if (!SANITIZER_SOURCE.test(node.source.value)) {
              return;
            }
            for (const specifier of node.specifiers) {
              if (
                specifier.type === "ImportSpecifier" &&
                SANITIZER_NAMES.has(keyName(specifier.imported, false))
              ) {
                sanitizerImports.add(specifier);
              }
            }
          },
          Property(node) {
            const name = keyName(node.key, node.computed);
            if (
              !URL_ATTRIBUTES.has(name) ||
              node.parent.type !== "ObjectExpression" ||
              !isInsideToDOM(node)
            ) {
              return;
            }
            check(node, name, node.value);
          },
          CallExpression(node) {
            const callee = node.callee;
            if (
              callee.type !== "MemberExpression" ||
              keyName(callee.property, callee.computed) !== "setAttribute" ||
              node.arguments.length < 2
            ) {
              return;
            }
            const name = keyName(node.arguments[0], true);
            if (!URL_ATTRIBUTES.has(name) || !isInsideToDOM(node)) {
              return;
            }
            check(node, name, node.arguments[1]);
          },
          AssignmentExpression(node) {
            const left = node.left;
            if (left.type !== "MemberExpression") {
              return;
            }
            const name = keyName(left.property, left.computed);
            if (!URL_ATTRIBUTES.has(name) || !isInsideToDOM(node)) {
              return;
            }
            check(node, name, node.right);
          },
        };
      },
    },
  },
};

export default plugin;
