import { mockDb } from "./db";

export function setupApiMock(): void {
  if (typeof window === "undefined") return;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const urlString = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

    // Only intercept /api/ requests
    if (urlString.includes("/api/")) {
      const action = urlString.split("/api/")[1]?.split("?")[0];
      let body: Record<string, any> = {};

      if (init?.body && typeof init.body === "string") {
        try {
          body = JSON.parse(init.body);
        } catch (_e) {
          // non-json body
        }
      }

      const responsePayload = handleApiRequest(action, body);

      if (responsePayload && typeof responsePayload === "object" && !responsePayload.pagination) {
        const count = Array.isArray(responsePayload.data)
          ? responsePayload.data.length
          : responsePayload.data && typeof responsePayload.data === "object" && Array.isArray(responsePayload.data.pins)
          ? responsePayload.data.pins.length
          : 0;

        responsePayload.pagination = {
          total: count,
          limit: body.limit || 25,
          offset: body.offset || 0,
          nextPath: "",
        };
      }

      return new Response(JSON.stringify(responsePayload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    return originalFetch(input, init);
  };
}

function handleApiRequest(action: string, body: Record<string, any>): any {
  const state = mockDb.getState();

  switch (action) {
    case "auth.info":
      return {
        data: {
          user: state.user,
          team: state.team,
          groups: [],
          groupUsers: [],
          availableTeams: [state.team],
          collaborationToken: "mock-collaboration-token",
        },
        policies: [],
      };

    case "users.info":
      return {
        data: {
          user: state.user,
          team: state.team,
        },
        policies: [],
      };

    case "users.list":
      return {
        data: [state.user],
        policies: [],
      };

    case "collections.list":
      return {
        data: mockDb.getCollections(),
        policies: [],
      };

    case "collections.info": {
      const col = mockDb.getCollection(body.id);
      return {
        data: col || null,
        policies: [],
      };
    }

    case "collections.create": {
      const col = mockDb.createCollection(body);
      return {
        data: col,
        policies: [],
      };
    }

    case "documents.list": {
      const docs = mockDb.getDocuments(body.collectionId);
      return {
        data: docs,
        policies: [],
      };
    }

    case "documents.info": {
      const doc = mockDb.getDocument(body.id);
      return {
        data: doc || null,
        policies: [],
      };
    }

    case "documents.create": {
      const newDoc = mockDb.createDocument(body);
      return {
        data: newDoc,
        policies: [],
      };
    }

    case "documents.update": {
      const updated = mockDb.updateDocument(body.id, body);
      return {
        data: updated || null,
        policies: [],
      };
    }

    case "documents.delete": {
      mockDb.deleteDocument(body.id);
      return {
        data: { success: true },
        policies: [],
      };
    }

    case "documents.star":
    case "documents.unstar": {
      const isStarred = mockDb.toggleStar(body.id);
      return {
        data: { starred: isStarred },
        policies: [],
      };
    }

    case "documents.search": {
      const query = (body.query || "").toLowerCase();
      const results = mockDb.getDocuments().filter(
        (d) => d.title.toLowerCase().includes(query) || d.text.toLowerCase().includes(query)
      );
      return {
        data: results,
        policies: [],
      };
    }

    case "comments.list":
      return {
        data: mockDb.getComments(body.documentId),
        policies: [],
      };

    case "comments.create": {
      const cmt = mockDb.createComment(body);
      return {
        data: cmt,
        policies: [],
      };
    }

    case "pins.list":
      return {
        data: {
          pins: state.pins,
          documents: [],
        },
        policies: [],
      };

    case "pins.create": {
      const newPin = {
        id: `pin-${Date.now()}`,
        documentId: body.documentId,
        collectionId: body.collectionId || null,
        index: "a",
        createdById: state.user.id,
        createdAt: new Date().toISOString(),
      };
      state.pins.push(newPin);
      mockDb.saveState();
      return {
        data: newPin,
        policies: [],
      };
    }

    case "notifications.list":
      return {
        data: {
          notifications: [],
        },
        policies: [],
      };

    case "subscriptions.list":
    case "groups.list":
    case "memberships.list":
    case "shares.list":
    case "revisions.list":
    case "events.list":
    case "templates.list":
    case "views.list":
    case "unfurls.list":
      return {
        data: [],
        policies: [],
      };

    case "notifications.count":
      return {
        data: { count: 0 },
        policies: [],
      };

    default:
      // Generic fallback for any .list, .info, .count, .create, .update, .delete
      if (action.startsWith("documents.")) {
        return { data: [], policies: [] };
      }
      if (action.endsWith(".list")) {
        return { data: [], policies: [] };
      }
      if (action.endsWith(".count")) {
        return { data: { count: 0 }, policies: [] };
      }
      return {
        data: {},
        policies: [],
      };
  }
}
