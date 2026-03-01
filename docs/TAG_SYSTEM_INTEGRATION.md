# Tag System Integration

This document describes the technical implementation of the enhanced tag system, including all modified and newly added files.

---

## Overview

The tag system was extended to support:

- **Tag colors** – each tag can have an optional hex color value
- **Tag settings page** – full CRUD UI (create, edit, delete) with color picker
- **Document tag input** – inline tag editor with autocomplete, suggestions, and click-to-assign
- **Colored tag badges** – visual color indicators across the UI
- **Sidebar tag links** – colored dot indicator instead of generic hashtag icon

---

## Database

### Migration

**`server/migrations/20260228105817-add-color-to-tags.js`** *(new)*

Adds an optional `color` column (`VARCHAR(7)`, nullable) to the `tags` table.

```js
await queryInterface.addColumn("tags", "color", {
  type: Sequelize.STRING(7),
  allowNull: true,
});
```

Run with:

```bash
yarn db:migrate
```

---

## Server

### Model

**`server/models/Tag.ts`** *(modified)*

Added the `color` field as an optional `DataTypes.STRING` attribute:

```ts
@Column(DataTypes.STRING)
color: string | null;
```

### Presenter

**`server/presenters/tag.ts`** *(modified)*

Exposed `color` in API responses:

```ts
color: tag.color,
```

### API Schema

**`server/routes/api/tags/schema.ts`** *(modified)*

Added optional `color` validation to both `TagsCreateSchema` and `TagsUpdateSchema`:

```ts
color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
```

### API Handlers

**`server/routes/api/tags/tags.ts`** *(modified)*

- **`tags.create`** – persists `color` from request body
- **`tags.update`** – updates `color` on the tag model
- **`tags.usage`** – includes `color` in the usage response payload so the frontend can hydrate tag models without a separate fetch

---

## Client

### Models

**`app/models/Tag.ts`** *(modified)*

Added `color` as an `@observable` field:

```ts
@observable color: string | undefined;
```

**`app/models/Document.ts`** *(modified)*

Extended the `tags` array type to carry color metadata:

```ts
@observable tags: Array<{ id: string; name: string; color?: string }> = [];
```

### Store

**`app/stores/TagsStore.ts`** *(modified)*

New actions added to the existing `TagsStore`:

| Action | Description |
|---|---|
| `fetchPage(params?)` | Loads a paginated list of tags from `POST /api/tags.list` |
| `fetchUsage()` | Loads all tags with `documentCount` and `color` from `POST /api/tags.usage`; hydrates existing models in place |
| `addToDocument(document, tag)` | Appends a tag (with `id`, `name`, `color`) to a document's local `tags` array and calls `document.save()` |
| `removeFromDocument(document, tagId)` | Removes a tag from a document's local `tags` array and calls `document.save()` |
| `delete(tag, options)` | Calls `DELETE /api/tags.delete` with optional `{ confirm: true }` flag |

A `orderedData` computed property returns tags sorted alphabetically by name.

---

## UI Components

### TagBadge

**`app/components/TagBadge.tsx`** *(modified)*

Added an optional `color` prop. When provided, a small filled circle is rendered before the tag label using the hex color. Styled with `s()` theme helper.

```tsx
<TagBadge tag={{ name: "example", color: "#4caf50" }} />
```

### TagInput

**`app/components/TagInput.tsx`** *(rewritten)*

Complete redesign of the inline tag editor used in the document sidebar. Key features:

- **Available tags panel** – shows all workspace tags as clickable badges; clicking assigns the tag to the document immediately
- **Autocomplete dropdown** – filters existing tags as the user types; pressing Enter or clicking creates/assigns a tag
- **Colored dots** – each suggestion entry shows the tag's color dot
- **Keyboard navigation** – ArrowUp/ArrowDown to navigate suggestions, Escape to close, Enter to confirm
- **Max length** – enforces a 64-character limit per tag name
- **New tag creation** – if the typed text does not match an existing tag, a new tag is created on confirm

### TagDeleteDialog

**`app/components/TagDeleteDialog.tsx`** *(new)*

A confirmation dialog used when deleting a tag from the settings page. Calls `tags.delete(tag, { confirm: true })` on submit.

