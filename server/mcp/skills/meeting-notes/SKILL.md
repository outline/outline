---
name: meeting-notes
description: Create meeting notes in Outline from a template; use when the user wants an agenda, notes, or a follow-up document for a meeting.
metadata:
  short-description: Create meeting notes in Outline from a template
---

# Meeting notes

Create a meeting document from the team’s template and fill it with the details the user provides.

## Quick start

1. Collect the meeting name, date, attendees, and purpose. Ask for anything missing that the template needs.
2. Find a template with `Outline:list_templates`. Prefer a template whose title contains “meeting”, “notes”, “agenda”, or “1:1”. Each result includes the template body as markdown.
3. Choose how to use the template:
   - Unchanged: pass its `id` as `templateId` to `Outline:create_document`.
   - Adapted: edit the returned `text`, fill in the known fields, and pass the result as `text`.
4. Resolve the destination collection with `Outline:list_collections`. Use the template’s `collectionId` when it has one.
5. Create the document with `Outline:create_document` and share the `url`.
6. After the meeting, add decisions and action items with `Outline:update_document` and `editMode: "patch"` so the rest of the document keeps its formatting.

## Writing rules

- Do not start the markdown with a top-level heading; set the title with `title`.
- Mention attendees with `@[Display Name](mention://user/userId)`. Find IDs with `Outline:list_users`.
- Use task lists (`- [ ]`) for action items and name an owner for each.
- When there is no suitable template, use this structure: Purpose, Attendees, Agenda, Notes, Decisions, Action items.

## Tool reference

- `Outline:list_templates` – `{ collectionId?, limit }`; results include `id`, `title`, `collectionId`, `text`.
- `Outline:create_document` – `{ title, templateId?, text?, collectionId, publish }`.
- `Outline:update_document` – `{ id, editMode: "patch", findText, text }` or `editMode: "append"`.
- `Outline:list_users` – `{ query }` to resolve attendee IDs.
