# Documents

This is the core of the app: a collaborative ProseMirror editor. The title
saves over the API (`documents.update`). The body saves over the Y.js
collaboration websocket and is stored in `documents.content`.

## Sub-features

- New doc in a collection (it is published at once in the current UI)
- Title editing (`textbox "Document title"`)
- Body editing (`textbox "Editor content"`): typing, `/` block menu,
  markdown shortcuts, uploads (`button "Upload file"`), find and replace
- Persistence across a reload, and real-time sync
- Header actions: Share, Star, `button "New child document"`, `button "Document options"`

## How to get to it (user POV)

Open a collection from the sidebar and click **New doc** (top right). An
empty doc opens at `/doc/untitled-<urlId>` with the cursor in the title.
Type a title, press Enter, then type the body. There is no Save button:
changes save on their own.

## Driving it with drive.mjs

```bash
node $V/scripts/drive.mjs <id> $V/journeys/create-document.mjs -- collection="Proof" [title=... body=...]
```

The journey opens the collection with `link "Expand <collection>"` and clicks
`main` → `link|button "New doc"`. It then clicks `textbox "Document title"`, uses
`keyboard.type(title)`, presses `Enter` and uses `keyboard.type(body)`.

The proof has three parts. (1) It polls the DB until the row
`title|published|content contains body` is `<title>|t|t`. (2) It reloads the
page and asserts that the title and body come back from the server. (3) It
takes the screenshots `01-typed.png` and `02-after-reload.png`.
`result.json` has `title`, `body` and `url` for the search and share
journeys.

## Gotchas

- New docs in a collection are **published at once** (`publishedAt` is set),
  with an empty title until you type one. There is no "Publish" button in
  this flow. The draft flow (`/drafts`, `link "New doc"` on Home →
  `/doc/new`) is not mapped yet.
- The body is not saved by the API. Do not assert on `documents.update`
  in `network.log`. Poll `content::text` for up to ~30s.
- Use letters-only unique markers. Postgres parses `verify-123` as a
  negative-number token, so a numeric marker can never be found through
  search.
- Scope "New doc" to `getByRole("main")`. Newer builds have a **Personal**
  sidebar section with its own `button "New doc"`, which makes an inline
  title input in the sidebar instead of opening the editor.
- Right after a reload, the body can be in the DOM twice for a moment (the
  read-only editor and the collaborative editor during the hand-over).
  Strict-mode locators then fail. Filter `{ visible: true }` and wait for one
  copy. More than one visible copy after ~10s is a real bug.
- Use `page.keyboard.type` after you click. `locator.fill` on the
  contenteditable bypasses ProseMirror's input handling.
