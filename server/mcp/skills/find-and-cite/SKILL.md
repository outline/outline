---
name: find-and-cite
description: Answer questions from the Outline knowledge base with quotes and links to the source documents; use when the user asks what the team knows, documented, or decided about a topic.
metadata:
  short-description: Find answers in Outline and cite the source documents
---

# Find and cite

Answer from the workspace, quote the relevant passage, and link to where it lives.

## Quick start

1. Search with `Outline:list_documents` and a short, literal `query`. Run separate searches for different phrasings; do not combine them with “or” in one query.
2. Use the `context` snippet in each result to pick the best candidates. Narrow with `collectionId` when the user names a collection.
3. Read the top candidates with `Outline:fetch` (`resource: "document"`). The second content block is the full markdown.
4. Answer the question in your own words, then quote the passage that supports it and link to the document `url`. Include the `breadcrumb` so the user knows where the document sits.
5. When documents disagree, say so, and show the `updatedAt` date of each so the user can judge which is current.

## Citation rules

- Quote exactly; do not paraphrase inside quotation marks.
- One link per claim. Use the document `url`, or the `shareUrl` when the user wants a link that works without signing in.
- If nothing relevant exists, say that clearly and offer to create a document with the answer once the user confirms it.
- Treat archived documents as historical and label them as such.

## Tool reference

- `Outline:list_documents` – `{ query, collectionId?, includeArchived?, limit }`; results include `document`, `context`, `breadcrumb`, `shareUrl`.
- `Outline:fetch` – `{ resource: "document", id }`; accepts an ID or a document URL.
- `Outline:list_collection_documents` – `{ collectionId }` to browse a collection’s structure when search is not enough.
