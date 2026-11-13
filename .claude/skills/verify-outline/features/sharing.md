# Sharing: publish to web

The Share dialog on a document controls member access and the public link.
"Publish to web" creates a `shares` row that anyone with the `/s/<shareId>`
link can open without signing in.

## Sub-features

- Publish to web (`switch "Publish to internet"`) and unpublish
- Copy the link (the link icon in the dialog). There are also share options
  once published: indexing, child documents, and a custom URL.
- Invite people or groups (`textbox "Add or invite…"`) and change a
  member's permission (`Can edit` and so on): not mapped yet
- Collection-level public access (Collection → Share): not mapped yet

## How to get to it (user POV)

Open a document and click **Share** (top right). A popover "Share" lists the
people with access and a "Publish to web" row with a toggle. Turn the toggle
on, then copy the link and open it in a private window.

## Driving it with drive.mjs

```bash
node $V/scripts/drive.mjs <id> $V/journeys/share-public.mjs -- doc=/doc/<slug-urlId> expect="<body text>"
```

The journey hovers and clicks `button "Share"` (exact), then clicks
`dialog "Share"` → `switch "Publish to internet"` and waits for
`aria-checked="true"`. It reads the share id from `shares`
(`published = t`, not revoked). It then opens `/s/<shareId>` in a **new
browser context with no cookies** and waits for the body text there.

The proof is `01-share-dialog-published.png` (toggle on),
`02-public-page-signed-out.png` (content visible while signed out), the
`db:` line with the share row, and `200 POST /api/shares.create`.

## Gotchas

- The journey refuses a doc that is already published. Use a fresh doc from
  `create-document`.
- If the toggle does not turn on, look in `network.log` for a 429 on
  `shares.create`. Before the skill raised the global per-IP limit, the
  production build's static assets used up the default 1000 requests/minute
  in a few page loads. The per-endpoint limit for shares still applies.
- The public page renders through the same SPA. A 404 there with a valid
  share row usually means the team setting for public sharing is off
  (`teams.sharing`).
