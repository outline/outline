import type { JSONObject } from "@shared/types";
export interface MockUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  role: string;
  isSuspended: boolean;
  language: string;
  timezone: string;
  preferences: Record<string, boolean>;
  lastActiveAt: string;
  createdAt: string;
}

export interface MockTeam {
  id: string;
  name: string;
  avatarUrl: string;
  subdomain: string;
  customDomain: string | null;
  allowedDomains: string[];
}

export interface MockNotebook {
  id: string;
  /** The short id that appears at the end of the notebook slug. */
  urlId: string;
  /** The path the notebook is reachable at, as returned by the real API. */
  url: string;
  name: string;
  description: string | null;
  color: string;
  icon: string | null;
  index: string;
  /** The sort field and direction for documents in this notebook. */
  sort: { field: string; direction: "asc" | "desc" };
  permission: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface MockDocument {
  id: string;
  /** The short id that appears at the end of the document slug. */
  urlId: string;
  /** The path the document is reachable at, as returned by the real API. */
  url: string;
  title: string;
  text: string;
  emoji: string | null;
  collectionId: string;
  parentDocumentId: string | null;
  createdById: string;
  collaboratorIds: string[];
  pinned: boolean;
  /** When the document was published; drafts have no published date. */
  publishedAt: string | null;
  lastModifiedById: string;
  /** Checklist task counts shown in the document meta. */
  tasks: { total: number; completed: number };
  /** Whether the document's notebook has been deleted. */
  isCollectionDeleted: boolean;
  archivedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MockComment {
  id: string;
  documentId: string;
  parentCommentId: string | null;
  createdById: string;
  /** The comment body as ProseMirror JSON. */
  data: JSONObject;
  createdAt: string;
  updatedAt: string;
}

export interface MockPin {
  id: string;
  documentId: string;
  collectionId: string | null;
  index: string;
  createdById: string;
  createdAt: string;
}

export interface MockState {
  user: MockUser;
  team: MockTeam;
  notebooks: MockNotebook[];
  documents: MockDocument[];
  comments: MockComment[];
  pins: MockPin[];
  starredDocumentIds: string[];
}

const STORAGE_KEY = "outline_mock_db_v5";

/**
 * Builds the url-safe slug the app uses in notebook and document paths.
 *
 * @param title the notebook or document title.
 * @returns the slugified title, or an empty string when there is no title.
 */
function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * Builds the path a notebook is reachable at, matching the real API's `url`.
 *
 * @param name the notebook name.
 * @param urlId the notebook's short url id.
 * @returns the notebook path.
 */
function notebookUrl(name: string, urlId: string): string {
  return `/notebook/${slugifyTitle(name)}-${urlId}`;
}

/**
 * Builds the path a document is reachable at.
 *
 * @param title the document title.
 * @param urlId the document's short url id.
 * @returns the document path.
 */
export function documentPath(title: string, urlId: string): string {
  return `/doc/${slugifyTitle(title) || "untitled"}-${urlId}`;
}

/** Inline markdown spans, mapped to the mark names in Outline's schema. */
const INLINE_MARKS: { pattern: RegExp; mark: string }[] = [
  { pattern: /\*\*([^*]+)\*\*/, mark: "strong" },
  { pattern: /(?<![*\w])\*([^*]+)\*(?!\*)/, mark: "em" },
  { pattern: /(?<![_\w])_([^_]+)_(?!\w)/, mark: "em" },
  { pattern: /~~([^~]+)~~/, mark: "strikethrough" },
  { pattern: /`([^`]+)`/, mark: "code_inline" },
];

const LINK = /\[([^\]]+)\]\(([^)\s]+)\)/;

/**
 * Splits a line of markdown into ProseMirror text nodes, applying the inline
 * marks the seed content uses. Marks are not nested – the first match wins.
 *
 * @param value the line to convert.
 * @returns the text nodes for the line.
 */
function toText(value: string): unknown[] {
  if (!value) {
    return [];
  }

  const link = LINK.exec(value);
  if (link) {
    return [
      ...toText(value.slice(0, link.index)),
      {
        type: "text",
        text: link[1],
        marks: [{ type: "link", attrs: { href: link[2], title: null } }],
      },
      ...toText(value.slice(link.index + link[0].length)),
    ];
  }

  for (const { pattern, mark } of INLINE_MARKS) {
    const match = pattern.exec(value);
    if (match) {
      return [
        ...toText(value.slice(0, match.index)),
        { type: "text", text: match[1], marks: [{ type: mark }] },
        ...toText(value.slice(match.index + match[0].length)),
      ];
    }
  }

  return [{ type: "text", text: value }];
}

/**
 * Converts the markdown-ish seed text into the ProseMirror document the editor
 * renders. Headings, bullet lists, paragraphs and inline marks are recognised –
 * enough for the sample content without pulling the markdown parser into the
 * mock.
 *
 * @param text the document text.
 * @returns a ProseMirror document node.
 */
export function textToProsemirror(text: string): {
  type: string;
  content: unknown[];
} {
  const content: unknown[] = [];
  let listItems: unknown[] = [];

  const flushList = () => {
    if (listItems.length) {
      content.push({ type: "bullet_list", content: listItems });
      listItems = [];
    }
  };

  for (const line of text.split("\n")) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("```")) {
      flushList();
      continue;
    }