Props:

```ts
interface Props {
  tag: Tag;
  onSubmit?: () => void;
}
```

### TagsLink (Sidebar)

**`app/components/Sidebar/components/TagsLink.tsx`** *(modified)*

Replaced the generic `HashtagIcon` with a colored dot SVG when the tag has a `color` value set. Falls back to `HashtagIcon` when no color is available.

---

## Scenes

### Settings – Tags Page

**`app/scenes/Settings/Tags.tsx`** *(modified)*

Full tag management UI accessible at `/settings/tags`. Features:

- Table listing all tags with columns: name badge, document count, creation date, actions
- **Create tag** button opens a modal with a name input and a color picker (preset colors + custom hex input)
- **Edit tag** (pencil icon) opens the same modal pre-filled with the existing tag's data
- **Delete tag** (trash icon) opens `TagDeleteDialog` for confirmation
- Fetches both `tags.fetchPage()` and `tags.fetchUsage()` in parallel on mount to ensure `documentCount` and `color` are populated

### Document – Tags Component

**`app/scenes/Document/components/Tags.tsx`** *(modified)*

- **Edit mode** – renders `TagInput` for users with update permissions
- **Read-only mode** – renders a list of `TagBadge` components with `color` prop instead of plain text spans

---

## Internationalisation

**`shared/i18n/locales/de_DE/translation.json`** *(modified)*

New German translation keys added:

| Key | Translation |
|---|---|
| `"Create tag"` | `"Tag erstellen"` |
| `"Update tag"` | `"Tag aktualisieren"` |
| `"Edit tag"` | `"Tag bearbeiten"` |
| `"Delete tag"` | `"Tag löschen"` |
| `"Tag color"` | `"Tag-Farbe"` |
| `"Available tags"` | `"Verfügbare Tags"` |
| `"New tag"` | `"Neuer Tag"` |
| `"Assign tag"` | `"Tag zuweisen"` |

After modifying translation files, the i18n build artefacts must be updated:

```bash
node_modules/.bin/i18next '{shared,app,server,plugins}/**/*.{ts,tsx}'
cp -R shared/i18n/locales build/shared/i18n/
```

---

## Environment Configuration

**`.env.development`** *(modified)*

`DEFAULT_LANGUAGE` sets the server-side fallback language used to initialise i18next before a user session is available. Individual users override this via their account preferences (`user.language`), which is applied dynamically via `changeLanguage()` in `app/components/Authenticated.tsx`.

```
DEFAULT_LANGUAGE=en_US
```

---

## File Summary

| File | Status | Change |
|---|---|---|
| `server/migrations/20260228105817-add-color-to-tags.js` | New | DB migration: add `color` column |
| `server/models/Tag.ts` | Modified | Added `color` field |
| `server/presenters/tag.ts` | Modified | Expose `color` in API responses |
| `server/routes/api/tags/schema.ts` | Modified | Added `color` to create/update schemas |
| `server/routes/api/tags/tags.ts` | Modified | Handle `color` in create, update, usage handlers |
| `app/models/Tag.ts` | Modified | Added `color` observable |
| `app/models/Document.ts` | Modified | Added `color` to `tags` array type |
| `app/stores/TagsStore.ts` | Modified | Added `fetchPage`, `fetchUsage`, `addToDocument`, `removeFromDocument`, `delete`, `orderedData` |
| `app/components/TagBadge.tsx` | Modified | Added `color` prop + colored dot |
| `app/components/TagInput.tsx` | Rewritten | Suggestions, autocomplete, colored dots, click-to-assign |
| `app/components/TagDeleteDialog.tsx` | New | Deletion confirmation dialog |
| `app/components/Sidebar/components/TagsLink.tsx` | Modified | Colored dot in sidebar |
| `app/scenes/Settings/Tags.tsx` | Modified | Full CRUD settings page with color picker |
| `app/scenes/Document/components/Tags.tsx` | Modified | Read-only `TagBadge` list + `TagInput` in edit mode |
| `shared/i18n/locales/de_DE/translation.json` | Modified | New tag-related translation keys |
| `.env.development` | Modified | Set `DEFAULT_LANGUAGE=en_US` |
