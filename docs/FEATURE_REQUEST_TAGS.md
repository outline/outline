# Feature Request: Document Tagging System

## Summary

We would like to propose a **first-class tagging system** for Outline that allows documents to be classified with tags as an orthogonal dimension alongside the existing collection hierarchy. We have been running Outline as our primary knowledge base and have found that the collection structure alone is not sufficient to express the full semantic context of documents — particularly across team boundaries and topic domains that naturally span multiple collections.

We have invested significant time designing this feature thoroughly and have already begun a working implementation. We are opening this discussion to align with the core team before submitting a PR.

---

## The Problem

Outline's current document organization relies exclusively on **collections and nested documents**. This works well for hierarchical structure, but it creates friction in two common scenarios:

### 1. Cross-cutting topics that don't belong in a single collection

A document about "Q1 Budget Review" lives in the Finance collection — but it is equally relevant to the Strategy team, the Marketing team, and the Operations team. There is no lightweight way to express this relevance without duplicating the document, creating awkward cross-collection links, or building a deeply nested hierarchy that doesn't reflect how people actually think about topics.

Tags solve this cleanly: a document stays where it belongs structurally and gains orthogonal classification metadata.

### 2. Discoverability at scale

As a knowledge base grows past a few hundred documents, finding related content becomes increasingly difficult if the only navigation is the collection tree. Search helps, but it requires knowing what to search for. Tags allow users to browse by topic, status, project, or any other dimension the team finds valuable — without restructuring the entire collection hierarchy.

---

## Real-World Use Cases

**Our primary motivation:** We maintain an Obsidian vault alongside our Outline instance and have built a plugin that synchronizes Obsidian notes into Outline. Obsidian documents carry tags as YAML frontmatter (`tags: [project, client-xyz]`). Today, those tags are silently dropped when documents are pushed to Outline, losing valuable classification metadata that our team relies on.

**Other scenarios we hear from teams:**

- Marking documents by **status** (`draft`, `approved`, `archived`) without moving them between collections
- Classifying by **project or client** across multiple functional collections
- Topic-based browsing in large engineering wikis (`backend`, `api`, `infra`, `security`)
- Cross-team knowledge bases where a single document is relevant to multiple departments

---

## Proposed Design

After thorough analysis of existing approaches (including Obsidian, Notion, and Confluence), we propose a **pure metadata classification system** — not inline hashtags in document content.

### Core principle

Tags are **document-level metadata**, stored separately from document content. This is the key decision that differentiates our proposal from a naive hashtag implementation:

- Renaming a tag is a single database update — it does not touch document content, does not create new revisions, and does not conflict with collaborative editing sessions (Y.js)
- Tags are visible to anyone who can read the document — including guests and public share recipients — without requiring team membership
- The tag autocomplete list (for editors creating new tags) is team-scoped, preventing tag proliferation and ensuring consistent naming across the workspace

### Data model

Two new tables:

```text
tags
├── id          UUID, PK
├── teamId      UUID, FK → teams.id, CASCADE DELETE
├── createdById UUID, FK → users.id, SET NULL
├── name        VARCHAR(64), stored as lowercase
├── createdAt / updatedAt / deletedAt (paranoid)
└── UNIQUE(teamId, name)

document_tags  (join table)
├── id          UUID, PK
├── documentId  UUID, FK → documents.id, CASCADE DELETE
├── tagId       UUID, FK → tags.id, CASCADE DELETE
├── createdById UUID, FK → users.id, SET NULL
├── createdAt
└── UNIQUE(documentId, tagId)
```

Tags are **team-scoped for normalization** (one canonical "marketing" tag per team, not one per document), but they are **delivered as part of the document response** — so any user with document read access sees them, independent of team membership.

### Permission model

| Action | Who |
| ------ | --- |
| Read tags on a document | Anyone with document read access (including guests and share links) |
| List team tags (autocomplete) | Team members only — not guests |
| Add / remove tag on a document | Editors with document update permission |
| Create a new tag | Editors (upsert on `addTag` by name) |
| Rename a tag (affects all documents) | Team admins only |
| Delete a tag globally | Team admins only, with explicit confirmation |

### Deletion safety mechanism

Deleting a global tag removes it from **every document in the team**. This is a destructive, team-wide operation. We propose a two-step confirmation:

