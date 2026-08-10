import { documentPath, mockDb, textToProsemirror } from "./db";
import { handleShopRequest, hasSession } from "./shop";
import type { MockCollection, MockDocument } from "./db";

/**
 * The envelope every mock endpoint answers with.
 *
 * `policies` and `pagination` are filled in afterwards for any handler that
 * did not set them, and `__status` lets a handler answer non-200.
 */
interface ApiResponse {
  data?: unknown;
  policies?: { id: string; abilities: Record<string, boolean> }[];
  pagination?: {
    total: number;
    limit: number;
    offset: number;
    nextPath: string;
  };
  /** Stripped before the response is sent; sets the HTTP status. */
  __status?: number;
  [key: string]: unknown;
}

/**
 * Adds the editor payload the client expects alongside a document's markdown.
 *
 * @param document the stored document.
 * @returns the document with its ProseMirror `data` attached.
 */
function presentDocument(document: MockDocument) {
  // `pinned` is derived from the pins list on the client and is read-only on
  // the model, so it is not part of the document payload.
  const { pinned: _pinned, ...rest } = document;
  return { ...rest, data: textToProsemirror(document.text) };
}

/**
 * The abilities granted to the mock user. Every `can.*` check in the app reads
 * from the policies returned alongside a record, so without these the UI hides
 * essentially every action.
 */
const GRANTED_ABILITIES = [
  "read",
  "update",
  "delete",
  "restore",
  "share",
  "star",
  "unstar",
  "subscribe",
  "unsubscribe",
  "comment",
  "createChildDocument",
  "createDocument",
  "createCollection",
  "archive",
  "unarchive",
  "publish",
  "unpublish",
  "move",
  "duplicate",
  "pin",
  "unpin",
  "pinToHome",
  "download",
  "manage",
  "readDocument",
  "listUsers",
  "inviteUser",
  "createGroup",
  "createTemplate",
  "updateTemplate",
  "listShares",
  "listViews",
  "createWebhookSubscription",
  "listWebhookSubscriptions",
  "createApiKey",
  "listApiKeys",
];

/**
 * Builds the policy payload for a set of records.
 *
 * @param ids the record ids the policies apply to.
 * @returns a policy granting all mocked abilities for each id.
 */
function policiesFor(ids: string[]) {
  const abilities = Object.fromEntries(
    GRANTED_ABILITIES.map((ability) => [ability, true])
  );
  return ids.map((id) => ({ id, abilities }));
}

/**
 * Attaches the nested document structure the sidebar renders for a collection.
 * The real API embeds this tree on every collection it returns.
 *
 * @param collection the collection to decorate.
 * @returns the collection with its `documents` navigation tree.
 */
function withDocumentStructure(collection: MockCollection) {
  const documents = mockDb.getDocuments(collection.id);

  const toNode = (parentDocumentId: string | null): unknown[] =>
    documents
      .filter((doc) => doc.parentDocumentId === parentDocumentId)
      .map((doc) => ({
        id: doc.id,
        title: doc.title,
        url: documentPath(doc.title, doc.urlId),
        emoji: doc.emoji ?? undefined,
        collectionId: collection.id,
        children: toNode(doc.id),
      }));

  return { ...collection, documents: toNode(null) };
}

