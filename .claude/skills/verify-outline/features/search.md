# Search

This is full-text search over the documents the user can access
(Postgres `searchVector`), with filters and a "titles only" switch.

## Sub-features

- Query from the Search page (`/search`) or the header searchbox
  `searchbox "Search documents ⌘K"` on Home
- Filters: `button "Any collection"`, `button "Any author"`,
  `button "Published, Drafts"`, `button "All time"`,
  `switch "Search titles only"`, sort `button "Relevance"`
- Open a result. Recent searches (`searches.list`).

## How to get to it (user POV)

Click **Search** in the sidebar, type a word in the big search box and press
Enter. The results list shows the title, the collection and the last update.
Clicking a result opens the doc.

## Driving it with drive.mjs

```bash
node $V/scripts/drive.mjs <id> $V/journeys/search.mjs -- query=<word> expect="<exact doc title>"
```

The handles are `link "Search"` (exact), then `searchbox "Search…"` with
fill and Enter. Then the journey waits for a result `link` whose name
contains the title, takes a screenshot, clicks it, and asserts that
`textbox "Document title"` equals `expect`.

The proof is `01-results.png` with the matching result, `02-opened-result.png`,
and `200 POST /api/documents.search` in `network.log`.

## Gotchas

- Use a letters-only word as the query (see documents.md). Numbers with a
  leading hyphen are stored as negative numbers.
- The `searchVector` updates when the document saves. Search right after
  `create-document` finished its DB poll, not mid-typing.
- The query is in the `?q=` URL param (`searchPath` in
  `app/utils/routeHelpers.ts`), not `?query=`. Wait for the result, not for
  the URL.
- The result rows switch to an interactive state (selection checkbox, star,
  menu) on the first pointer event. Open a result with `click(locator)` from
  drive.mjs. A bare `locator.click()` is swallowed.
- The result link name contains the title, and the sidebar has a link with
  the same name. Take the `.last()` match, which is the result list.
