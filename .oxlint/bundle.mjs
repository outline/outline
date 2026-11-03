/**
 * Local oxlint plugin with rules for code that ships in the minified client
 * bundle.
 */

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

const plugin = {
  meta: {
    name: "bundle",
  },
  rules: {
    "no-constructor-name": {
      meta: {
        type: "problem",
        docs: {
          description:
            "Disallow reading `constructor.name`. The minifier renames classes, and two classes in separate chunks can end up with the same name.",
        },
        messages: {
          forbidden:
            "Do not read `constructor.name`; minified builds rename classes and two classes can share a name. Key by the class itself (eg a WeakMap) or use a static property such as `modelName`.",
        },
      },
      create(context) {
        return {
          MemberExpression(node) {
            if (
              isProperty(node, "name") &&
              isProperty(node.object, "constructor")
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
