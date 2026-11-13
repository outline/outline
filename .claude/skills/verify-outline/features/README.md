# Outline feature map

This is the maintained list of user-facing features that `verify-outline`
can drive. Each file covers what the feature is, how a user reaches it, how
to drive it with `scripts/drive.mjs`, and the observable end state that
proves it works.

The instance starts empty. Journeys build on each other in this order:

| Feature | File | Journey | Needs first |
| --- | --- | --- | --- |
| First-run workspace setup and sign-in | [workspace-setup.md](workspace-setup.md) | `journeys/setup-workspace.mjs` | fresh `up` |
| Collections | [collections.md](collections.md) | `journeys/create-collection.mjs` | setup |
| Documents (create, edit, persist) | [documents.md](documents.md) | `journeys/create-document.mjs` | a collection |
| Search | [search.md](search.md) | `journeys/search.mjs` | a document |
| Share to web (public link) | [sharing.md](sharing.md) | `journeys/share-public.mjs` | a document |

Not mapped yet (candidates in priority order): comments
(`button "Comment"` on a doc), inviting members and permissions
(`button "Invite people…"`, the `dialog "Share"` invite box), import/export
(`/settings/import`, `/settings/export`), API keys
(`/settings/api-and-access`), templates, and the archive and trash
(`/archive`, `/trash`). When you add one, add a row here and a file with
the same four sections.
