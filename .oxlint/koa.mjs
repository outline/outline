/**
 * Local oxlint plugin with Koa-specific rules.
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
    name: "koa",
  },
  rules: {
    "no-request-origin": {
      meta: {
        type: "problem",
        docs: {
          description:
            "Disallow `request.origin`, which returns the Origin header rather than the URL origin.",
        },
        messages: {
          forbidden:
            "`request.origin` is the Origin request header and is null for same-origin requests. Use `request.URL.origin` instead.",
        },
      },
      create(context) {
        return {
          MemberExpression(node) {
            if (
              isProperty(node, "origin") &&
              isProperty(node.object, "request")
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
