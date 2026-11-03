# Workspace setup (first run)

On a self-hosted instance with no teams, `/` shows the **Create workspace**
form instead of a login screen. When the form is submitted, it POSTs
`/api/installation.create`. This creates the team and an admin user, sets the
`accessToken` cookie and redirects to `/home`. This is the only sign-in path
on a verification instance, because no OAuth or SMTP providers are configured.

## Sub-features

- Workspace creation (team row, subdomain from the name)
- Admin user creation (`users.role = 'admin'`)
- Sign-in by session cookie and the redirect to `/home`
- Guard: `installation.create` refuses when a team already exists

## How to get to it (user POV)

Open the instance URL on a brand-new install. The page has the heading
"Create workspace" and the fields "Workspace name", "Admin name" and "Admin
email", plus a "Continue →" button.

## Driving it with drive.mjs

```bash
node $V/scripts/drive.mjs <id> $V/journeys/setup-workspace.mjs [-- team="Acme" name="Ada" email=ada@acme.test]
```

The journey fills the three labelled inputs (`getByLabel`), clicks
`button /Continue/` and waits for `/home` and the sidebar navigation. It then
asserts exactly one `teams ⋈ users` row: `<team>|<email>|admin`.

The proof is `02-signed-in-home.png`: the sidebar shows the workspace name
and the admin. The `db:` log line shows the team and the admin row.
`browser-state.json` now holds the session for later journeys.

## Gotchas

- This runs only once per instance. The journey refuses when `teams` is not
  empty. To repeat it, `down` and `up` a new run.
- The route is not mounted when `URL` is one of the cloud-hosted URLs
  (`env.isCloudHosted`). The skill uses `http://localhost:<port>`, so it is
  always self-hosted.
- These are expected in this journey's logs and are not failures:
  `401 POST /api/auth.info` and a matching console error (the signed-out
  probe before setup), an empty `[pageerror]` from that probe, and
  `302 POST /api/installation.create` (the form redirect).
- To sign in as a second user, you need an invite. Email sign-in is
  disabled in production without SMTP. A multi-user journey must report that
  limit. It must not mint tokens.
