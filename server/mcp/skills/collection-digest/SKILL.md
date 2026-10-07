---
name: collection-digest
description: Summarize what changed in an Outline collection since a date; use when the user asks what is new, what was updated, or wants a digest of recent documents.
metadata:
  short-description: Summarize recent changes in an Outline collection
---

# Collection digest

Produce a short digest of recent activity in one collection.

## Quick start

1. Confirm the collection and the period (for example “since Monday” or “last 2 weeks”). Resolve the collection with `Outline:list_collections`.
2. List recent documents with `Outline:list_documents` and `collectionId` set, without a `query`. Results are ordered by recency. Page with `offset` until `updatedAt` is older than the start of the period.
3. For documents that changed in the period, read the content with `Outline:fetch` (`resource: "document"`) only when the title and summary are not enough.
4. Write the digest. Group by theme, not by document. Link every item to its `url`.
5. If the user wants to keep the digest, save it with `Outline:create_document` in the same collection, or append it to a running “Digest” document with `Outline:update_document` and `editMode: "append"`.

## Digest format

- One line per change: what changed, why it matters, and a link.
- Mark new documents (`createdAt` in the period) separately from updated documents.
- Call out documents that were archived (`archivedAt` set) when `includeArchived` is true.
- Keep the digest under 300 words unless the user asks for detail.

## Tool reference

- `Outline:list_collections` – resolve the collection ID.
- `Outline:list_documents` – `{ collectionId, offset, limit }`; each result has `document.updatedAt`, `document.createdAt`, and `document.url`.
- `Outline:fetch` – `{ resource: "document", id }` to read the full markdown.
- `Outline:list_comments` – `{ collectionId, statusFilter: ["unresolved"] }` to include open discussions.
