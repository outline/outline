import { createAction } from "~/actions";
import { DocumentsSection, NavigationSection } from "~/actions/sections";

/**
 * Actions that are only registered as WebMCP tools, never in menus or the
 * command bar. Names and descriptions are intentionally not translated as
 * they are read by agents, not users.
 */
export const getCurrentContext = createAction({
  name: "Get current context",
  analyticsName: "Get current context",
  section: NavigationSection,
  description:
    "Returns the user's current location in the app as JSON, including the active document and collection if any.",
  mcp: {},
  perform: ({ stores, location }) => {
    const document = stores.documents.active;
    const collection = stores.collections.active;

    return JSON.stringify({
      path: location.pathname,
      user: stores.auth.user
        ? { id: stores.auth.user.id, name: stores.auth.user.name }
        : undefined,
      document: document
        ? {
            id: document.id,
            title: document.titleWithDefault,
            path: document.url,
          }
        : undefined,
      collection: collection
        ? { id: collection.id, name: collection.name, path: collection.path }
        : undefined,
    });
  },
});

export const searchWorkspace = createAction({
  name: "Search workspace",
  analyticsName: "Search workspace",
  section: DocumentsSection,
  description:
    "Searches all documents the user can access and returns the top matches as JSON, each with an id, title, path, and a snippet of matching context.",
  mcp: {
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The text to search for.",
        },
      },
      required: ["query"],
    },
  },
  perform: async ({ stores, mcpArgs }) => {
    const query = typeof mcpArgs?.query === "string" ? mcpArgs.query : "";
    if (!query) {
      return "A query argument is required.";
    }

    const results = await stores.documents.search({ query, limit: 10 });

    return JSON.stringify(
      results.map((result) => ({
        id: result.document.id,
        title: result.document.titleWithDefault,
        path: result.document.url,
        context: result.context,
      }))
    );
  },
});

export const rootWebMCPActions = [getCurrentContext, searchWorkspace];