1. `POST /api/tags.usage` returns the document count per tag
2. The frontend shows a confirmation dialog listing the impact before allowing the delete
3. `POST /api/tags.delete` requires `{ confirm: true }` in the request body — a request without the confirmation flag returns HTTP 400

### API surface

Following the existing RPC-style POST pattern used throughout the Outline API:

```text
POST  /api/tags.list        List team tags (paginated; supports query for autocomplete)
POST  /api/tags.create      Create a new tag (name, optional color)
POST  /api/tags.update      Rename or recolor a tag (admin only)
POST  /api/tags.usage       Usage count per tag + document count (pre-delete preview)
POST  /api/tags.delete      Delete tag globally (admin only, requires confirm: true in body)

POST  /api/documents.addTag     Add tag to document (accepts name or id; upserts new tags)
POST  /api/documents.removeTag  Remove tag from document
```

The `documents.addTag` endpoint accepts a tag by **name** (not just ID), and upserts the tag if it does not yet exist. This is essential for programmatic use cases like our Obsidian sync plugin.

### Document response extension

```typescript
{
  // ... existing fields ...
  tags: Array<{
    id: string;     // omitted in isPublic / share-link responses
    name: string;
    color?: string; // optional hex color, e.g. "#4caf50"
  }>;
}
```

Tags are included in `presentDocument` for both authenticated and public (share-link) responses. In the public case, `id` is omitted to prevent enumeration of internal resources.

### Markdown import / export (YAML frontmatter)

YAML frontmatter `tags:` is a widely used open standard (Jekyll, Hugo, Pandoc, Ghost — not Obsidian-specific). We propose:

- **Import:** When a Markdown file is imported and contains `tags:` in its YAML frontmatter, those values are automatically set as Outline tags on the document
- **Export:** When a document is exported as Markdown, its tags are written as `tags:` in the YAML frontmatter

This makes Outline a first-class citizen in Markdown-based workflows and enables round-trip compatibility with tools like Obsidian.

---

## What We Are Explicitly NOT Proposing

To keep the scope focused and the implementation maintainable:

- **No inline hashtags in document content.** Outline already has document linking (`[[Doc]]`). Inline tags would create a second, weaker navigation system with significant editor complexity (ProseMirror extension required) and bidirectional sync problems in collaborative sessions.
- **No nested / hierarchical tags** (`#project/sub`). Flat tags are sufficient and far simpler to implement and maintain.
- **No per-user tags.** Tags are team-wide normalized identifiers — `marketing` means the same thing for everyone on the team.

---

## Implementation Status

We have a working implementation in a local fork covering:

- Database migrations for `tags` and `document_tags`
- Sequelize models and `BelongsToMany` relation on `Document`
- Policy layer following existing `cancan` patterns
- API routes including the usage preview endpoint
- `presentDocument` extension (with and without `id` for public responses)
- YAML frontmatter import/export integration
- Frontend: MobX model and store, `TagBadge` and `TagInput` components (with autocomplete, click-to-assign, and colored dot indicators), sidebar integration, admin settings page with color picker, rename, and two-step delete

We are happy to submit a PR once there is alignment from the core team on the approach. We are also open to adjustments — particularly around the API naming conventions and where tag management surfaces in the Settings UI.

---

## Prior Art / Related Discussions

Tags have been discussed in Outline's community before. This proposal attempts to synthesize those discussions into a concrete, fully specified design that is ready for implementation. Key decisions that differentiate this proposal from previous ones:

- Tags are metadata, not content — no editor extension required in Phase 1
- Team-scoped normalization prevents the tag proliferation problem that plagues content-embedded approaches (a known pain point in Obsidian)
- The permission model carefully separates "reading tags" (document access) from "managing tags globally" (admin access)
- Deletion is protected by a two-step mechanism that shows impact before committing

---

## Questions for the Core Team

1. Is the proposed API naming (`documents.addTag`, `documents.removeTag`) consistent with your conventions, or would you prefer a different pattern?
2. Is the Settings page the right home for team-wide tag management, or would you prefer it to live elsewhere?
3. Do you have concerns about the YAML frontmatter import/export approach, or is that aligned with the direction for Markdown compatibility?
4. Are there any architectural constraints we should be aware of before we finalize the PR?

We look forward to the discussion. Happy to provide the full design document, database schema, or a demo on request.
