/**
 * Local oxlint plugin with rules that keep document reads behind the access
 * gate (`Document.accessibleWhere` and `Collection#structureFor`).
 */

/** Returns true if the member expression accesses the given property name. */
function isProperty(node, name) {
  if (node?.type !== "MemberExpression") {
    return false;
  }

  if (!node.computed) {
    return node.property.type === "Identifier" && node.property.name === name;
  }

  return node.property.type === "Literal" && node.property.value === name;
}

/** Returns true if the file is a test, or ends with one of the given paths. */
function isAllowedFile(context, paths) {
  const filename = (context.filename ?? context.getFilename()).replaceAll(
    "\\",
    "/"
  );

  // Tests build fixtures and check raw values directly.
  if (/\.test\.tsx?$/.test(filename) || filename.includes("/server/test/")) {
    return true;
  }

  return paths.some((path) => filename.endsWith(path));
}

const plugin = {
  meta: {
    name: "access",
  },
  rules: {
    "no-direct-collection-ids": {
      meta: {
        type: "problem",
        docs: {
          description:
            "Disallow `collectionIds()` outside the access gate. Use `Document.accessibleWhere` for document reads.",
        },
        messages: {
          forbidden:
            "Use `Document.accessibleWhere(user)` to limit a document query. For a collection-access query, add `// oxlint-disable-next-line access/no-direct-collection-ids -- <reason>`.",
        },
      },
      create(context) {
        if (
          isAllowedFile(context, [
            "server/models/User.ts",
            "server/models/Document.ts",
          ])
        ) {
          return {};
        }

        return {
          CallExpression(node) {
            if (isProperty(node.callee, "collectionIds")) {
              context.report({ node: node.callee, messageId: "forbidden" });
            }
          },
        };
      },
    },
    "no-raw-document-structure": {
      meta: {
        type: "problem",
        docs: {
          description:
            "Disallow reading a collection's document structure outside the access gate. Use `Collection#structureFor`.",
        },
        messages: {
          forbidden:
            "Use `collection.structureFor(viewer)` to read a document tree that is sent in a response or copied for a user.",
        },
      },
      create(context) {
        if (
          isAllowedFile(context, [
            "server/models/Collection.ts",
            "server/commands/documentMover.ts",
            "server/queues/tasks/JSONAPIImportTask.ts",
          ])
        ) {
          return {};
        }

        return {
          MemberExpression(node) {
            const isWrite =
              node.parent?.type === "AssignmentExpression" &&
              node.parent.left === node;

            if (isProperty(node, "documentStructure") && !isWrite) {
              context.report({ node, messageId: "forbidden" });
            }
          },
          CallExpression(node) {
            if (
              isProperty(node.callee, "getCachedDocumentStructure") ||
              isProperty(node.callee, "getDocumentTree")
            ) {
              context.report({ node: node.callee, messageId: "forbidden" });
            }
          },
        };
      },
    },
  },
};

export default plugin;
