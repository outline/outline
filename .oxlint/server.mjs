/**
 * Local oxlint plugin with rules for server code that handles requests.
 */

/** Returns true if the property key is `rejectOnEmpty`. */
function isRejectOnEmptyKey(node) {
  if (node.computed) {
    return node.key.type === "Literal" && node.key.value === "rejectOnEmpty";
  }
  return (
    (node.key.type === "Identifier" && node.key.name === "rejectOnEmpty") ||
    (node.key.type === "Literal" && node.key.value === "rejectOnEmpty")
  );
}

const plugin = {
  meta: {
    name: "server",
  },
  rules: {
    "no-reject-on-empty": {
      meta: {
        type: "problem",
        docs: {
          description:
            "Disallow `rejectOnEmpty` in request handlers. It throws before authorization, so the response shows if a record exists in another team.",
        },
        messages: {
          forbidden:
            "Do not use `rejectOnEmpty` here. Pass the result to `authorize()`, which rejects null with a 403, or throw `NotFoundError()` explicitly once the request is authorized.",
        },
      },
      create(context) {
        if (/\.test\.[jt]sx?$/.test(context.filename)) {
          return {};
        }

        return {
          Property(node) {
            if (!isRejectOnEmptyKey(node)) {
              return;
            }
            if (node.value.type === "Literal" && node.value.value === false) {
              return;
            }
            context.report({ node, messageId: "forbidden" });
          },
        };
      },
    },
  },
};

export default plugin;
