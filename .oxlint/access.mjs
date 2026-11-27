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

const FIND_METHODS = new Set(["findAll", "count", "findAndCountAll"]);
const SCOPE_METHODS = new Set(["scope", "unscoped"]);
const GATED_MODELS = new Set(["Document", "Template", "Collection"]);

/** Returns true if the node is a gated model or a scoped gated model. */
function isGatedModel(node) {
  if (node?.type === "Identifier") {
    return GATED_MODELS.has(node.name);
  }

  return (
    node?.type === "CallExpression" &&
    node.callee.type === "MemberExpression" &&
    !node.callee.computed &&
    SCOPE_METHODS.has(node.callee.property.name) &&
    isGatedModel(node.callee.object)
  );
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
            "Disallow collection id lists outside the access gates. Use the `WithCtx` methods or `accessibleWhere`.",
        },
        messages: {
          forbidden:
            "Use `findAllWithCtx` or `accessibleWhere` to limit a query. Where the ids themselves are needed, add `// oxlint-disable-next-line access/no-direct-collection-ids -- <reason>`.",
        },
      },
      create(context) {
        if (
          isAllowedFile(context, [
            "server/models/Collection.ts",
            "server/models/Document.ts",
            "server/models/Team.ts",
            "server/models/User.ts",
          ])
        ) {
          return {};
        }

        return {
          CallExpression(node) {
            if (
              isProperty(node.callee, "accessibleIds") ||
              isProperty(node.callee, "collectionIds")
            ) {
              context.report({ node: node.callee, messageId: "forbidden" });
            }
          },
        };
      },
    },
    "no-unsafe-find": {
      meta: {
        type: "problem",
        docs: {
          description:
            "Disallow Sequelize list queries on gated models. Use the `WithCtx` methods, or `unsafe` methods for reads that are not for a user.",
        },
        messages: {
          forbidden:
            "Use `findAllWithCtx` or `countWithCtx` so that the query only returns rows the user can read. For a read that is not for a user, use `unsafeFindAll` or `unsafeCount`.",
        },
      },
      create(context) {
        if (
          isAllowedFile(context, [
            "server/models/Collection.ts",
            "server/models/Document.ts",
            "server/models/Template.ts",
          ])
        ) {
          return {};
        }

        return {
          CallExpression(node) {
            const { callee } = node;
            if (
              callee.type === "MemberExpression" &&
              !callee.computed &&
              FIND_METHODS.has(callee.property.name) &&
              isGatedModel(callee.object)
            ) {
              context.report({ node: callee, messageId: "forbidden" });
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
            "server/models/Document.ts",
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
