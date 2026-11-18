# Collections

Collections are the top-level containers for documents. They also carry
the default permissions. They appear in the sidebar under "Collections".

## Sub-features

- Create (name, icon/color, default permission, advanced options)
- Open a collection page (`/collection/<slug>-<urlId>`) and expand it in the sidebar
- Edit, archive and delete through the collection menu (not mapped yet)

## How to get to it (user POV)

In the sidebar, under **Collections**, click **New collection**. A dialog
"Create a collection" opens. Type a name and click **Create**. The app
navigates to the new collection, and it appears in the sidebar. The command
bar (⌘K → "New collection") opens the same dialog.

## Driving it with drive.mjs

```bash
node $V/scripts/drive.mjs <id> $V/journeys/create-collection.mjs -- name="Proof"
```

The handles are `button "New collection"`, then
`dialog "Create a collection"`, then its only `textbox`, then
`button "Create"`. After that the URL matches `/collection/` and the sidebar
shows `link "Expand Proof"`.

The proof is `02-collection-page.png` plus exactly one row in `collections`
with that name and `deletedAt is null`.

## Gotchas

- The sidebar's "New collection" ignores an instant click (re-render on
  `pointerenter`). Hover, wait 300ms, then click. The journey does this.
- The name input in the dialog has **no accessible name**
  (`textbox` with no label). Select it as the only textbox in the dialog.
- `collections.create` has a per-endpoint rate limit. Many collections in a
  few minutes on one run can return 429. Check `network.log`.
- The page has no `main` landmark until the collection loads. Wait for the
  sidebar link instead.