    const heading = /^(#{1,4})\s+(.*)$/.exec(trimmed);
    if (heading) {
      flushList();
      content.push({
        type: "heading",
        attrs: { level: heading[1].length },
        content: toText(heading[2]),
      });
      continue;
    }

    const bullet = /^[-*]\s+(.*)$/.exec(trimmed);
    if (bullet) {
      listItems.push({
        type: "list_item",
        content: [{ type: "paragraph", content: toText(bullet[1]) }],
      });
      continue;
    }

    flushList();
    content.push({ type: "paragraph", content: toText(trimmed) });
  }

  flushList();

  return { type: "doc", content };
}

/**
 * Generates a short, url-safe id in the same shape as the real API's urlId.
 *
 * @returns a random 10 character identifier.
 */
function generateUrlId(): string {
  return Math.random().toString(36).slice(2, 12);
}

/**
 * Whether a requested identifier refers to a record. The app sends either the
 * raw id, the urlId, or the full `title-urlId` slug taken from the address bar.
 *
 * @param id the record's id.
 * @param urlId the record's short url id.
 * @param requested the identifier from the request.
 * @returns true when the identifier refers to this record.
 */
function matchesIdentifier(
  id: string,
  urlId: string,
  requested: string
): boolean {
  return (
    id === requested || urlId === requested || requested.endsWith(`-${urlId}`)
  );
}

