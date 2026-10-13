---
name: capture-conversation
description: Save the current conversation, a decision, or a set of notes as a document in an Outline collection; use when the user wants to keep what was discussed in their knowledge base.
metadata:
  short-description: Save this conversation as an Outline document
---

# Capture conversation

Turn the current chat into a clear, reusable Outline document.

All tools named in this skill are tools of the Outline MCP server.

## Quick start

1. Ask what to keep (the full discussion, a decision, action items, a how-to) and who will read it.
2. Find the destination with `list_collections`. If the user names a collection, match it by name. If not, show the available collections and ask.
3. Check for an existing document on the same topic with `list_documents` (query = the topic). Offer to update it with `update_document` instead of creating a duplicate.
4. Draft the document. Write a short summary first, then the content, then open questions and next steps.
5. Create it with `create_document` and give the user the returned `url`.

## Writing rules

- Do not start the markdown with a top-level heading. The title is a separate field; pass it as `title`.
- Use `##` headings for sections, bullet lists for decisions and action items, and tables for comparisons.
- Mention people with `@[Display Name](mention://user/userId)`. Use `list_users` to find the `userId`.
- Keep the source: add a final section “Source” with the date and the context of the conversation.
- Create as a draft (`publish: false`) when the user wants to review before others can see it.

## Tool reference

- `list_collections` – find the destination collection by name.
- `list_documents` – search existing documents by topic.
- `create_document` – `{ title, text, collectionId, publish }`.
- `update_document` – `{ id, text, editMode: "append" }` to add to an existing document.
