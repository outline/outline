---
name: meeting-notes
description: Create meeting notes in Outline from a template; use when the user wants an agenda, notes, or a follow-up document for a meeting.
metadata:
  short-description: Create meeting notes in Outline from a template
---

# Meeting notes

Create a meeting document from the team’s template and fill it with the details the user provides.

All tools named in this skill are tools of the Outline MCP server.

## Quick start

1. Collect the meeting name, date, attendees, and purpose. Ask for anything missing that the template needs.
2. Find a template with `list_templates`. Prefer a template whose title contains “meeting”, “notes”, “agenda”, or “1:1”. Each result includes the template body as markdown. Results are newest first, 25 for each page; use `offset` to see more.
3. Choose how to use the template:
   - Unchanged: pass its `id` as `templateId` to `create_document`.
   - Adapted: edit the returned `text`, fill in the known fields, and pass the result as `text`.
4. Resolve the destination collection with `list_collections`. Use the template’s `collectionId` when it has one.
5. Create the document with `create_document` and share the `url`.
6. After the meeting, add decisions and action items with `update_document`. Use `editMode: "patch"` and set `findText` to the exact markdown of the section to fill, so the rest of the document keeps its formatting. When there is no such section, use `editMode: "append"`.

## Writing rules

- Do not start the markdown with a top-level heading; set the title with `title`.
- Mention attendees with `@[Display Name](mention://user/userId)`. Find IDs with `list_users`.
- Use task lists (`- [ ]`) for action items and name an owner for each.
- When there is no suitable template, use this structure: Purpose, Attendees, Agenda, Notes, Decisions, Action items.

## Tool reference

- `list_templates` – `{ collectionId?, offset?, limit? }`; results include `id`, `title`, `collectionId`, `text`.
- `create_document` – `{ title, templateId?, text?, collectionId, publish }`.
- `update_document` – `{ id, editMode: "patch", findText, text }` or `editMode: "append"`.
- `list_users` – `{ query }` to resolve attendee IDs.
