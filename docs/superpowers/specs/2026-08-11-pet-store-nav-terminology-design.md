# Design Spec: Blend Pet Store & Wiki Navigation into One Coherent App (Project A)

## Overview

Outline's wiki chrome (Home, Search, Drafts, Starred, Shared, Collections, Archive, Trash) and the pet-store shop module (Dashboard, POS, Boardings, Grooming, Invoices, Purchase Orders, Staff, Products, Customers, Inventory, Loyalty, WhatsApp, Accounting, Portal) currently coexist as two visually and structurally separate navigation blocks — the shop's own sidebar comment says it is deliberately "kept in its own section so the wiki navigation... is untouched." There are also two disconnected entry points: `/home` (wiki) and `/dashboard` (shop).

This spec covers **Project A only**: restructuring the sidebar IA, changing the default landing route, and relabeling nav/entry-point text so the app reads as one coherent pet-store product. It does **not** cover renaming code identifiers (`Document`, `Collection`, etc.) across `server/`/`shared/`/`app/` — that is a much larger, higher-risk undertaking (touches Sequelize models, migrations, the real-time collaboration engine) and is deferred to a separate future spec ("Project B").

## Goals

- Shop becomes the primary, default experience; the wiki becomes a secondary "Notes" feature — not the other way around, and not two equal-but-separate halves.
- Sidebar reads as one navigation tree, not two stapled together.
- Nav-facing and entry-point text uses pet-store-friendly vocabulary ("Note"/"Notebook") instead of generic wiki terms, without touching the document editor internals.
- Team/store branding stays generic and per-tenant (unchanged — `PageTitle.tsx` already appends `team.name`).

## Non-goals

- No changes to `server/`, `shared/`, database models, migrations, or the collaboration engine.
- No changes inside the document editor itself (`app/scenes/Document/**`), command palette, or slash-menu.
- No visual re-skin / new logo / color system — branding stays generic per-tenant as it already is.
- No renaming of code identifiers (variables, types, file names) — Project B, separate spec.

## Design

### 1. Sidebar IA (`app/components/Sidebar/App.tsx`, `app/components/Sidebar/components/ShopLinks.tsx`)

Current structure (top to bottom): `Section[Home, Search, Drafts]` → `Section[ShopLinks under "Store" header]` → `Section[Starred]` → `Section[SharedWithMe]` → `Section[Collections]` → `Section[ArchiveLink]` → `Section[TrashLink, import/invite actions]`.

New structure:

1. **Shop links** (from `ShopLinks.tsx`), promoted to the top, **no section header** — same unlabeled treatment `Home`/`Search` currently get. Internal ordering and role-based filtering (`canAccessRoute`) unchanged.
2. **One "Notes" section**: a single collapsible `<Header id="notes" title={t("Notes")}>` wrapping, in order: `Home` (wiki) link, `Search` link, `DraftsLink`, `Starred`, `SharedWithMe`, `Collections` (relabeled "Notebooks"), `ArchiveLink`, `TrashLink`, plus the existing import/invite dismissable actions.
   - `Starred`, `SharedWithMe`, and `Collections` already render their own internal `<Header>` (they're collapsible lists of individual items). They nest unchanged inside the outer "Notes" header — no new component needed, just re-parenting existing ones.
3. `BranchSwitcher` (currently rendered inside the "Store" header) moves to sit above the shop links directly, since the header it lived in is going away.

### 2. Routing (`app/scenes/Login/Login.tsx`)

- The root path `/` is handled by a separate router layer (`app/routes/index.tsx`, rendering `Shared` or `Login` depending on auth state) — it's unrelated to the authenticated Home/Dashboard split and is not touched.
- The only place that decides the post-login landing is `Login.tsx:149`: `<Redirect to={homePath()} />` becomes `<Redirect to="/dashboard" />`.
- `homePath()` itself, and its other call sites (the `/home/:tab?` route definition, the legacy `/starred` redirect, `RedirectDocument`'s fallback in `authenticated.tsx`), are untouched — those are internal wiki-navigation concerns, not the default-landing concern, and `homePath()` keeps working as a route reachable from inside the "Notes" section.
- Confirmed safe: `/dashboard` has no entry in `MIN_ROLE_FOR_ROUTE` (`src/mocks/access.ts`), so it's open to every signed-in role — no per-role redirect edge cases to handle.

### 3. Terminology (nav & entry-point surface only)

| Where | Old | New |
|---|---|---|
| Sidebar header (`Collections.tsx`) | "Collections" | "Notebooks" |
| aria-label (`ArchiveLink.tsx`) | "Archived collections" | "Archived notebooks" |
| Primary CTA on `Home`/`Search`/`Drafts`/`Collection` list views | "New document" | "New note" |
| Empty states on those same list views | "No documents..." | "No notes..." |
| Sidebar header (`ShopLinks.tsx`) | "Store" | *(removed — unlabeled, see IA above)* |

Explicitly out of scope: anything inside `app/scenes/Document/**` (editor toolbar, slash-command menu, Prosemirror UI), settings pages, and translation-key variable names that never render literally to the user (e.g. `documentName` as an interpolation placeholder — the rendered string is the item's actual title, not the word "document").

Per project convention, only the literal English strings passed to `t()` change — translation files are auto-extracted, not hand-edited.

### 4. Files touched

- `app/components/Sidebar/App.tsx` — section restructuring, new "Notes" wrapper, `BranchSwitcher` reposition
- `app/components/Sidebar/components/ShopLinks.tsx` — drop "Store" header
- `app/components/Sidebar/components/Collections.tsx` — label → "Notebooks"
- `app/components/Sidebar/components/ArchiveLink.tsx` — aria-label → "Archived notebooks"
- `app/scenes/Login/Login.tsx` — post-login redirect → `/dashboard`
- `app/scenes/Home.tsx`, `Search.tsx`, `Drafts.tsx`, `Archive.tsx`, `Trash.tsx`, `Collection.tsx` — "New document" CTA / empty-state text on list/landing views only (not the editor)

### 5. Risk & testing

- No `server/`/`shared/`/model changes — no migration or backend risk.
- No existing test references `"Store"`, `ShopLinks`, or `homePath()` (confirmed via grep) — low risk of breaking the test suite.
- Role-based route filtering (`canAccessRoute`) is unchanged logic — only the shop links' position in the DOM tree changes, not which links render for which role.
- Verification: `tsc --noEmit` and `oxlint` on touched files; manual browser walkthrough — login lands on `/dashboard`, sidebar shows the new structure, every relocated link still navigates correctly, shop role-based filtering still behaves the same as before the move.

## Follow-up (not this spec)

**Project B**: rename `Document`/`Collection` at the code-identifier level across `server/`, `shared/`, and `app/` — including Sequelize models, migrations, API/RPC surface, and the real-time collaboration engine. Deferred to its own brainstorming session once Project A's vocabulary is settled and shipped.
