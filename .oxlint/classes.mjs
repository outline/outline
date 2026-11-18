/**
 * Local oxlint plugin with class style rules.
 */

const plugin = {
  meta: {
    name: "classes",
  },
  rules: {
    "no-private-identifier": {
      meta: {
        type: "suggestion",
        docs: {
          description: "Disallow `#` private class members.",
        },
        messages: {
          forbidden:
            "Do not use `#` private members. Use the TypeScript `private` modifier instead.",
        },
      },
      create(context) {
        const check = (node) => {
          if (node.key.type === "PrivateIdentifier") {
            context.report({ node: node.key, messageId: "forbidden" });
          }
        };

        return {
          AccessorProperty: check,
          MethodDefinition: check,
          PropertyDefinition: check,
        };
      },
    },
  },
};

export default plugin;