const initialSeedState: MockState = {
  user: {
    id: "usr-1001",
    name: "Jane Doe",
    email: "jane@outline.dev",
    avatarUrl:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
    role: "admin",
    isSuspended: false,
    language: "en_US",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    preferences: {},
    lastActiveAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  },
  team: {
    id: "team-1001",
    name: "Acme Corp",
    avatarUrl:
      "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150",
    subdomain: "acme",
    customDomain: null,
    allowedDomains: ["outline.dev", "acme.com"],
  },
  notebooks: [
    {
      id: "col-eng",
      urlId: "engineering1",
      url: notebookUrl("Engineering", "engineering1"),
      name: "Engineering",
      description:
        "Technical guides, system architecture, and API documentation",
      color: "#4E5BA6",
      icon: "code",
      index: "a",
      sort: { field: "index", direction: "asc" },
      permission: "read_write",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
    },
    {
      id: "col-prod",
      urlId: "product0001",
      url: notebookUrl("Product", "product0001"),
      name: "Product",
      description: "Roadmaps, feature specs, and design assets",
      color: "#D9534F",
      icon: "target",
      index: "b",
      sort: { field: "index", direction: "asc" },
      permission: "read_write",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
    },
    {
      id: "col-gen",
      urlId: "general0001",
      url: notebookUrl("General & Onboarding", "general0001"),
      name: "General & Onboarding",
      description: "Company policies, team directory, and welcome resources",
      color: "#00B0FF",
      icon: "book",
      index: "c",
      sort: { field: "index", direction: "asc" },
      permission: "read_write",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
    },
  ],
  documents: [
    {
      id: "doc-welcome",
      urlId: "welcome0001",
      url: documentPath("Welcome to Outline", "welcome0001"),
      title: "Welcome to Outline",
      text: "# Welcome to Outline! 🎉\n\nOutline is a fast, collaborative knowledge base built for teams.\n\n### 🚀 Features Included in this Standalone Frontend:\n- **Astro & React Integration**\n- **Tailwind CSS Utility Styling**\n- **Persistent In-Browser LocalStorage Database**\n- **Rich Text & Collaborative ProseMirror Editor**\n\nFeel free to create new documents, edit content, and explore collections!",
      emoji: "👋",
      collectionId: "col-gen",
      parentDocumentId: null,
      createdById: "usr-1001",
      collaboratorIds: ["usr-1001"],
      pinned: true,
      publishedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
      lastModifiedById: "usr-1001",
      tasks: { total: 0, completed: 0 },
      isCollectionDeleted: false,
      archivedAt: null,
      deletedAt: null,
      createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "doc-arch-guide",
      urlId: "archguide01",
      url: documentPath("System Architecture Guide", "archguide01"),
      title: "System Architecture Guide",
      text: "# System Architecture\n\nOverview of the system modules:\n\n1. **Frontend**: React + Astro + Tailwind CSS\n2. **State Management**: MobX Stores\n3. **Editor Engine**: ProseMirror & Y.js\n4. **Mock API**: LocalStorage Fetch Interceptor\n\n```ts\n// Standalone initialization\nimport { initMocks } from './mocks/initMocks';\ninitMocks();\n```",
      emoji: "🏗️",
      collectionId: "col-eng",
      parentDocumentId: null,
      createdById: "usr-1001",
      collaboratorIds: ["usr-1001"],
      pinned: false,
      publishedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      lastModifiedById: "usr-1001",
      tasks: { total: 0, completed: 0 },
      isCollectionDeleted: false,
      archivedAt: null,
      deletedAt: null,
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "doc-roadmap-2026",
      urlId: "roadmap2026",
      url: documentPath("Product Roadmap 2026", "roadmap2026"),
      title: "Product Roadmap 2026",
      text: "# Product Roadmap 2026 🗺️\n\n### Q1 Goals\n- Full Standalone Frontend Client\n- Tailwind UI component library\n- Instant document search\n\n### Q2 Goals\n- Offline PWA caching\n- Real-time client sync",
      emoji: "🚀",
      collectionId: "col-prod",
      parentDocumentId: null,
      createdById: "usr-1001",
      collaboratorIds: ["usr-1001"],
      pinned: true,
      publishedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      lastModifiedById: "usr-1001",
      tasks: { total: 0, completed: 0 },
      isCollectionDeleted: false,
      archivedAt: null,
      deletedAt: null,
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  comments: [
    {
      id: "cmt-1001",
      documentId: "doc-welcome",
      parentCommentId: null,
      createdById: "usr-1001",
      data: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "Great documentation!" }],
          },
        ],
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  pins: [
    {
      id: "pin-1",
      documentId: "doc-welcome",
      collectionId: "col-gen",
      index: "a",
      createdById: "usr-1001",
      createdAt: new Date().toISOString(),
    },
  ],
  starredDocumentIds: ["doc-welcome", "doc-roadmap-2026"],
};

export class MockDatabase {
  private state: MockState;

  constructor() {
    this.state = this.loadState();
  }

  private loadState(): MockState {
    if (typeof window === "undefined") {
      return initialSeedState;
    }
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (_e) {
      // fallback
    }
    this.saveState(initialSeedState);
    return initialSeedState;
  }

