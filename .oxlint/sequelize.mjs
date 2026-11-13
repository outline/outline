/**
 * Local oxlint plugin with Sequelize-specific rules.
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
    name: "sequelize",
  },
  rules: {
    "prefer-after-commit-helper": {
      meta: {
        type: "problem",
        docs: {
          description:
            "Disallow calling `transaction.afterCommit` directly. Use the `afterCommit` helper from `@server/storage/transaction` instead.",
        },
        messages: {
          forbidden:
            "Use `afterCommit(transaction, callback)` from `@server/storage/transaction`. A nested transaction runs its hooks when the savepoint is released, before the commit, and the helper also runs the callback when there is no transaction.",
        },
      },
      create(context) {
        return {
          CallExpression(node) {
            if (isProperty(node.callee, "afterCommit")) {
              context.report({ node: node.callee, messageId: "forbidden" });
            }
          },
        };
      },
    },
  },
};

export default plugin;
