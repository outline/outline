/**
 * Local oxlint plugin with React Router rules.
 */

const routerPackages = new Set(["react-router", "react-router-dom"]);

/** Hooks whose callback runs later, outside of render. */
const deferredHooks = new Set(["useCallback"]);

/** Returns true if the node is a function. */
function isFunction(node) {
  return (
    node.type === "ArrowFunctionExpression" ||
    node.type === "FunctionExpression" ||
    node.type === "FunctionDeclaration"
  );
}

/** Returns the hook name if the node is a call to `useX(…)` or `React.useX(…)`. */
function hookName(node) {
  if (node?.type !== "CallExpression") {
    return null;
  }

  const callee = node.callee;
  if (callee.type === "Identifier") {
    return callee.name;
  }

  if (callee.type === "MemberExpression" && !callee.computed) {
    return callee.property.name;
  }

  return null;
}

/** Returns true if the identifier is a reference rather than a property name. */
function isReference(node, parent) {
  if (parent.type === "MemberExpression" && parent.property === node) {
    return parent.computed;
  }

  if (
    (parent.type === "Property" || parent.type === "MethodDefinition") &&
    parent.key === node
  ) {
    return parent.computed || parent.value === node;
  }

  return true;
}

/**
 * Returns true if the function is known to run later, outside of render: a
 * JSX event handler such as `onClick`, or a `useCallback` callback.
 */
function isDeferredFunction(node, parent, grandparent) {
  if (parent.type === "JSXExpressionContainer" && parent.expression === node) {
    return (
      grandparent?.type === "JSXAttribute" &&
      grandparent.name.type === "JSXIdentifier" &&
      /^on[A-Z]/.test(grandparent.name.name)
    );
  }

  return deferredHooks.has(hookName(parent)) && parent.arguments[0] === node;
}

/**
 * Classifies a reference by where it is read: "deferred" when it is read in a
 * function known to run later, null when it does not read the value (a
 * `useCallback` dependency array), and "render" otherwise.
 */
function classify(ancestors, owner) {
  const start = ancestors.indexOf(owner);

  for (let i = start + 1; i < ancestors.length; i++) {
    const node = ancestors[i];
    const parent = ancestors[i - 1];

    if (isFunction(node)) {
      return isDeferredFunction(node, parent, ancestors[i - 2])
        ? "deferred"
        : "render";
    }

    if (
      node.type === "ArrayExpression" &&
      deferredHooks.has(hookName(parent)) &&
      parent.arguments[1] === node
    ) {
      return null;
    }
  }

  return "render";
}

const plugin = {
  meta: {
    name: "react-router",
  },
  rules: {
    "no-deferred-use-location": {
      meta: {
        type: "problem",
        docs: {
          description:
            "Disallow `useLocation` when the location is only read in callbacks.",
        },
        messages: {
          forbidden:
            "The location is only read in callbacks, but `useLocation` re-renders this component on every navigation. Read `history.location` in the callback instead.",
        },
      },
      create(context) {
        const useLocationNames = new Set();
        const tracked = [];

        return {
          ImportDeclaration(node) {
            if (!routerPackages.has(node.source.value)) {
              return;
            }

            for (const specifier of node.specifiers) {
              if (
                specifier.type === "ImportSpecifier" &&
                specifier.imported.name === "useLocation"
              ) {
                useLocationNames.add(specifier.local.name);
              }
            }
          },
          VariableDeclarator(node) {
            if (
              node.id.type !== "Identifier" ||
              node.init?.type !== "CallExpression" ||
              node.init.callee.type !== "Identifier" ||
              !useLocationNames.has(node.init.callee.name)
            ) {
              return;
            }

            const owner = context.sourceCode
              .getAncestors(node)
              .findLast(isFunction);
            if (owner) {
              tracked.push({
                node,
                owner,
                name: node.id.name,
                render: false,
                deferred: false,
              });
            }
          },
          Identifier(node) {
            if (!tracked.length) {
              return;
            }

            const ancestors = context.sourceCode.getAncestors(node);
            const parent = ancestors[ancestors.length - 1];
            if (!isReference(node, parent)) {
              return;
            }

            for (const entry of tracked) {
              if (
                entry.name !== node.name ||
                entry.node.id === node ||
                !ancestors.includes(entry.owner)
              ) {
                continue;
              }

              const kind = classify([...ancestors, node], entry.owner);
              if (kind) {
                entry[kind] = true;
              }
            }
          },
          "Program:exit"() {
            for (const entry of tracked) {
              if (entry.deferred && !entry.render) {
                context.report({ node: entry.node, messageId: "forbidden" });
              }
            }
          },
        };
      },
    },
  },
};

export default plugin;