  public saveState(state?: MockState): void {
    if (state) {
      this.state = state;
    }
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      } catch (_e) {
        // ignore
      }
    }
  }

  public getState(): MockState {
    return this.state;
  }

  // --- Document Operations ---
  public getDocuments(collectionId?: string): MockDocument[] {
    return this.state.documents.filter((d) => {
      if (d.deletedAt) {
        return false;
      }
      if (collectionId && d.collectionId !== collectionId) {
        return false;
      }
      return true;
    });
  }

  /**
   * Looks up a document by its id, its urlId, or the full slug used in urls.
   *
   * @param id an id, urlId, or `title-urlId` slug.
   * @returns the matching document, or undefined.
   */
  public getDocument(id: string): MockDocument | undefined {
    return this.state.documents.find(
      (d) => !d.deletedAt && matchesIdentifier(d.id, d.urlId, id)
    );
  }

  public createDocument(data: Partial<MockDocument>): MockDocument {
    const urlId = generateUrlId();
    const title = data.title || "Untitled Document";
    const doc: MockDocument = {
      id: `doc-${Date.now()}`,
      urlId,
      url: documentPath(title, urlId),
      title,
      text: data.text || "",
      emoji: data.emoji || "📝",
      collectionId: data.collectionId || "col-gen",
      parentDocumentId: data.parentDocumentId || null,
      createdById: this.state.user.id,
      collaboratorIds: [this.state.user.id],
      pinned: false,
      publishedAt: data.publishedAt ?? new Date().toISOString(),
      lastModifiedById: this.state.user.id,
      tasks: { total: 0, completed: 0 },
      isCollectionDeleted: false,
      archivedAt: null,
      deletedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.state.documents.push(doc);
    this.saveState();
    return doc;
  }

  public updateDocument(
    id: string,
    updates: Partial<MockDocument>
  ): MockDocument | undefined {
    const doc = this.getDocument(id);
    if (!doc) {
      return undefined;
    }
    Object.assign(doc, updates, { updatedAt: new Date().toISOString() });
    this.saveState();
    return doc;
  }

  public deleteDocument(id: string): boolean {
    const doc = this.getDocument(id);
    if (!doc) {
      return false;
    }
    doc.deletedAt = new Date().toISOString();
    this.saveState();
    return true;
  }

  // --- Notebook Operations ---
  public getNotebooks(): MockNotebook[] {
    return this.state.notebooks.filter((notebook) => !notebook.deletedAt);
  }

  /**
   * Looks up a notebook by its id, its urlId, or the full slug used in urls.
   *
   * @param id an id, urlId, or `name-urlId` slug.
   * @returns the matching notebook, or undefined.
   */
  public getNotebook(id: string): MockNotebook | undefined {
    return this.state.notebooks.find(
      (notebook) => !notebook.deletedAt && matchesIdentifier(notebook.id, notebook.urlId, id)
    );
  }

  public createNotebook(data: Partial<MockNotebook>): MockNotebook {
    const name = data.name || "New Notebook";
    const urlId = generateUrlId();
    const notebook: MockNotebook = {
      id: `col-${Date.now()}`,
      urlId,
      url: notebookUrl(name, urlId),
      name,
      description: data.description || null,
      color: data.color || "#4E5BA6",
      icon: data.icon || "collection",
      index: String.fromCharCode(97 + this.state.notebooks.length),
      sort: { field: "index", direction: "asc" },
      permission: "read_write",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
    };
    this.state.notebooks.push(notebook);
    this.saveState();
    return notebook;
  }

  // --- Comments ---
  public getComments(documentId?: string): MockComment[] {
    if (documentId) {
      return this.state.comments.filter((c) => c.documentId === documentId);
    }
    return this.state.comments;
  }

  public createComment(data: Partial<MockComment>): MockComment {
    const comment: MockComment = {
      id: `cmt-${Date.now()}`,
      documentId: data.documentId || "",
      parentCommentId: data.parentCommentId || null,
      createdById: this.state.user.id,
      data: data.data || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.state.comments.push(comment);
    this.saveState();
    return comment;
  }

  // --- Star Operations ---
  public toggleStar(documentId: string): boolean {
    const idx = this.state.starredDocumentIds.indexOf(documentId);
    if (idx >= 0) {
      this.state.starredDocumentIds.splice(idx, 1);
    } else {
      this.state.starredDocumentIds.push(documentId);
    }
    this.saveState();
    return this.state.starredDocumentIds.includes(documentId);
  }
}

export const mockDb = new MockDatabase();
