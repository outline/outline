export interface MockUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  role: string;
  isSuspended: boolean;
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

export interface MockCollection {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string | null;
  index: string;
  permission: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface MockDocument {
  id: string;
  title: string;
  text: string;
  emoji: string | null;
  collectionId: string;
  parentDocumentId: string | null;
  createdById: string;
  collaboratorIds: string[];
  pinned: boolean;
  archivedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MockState {
  user: MockUser;
  team: MockTeam;
  collections: MockCollection[];
  documents: MockDocument[];
  starredDocumentIds: string[];
}

const STORAGE_KEY = "outline_mock_db_v1";

const initialSeedState: MockState = {
  user: {
    id: "usr-1001",
    name: "Jane Doe",
    email: "jane@outline.dev",
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
    role: "admin",
    isSuspended: false,
    createdAt: new Date().toISOString(),
  },
  team: {
    id: "team-1001",
    name: "Acme Corp",
    avatarUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150",
    subdomain: "acme",
    customDomain: null,
    allowedDomains: ["outline.dev", "acme.com"],
  },
  collections: [
    {
      id: "col-eng",
      name: "Engineering",
      description: "Technical guides, system architecture, and API documentation",
      color: "#4E5BA6",
      icon: "code",
      index: "a",
      permission: "read_write",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
    },
    {
      id: "col-prod",
      name: "Product",
      description: "Roadmaps, feature specs, and design assets",
      color: "#D9534F",
      icon: "compass",
      index: "b",
      permission: "read_write",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
    },
    {
      id: "col-gen",
      name: "General & Onboarding",
      description: "Company policies, team directory, and welcome resources",
      color: "#00B0FF",
      icon: "book",
      index: "c",
      permission: "read_write",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
    },
  ],
  documents: [
    {
      id: "doc-welcome",
      title: "Welcome to Outline",
      text: "# Welcome to Outline! 🎉\n\nOutline is a fast, collaborative knowledge base built for teams.\n\n### 🚀 Features Included in this Frontend:\n- **Astro & React Integration**\n- **Tailwind CSS Utility Styling**\n- **Persistent LocalStorage Database**\n- **Rich Text & Collaborative ProseMirror Editor**\n\nFeel free to create new documents, edit content, and explore collections!",
      emoji: "👋",
      collectionId: "col-gen",
      parentDocumentId: null,
      createdById: "usr-1001",
      collaboratorIds: ["usr-1001"],
      pinned: true,
      archivedAt: null,
      deletedAt: null,
      createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "doc-arch-guide",
      title: "System Architecture Guide",
      text: "# System Architecture\n\nOverview of the system modules:\n\n1. **Frontend**: React + Astro + Tailwind CSS\n2. **State Management**: MobX Stores\n3. **Editor Engine**: ProseMirror & Y.js\n4. **Mock API**: LocalStorage Fetch Interceptor\n\n```ts\n// Standalone initialization\nimport { initMocks } from './mocks/initMocks';\ninitMocks();\n```",
      emoji: "🏗️",
      collectionId: "col-eng",
      parentDocumentId: null,
      createdById: "usr-1001",
      collaboratorIds: ["usr-1001"],
      pinned: false,
      archivedAt: null,
      deletedAt: null,
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "doc-roadmap-2026",
      title: "Product Roadmap 2026",
      text: "# Product Roadmap 2026 🗺️\n\n### Q1 Goals\n- Full Standalone Frontend Client\n- Tailwind UI component library\n- Instant document search\n\n### Q2 Goals\n- Offline PWA caching\n- Real-time client sync",
      emoji: "🚀",
      collectionId: "col-prod",
      parentDocumentId: null,
      createdById: "usr-1001",
      collaboratorIds: ["usr-1001"],
      pinned: true,
      archivedAt: null,
      deletedAt: null,
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      updatedAt: new Date().toISOString(),
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
      if (d.deletedAt) return false;
      if (collectionId && d.collectionId !== collectionId) return false;
      return true;
    });
  }

  public getDocument(id: string): MockDocument | undefined {
    return this.state.documents.find((d) => d.id === id && !d.deletedAt);
  }

  public createDocument(data: Partial<MockDocument>): MockDocument {
    const doc: MockDocument = {
      id: `doc-${Date.now()}`,
      title: data.title || "Untitled Document",
      text: data.text || "",
      emoji: data.emoji || "📝",
      collectionId: data.collectionId || "col-gen",
      parentDocumentId: data.parentDocumentId || null,
      createdById: this.state.user.id,
      collaboratorIds: [this.state.user.id],
      pinned: false,
      archivedAt: null,
      deletedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.state.documents.push(doc);
    this.saveState();
    return doc;
  }

  public updateDocument(id: string, updates: Partial<MockDocument>): MockDocument | undefined {
    const doc = this.getDocument(id);
    if (!doc) return undefined;
    Object.assign(doc, updates, { updatedAt: new Date().toISOString() });
    this.saveState();
    return doc;
  }

  public deleteDocument(id: string): boolean {
    const doc = this.getDocument(id);
    if (!doc) return false;
    doc.deletedAt = new Date().toISOString();
    this.saveState();
    return true;
  }

  // --- Collection Operations ---
  public getCollections(): MockCollection[] {
    return this.state.collections.filter((c) => !c.deletedAt);
  }

  public getCollection(id: string): MockCollection | undefined {
    return this.state.collections.find((c) => c.id === id && !c.deletedAt);
  }

  public createCollection(data: Partial<MockCollection>): MockCollection {
    const col: MockCollection = {
      id: `col-${Date.now()}`,
      name: data.name || "New Collection",
      description: data.description || null,
      color: data.color || "#4E5BA6",
      icon: data.icon || "folder",
      index: String.fromCharCode(97 + this.state.collections.length),
      permission: "read_write",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
    };
    this.state.collections.push(col);
    this.saveState();
    return col;
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