export function setupApiMock(): void {
  if (typeof window === "undefined") {
    return;
  }

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> => {
    const urlString =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;

    // Only intercept /api/ requests
    if (urlString.includes("/api/")) {
      const action = urlString.split("/api/")[1]?.split("?")[0];
      let body: Record<string, unknown> = {};

      if (init?.body && typeof init.body === "string") {
        try {
          body = JSON.parse(init.body);
        } catch (_e) {
          // non-json body
        }
      }

      const responsePayload = handleApiRequest(action, body);

      if (
        responsePayload &&
        typeof responsePayload === "object" &&
        !responsePayload.policies?.length
      ) {
        responsePayload.policies = policiesFor(
          collectIds(responsePayload.data)
        );
      }

      if (
        responsePayload &&
        typeof responsePayload === "object" &&
        !responsePayload.pagination
      ) {
        const count = countRecords(responsePayload.data);

        responsePayload.pagination = {
          total: count,
          limit: Number(body.limit ?? 25),
          offset: Number(body.offset ?? 0),
          nextPath: "",
        };
      }

      const status = responsePayload?.__status ?? 200;
      delete responsePayload?.__status;

      return new Response(JSON.stringify(responsePayload), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    }

    return originalFetch(input, init);
  };
}

/**
 * Collects the record ids in a response payload so a policy can be issued for
 * each one. Walks one level into object envelopes and nested records.
 *
 * @param data the `data` property of a response payload.
 * @returns the ids found in the payload.
 */
function collectIds(data: unknown): string[] {
  if (!data || typeof data !== "object") {
    return [];
  }

  if (Array.isArray(data)) {
    return data.flatMap(collectIds);
  }

  const record = data as Record<string, unknown>;
  const ids = typeof record.id === "string" ? [record.id] : [];

  return [
    ...ids,
    ...Object.entries(record)
      .filter(([key]) => key !== "parent")
      .flatMap(([, value]) =>
        Array.isArray(value) || (value && typeof value === "object")
          ? collectIds(value)
          : []
      ),
  ];
}

/**
 * Counts the records in a response payload so pagination metadata reflects the
 * page size. Handles both plain array payloads and the object envelopes used by
 * endpoints such as `stars.list`, where the records live under a named key.
 *
 * @param data the `data` property of a response payload.
 * @returns the number of records in the payload.
 */
function countRecords(data: unknown): number {
  if (Array.isArray(data)) {
    return data.length;
  }
  if (data && typeof data === "object") {
    const arrays = Object.values(data).filter(Array.isArray);
    return arrays.length ? Math.max(...arrays.map((value) => value.length)) : 0;
  }
  return 0;
}

function handleApiRequest(
  action: string,
  body: Record<string, unknown>
): ApiResponse | undefined {
  const state = mockDb.getState();

  const shop = handleShopRequest(action, body);
  if (shop) {
    return { ...shop, policies: [] };
  }

  switch (action) {
    case "auth.config":
      return {
        data: {
          name: state.team.name,
          hostname: window.location.hostname,
          providers: [
            {
              id: "email",
              name: "Email",
              authUrl: "/auth/email",
            },
          ],
        },
        policies: [],
      };

    case "auth.info":
      if (!hasSession()) {
        return {
          __status: 401,
          error: "authentication_required",
          message: "Authentication required",
        };
      }
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
        data: state.user,
        policies: [],
      };

    case "users.update": {
      Object.assign(state.user, body);
      mockDb.saveState();
      return {
        data: state.user,
        policies: [],
      };
    }

    case "teams.info":
      return {
        data: state.team,
        policies: [],
      };

    case "teams.update": {
      Object.assign(state.team, body);
      mockDb.saveState();
      return {
        data: state.team,
        policies: [],
      };
    }

    case "users.list":
      return {
        data: [state.user],
        policies: [],
      };

    case "collections.list":
      return {
        data: mockDb.getCollections().map(withDocumentStructure),
        policies: [],
      };

    case "collections.info": {
      const col = mockDb.getCollection(String(body.id));
      return {
        data: col ? withDocumentStructure(col) : null,
        policies: [],
      };
    }

    case "relationships.list":
      return {
        data: { relationships: [], documents: [] },
        policies: [],
      };

    case "shares.info":
      return {
        data: { shares: [] },
        policies: [],
      };

    case "collections.create": {
      const col = mockDb.createCollection(body);
      return {
        data: col,
        policies: [],
      };
    }

    case "documents.list": {
      const docs = mockDb.getDocuments(
        body.collectionId === undefined ? undefined : String(body.collectionId)
      );
      return {
        data: docs.map(presentDocument),
        policies: [],
      };
    }

    case "documents.info": {
      const doc = mockDb.getDocument(String(body.id));
      // The client reads the document off a `document` key on the envelope.
      return {
        data: doc ? { document: presentDocument(doc) } : null,
        policies: [],
      };
    }

    case "documents.create": {
      const newDoc = mockDb.createDocument(body);
      return {
        data: presentDocument(newDoc),
        policies: [],
      };
    }

    case "documents.update": {
      const updated = mockDb.updateDocument(String(body.id), body);
      return {
        data: updated ? presentDocument(updated) : null,
        policies: [],
      };
    }

    case "documents.delete": {
      mockDb.deleteDocument(String(body.id));
      return {
        data: { success: true },
        policies: [],
      };
    }

    case "documents.star":
    case "documents.unstar": {
      const isStarred = mockDb.toggleStar(String(body.id));
      return {
        data: { starred: isStarred },
        policies: [],
      };
    }

    case "documents.search": {
      const query = String(body.query ?? "").toLowerCase();
      const results = mockDb
        .getDocuments()
        .filter(
          (d) =>
            d.title.toLowerCase().includes(query) ||
            d.text.toLowerCase().includes(query)
        );
      return {
        data: results.map(presentDocument),
        policies: [],
      };
    }

    case "comments.list":
      return {
        data: mockDb.getComments(String(body.documentId)),
        policies: [],
      };

    case "comments.create": {
      const cmt = mockDb.createComment(body);
      return {
        data: cmt,
        policies: [],
      };
    }

    case "pins.list": {
      const pinnedIds = state.pins.map((pin) => pin.documentId);
      return {
        data: {
          pins: state.pins,
          documents: mockDb
            .getDocuments()
            .filter((doc) => pinnedIds.includes(doc.id))
            .map(presentDocument),
        },
        policies: [],
      };
    }

    case "stars.list": {
      const starred = mockDb
        .getDocuments()
        .filter((doc) => state.starredDocumentIds.includes(doc.id));
      return {
        data: {
          stars: starred.map((doc, index) => ({
            id: `star-${doc.id}`,
            documentId: doc.id,
            collectionId: null,
            index: String.fromCharCode(97 + index),
            createdAt: doc.createdAt,
            updatedAt: doc.updatedAt,
          })),
          documents: starred.map(presentDocument),
        },
        policies: [],
      };
    }

    // These endpoints return an object envelope rather than a plain array, and
    // the stores read the individual keys off it directly.
    case "userMemberships.list":
      return {
        data: { memberships: [], documents: [], users: [] },
        policies: [],
      };

    case "groupMemberships.list":
      return {
        data: { groupMemberships: [], documents: [], groups: [] },
        policies: [],
      };

    case "groups.list":
      return {
        data: { groups: [], groupMemberships: [] },
        policies: [],
      };

    case "groups.memberships":
      return {
        data: { groupMemberships: [], groups: [], users: [] },
        policies: [],
      };

    case "collections.memberships":
      return {
        data: { memberships: [], users: [] },
        policies: [],
      };

    case "pins.create": {
      const newPin = {
        id: `pin-${Date.now()}`,
        documentId: String(body.documentId),
        collectionId: body.collectionId ? String(body.collectionId) : null,
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
