# Pet Store Nav & Terminology Blending (Project A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the sidebar so shop navigation is primary and wiki navigation is a secondary "Notes" group, move the default post-login landing to `/dashboard`, and relabel nav/entry-point copy from wiki vocabulary ("Document", "Collection") to pet-store vocabulary ("Note", "Notebook").

**Architecture:** Pure frontend presentational change — JSX restructuring in `app/components/Sidebar/**`, one redirect target change in `app/scenes/Login/Login.tsx`, and literal string edits (`t("...")` call arguments only) across a small, precisely enumerated set of nav-surface files. No new components, no server/shared/model changes, no automated test files (this codebase's convention: unit tests cover utilities/business logic, not presentational JSX/copy — verification here is `tsc`/`oxlint` plus manual browser checks, matching how prior scene-level UI work in this session was verified).

**Tech Stack:** React, TypeScript, styled-components, react-i18next, react-router-dom, MobX (`mobx-react`'s `observer`) — all pre-existing, no new dependencies.

## Global Constraints

- Frontend-only: do not touch `server/`, `shared/`, migrations, or any data model.
- Do not touch `app/scenes/Document/**` (editor, toolbar, slash-command menu) or settings pages.
- Do not touch `app/actions/definitions/documents.tsx` — its `"New document"` strings back the command palette too, which is out of scope; changing it would leak the rename into a surface this project explicitly excludes.
- Only change the literal English string passed to `t()` calls. Never hand-edit `public/locales/*.json` — translations are auto-extracted from source per project convention.
- No renaming of code identifiers, types, file names, or route paths (that's the separate, deferred "Project B").
- Spec of record: `docs/superpowers/specs/2026-08-11-pet-store-nav-terminology-design.md`.

---

### Task 1: Promote shop navigation, consolidate wiki nav into "Notes"

**Files:**
- Modify: `app/components/Sidebar/components/ShopLinks.tsx`
- Modify: `app/components/Sidebar/App.tsx`

**Interfaces:**
- Consumes: existing `Header` component (`app/components/Sidebar/components/Header.tsx`) — `<Header id={string} title={ReactNode}>{children}</Header>`, already used by `Starred`/`SharedWithMe`/`Collections` internally; nesting one `Header` around components that render their own `Header` is already how this component is designed to be used (children render as siblings of the `<h3>`, not inside it).
- Produces: no new exports — same `ShopLinks` and `AppSidebar` default exports, same props.

- [ ] **Step 1: Remove the "Store" header from `ShopLinks.tsx` so shop links render as flat, unlabeled top-level nav**

Replace the full contents of `app/components/Sidebar/components/ShopLinks.tsx` with:

```tsx
import {
  HomeIcon,
  ArchiveIcon,
  ShapesIcon,
  UserIcon,
  BuildingBlocksIcon,
  TableIcon,
  DocumentIcon,
  BeakerIcon,
  MathIcon,
  StarredIcon,
  SmileyIcon,
  EmailIcon,
  TeamIcon,
  BuildingBlocksIcon as BranchIcon,
  BillingIcon,
  GlobeIcon,
} from "outline-icons";
import { useTranslation } from "react-i18next";
import Relative from "./Relative";
import SidebarLink from "./SidebarLink";
import { canAccessRoute } from "../../../../src/mocks/access";
import { currentRole } from "../../../../src/mocks/shop";
import { BranchSwitcher } from "~/components/BranchSwitcher";

/** Every shop destination, in the order the sidebar lists them. */
const LINKS = [
  { to: "/dashboard", label: "Dashboard", icon: <HomeIcon />, exact: true },
  { to: "/pos", label: "Point of sale", icon: <TableIcon /> },
  { to: "/occupancy", label: "Occupancy", icon: <BuildingBlocksIcon /> },
  { to: "/boardings", label: "Boardings", icon: <ArchiveIcon /> },
  { to: "/orders", label: "Orders", icon: <DocumentIcon /> },
  { to: "/invoices", label: "Invoices", icon: <BillingIcon /> },
  { to: "/returns", label: "Returns", icon: <ArchiveIcon /> },
  { to: "/inventory", label: "Inventory", icon: <BeakerIcon /> },
  { to: "/grooming", label: "Grooming", icon: <SmileyIcon /> },
  { to: "/loyalty", label: "Loyalty", icon: <StarredIcon /> },
  { to: "/whatsapp", label: "WhatsApp", icon: <EmailIcon /> },
  { to: "/accounting", label: "Accounting", icon: <MathIcon /> },
  { to: "/products", label: "Products", icon: <ShapesIcon /> },
  { to: "/customers", label: "Customers", icon: <UserIcon /> },
  { to: "/staff", label: "Staff", icon: <TeamIcon /> },
  { to: "/branches", label: "Branches", icon: <BranchIcon /> },
  { to: "/portal", label: "Portal", icon: <GlobeIcon /> },
];

/**
 * Navigation for the shop pages.
 *
 * This is the sidebar's primary, unlabeled navigation — the pet-store app's
 * main nav, not a section bolted onto the wiki's. Only the destinations
 * this person's role can open are offered, so the sidebar is not a list of
 * doors that turn them away.
 *
 * @returns the rendered sidebar links.
 */
export function ShopLinks() {
  const { t } = useTranslation();
  const role = currentRole();

  const links = LINKS.filter((link) => role && canAccessRoute(role, link.to));

  if (links.length === 0) {
    return null;
  }

  return (
    <Relative>
      <BranchSwitcher />
      {links.map((link) => (
        <SidebarLink
          key={link.to}
          to={link.to}
          icon={link.icon}
          exact={link.exact}
          label={t(link.label)}
        />
      ))}
    </Relative>
  );
}
```

Only change from the current file: the `Header` import and the `<Header id="store" title={t("Store")}>...</Header>` wrapper are gone — `BranchSwitcher` and the links render directly inside `Relative`. The `LINKS` array, role filtering, and empty-state `return null` are untouched.

- [ ] **Step 2: Restructure `App.tsx` — shop links first, "Notes" group second**

In `app/components/Sidebar/App.tsx`, add the `Header` import alongside the other component imports (after the `HistoryNavigation` import, before `ShopLinks`):

```tsx
import HistoryNavigation from "./components/HistoryNavigation";
import { ShopLinks } from "./components/ShopLinks";
```

becomes:

```tsx
import HistoryNavigation from "./components/HistoryNavigation";
import Header from "./components/Header";
import { ShopLinks } from "./components/ShopLinks";
```

Then replace the whole render body from `<Sidebar hidden={!ui.readyToShow}>` through its closing `</Sidebar>` with:

```tsx
  return (
    <Sidebar hidden={!ui.readyToShow}>
      <DragActiveProvider>
        <DragPlaceholder />

        <TeamMenu>
          <SidebarButton
            title={team.name}
            image={<TeamLogo model={team} size={24} alt={t("Logo")} />}
          >
            {isMobile ? null : (
              <Tooltip
                content={t("Toggle sidebar")}
                shortcut={`${metaDisplay}+.`}
              >
                <ToggleButton
                  position="bottom"
                  image={<SidebarIcon />}
                  aria-label={
                    ui.sidebarCollapsed
                      ? t("Expand sidebar")
                      : t("Collapse sidebar")
                  }
                  style={{ paddingInline: 4 }}
                  onClick={() => {
                    ui.toggleCollapsedSidebar();
                    (document.activeElement as HTMLElement)?.blur();
                  }}
                />
              </Tooltip>
            )}
          </SidebarButton>
        </TeamMenu>
        <Scrollable flex shadow ref={scrollRef}>
          <SidebarScrollProvider value={scrollArea}>
            <Section>
              <ShopLinks />
            </Section>
            <Section>
              <Header id="notes" title={t("Notes")}>
                <SidebarLink
                  to={homePath()}
                  icon={<HomeIcon />}
                  exact={false}
                  label={t("Home")}
                  onClickIntent={Scenes.Home.preload}
                />
                <SidebarLink
                  to={searchPath()}
                  icon={<SearchIcon />}
                  label={t("Search")}
                  exact={false}
                  onClick={handleSearchClick}
                  onClickIntent={Scenes.Search.preload}
                />
                {can.createDocument && <DraftsLink />}
                <Starred />
                <SharedWithMe />
                <Collections />
                {can.createDocument && <ArchiveLink />}
                {can.createDocument && <TrashLink />}
                <DismissableSidebarAction
                  id="sidebar-import-hidden"
                  action={navigateToImport}
                />
                <DismissableSidebarAction
                  id="sidebar-invite-hidden"
                  action={inviteUser}
                />
              </Header>
            </Section>
          </SidebarScrollProvider>
        </Scrollable>
      </DragActiveProvider>
      <HistoryNavigation />
    </Sidebar>
  );
```

Finally, remove the now-unused `Overflow` styled-component definition at the bottom of the file:

```tsx
const Overflow = styled.div`
  overflow: hidden;
  flex-shrink: 0;
`;

export default observer(AppSidebar);
```

becomes:

```tsx
export default observer(AppSidebar);
```

Note the behavior change this causes, expected and approved: `Home`, `Search`, and `Drafts` move from an always-visible, non-scrolling area into the collapsible, scrollable "Notes" group — same treatment `Starred`/`Collections`/etc. already had. `ShopLinks` moves out of that non-scrolling area too (it was never safe there — `Overflow` clips with `overflow: hidden` rather than scrolling, and the shop list is ~15 items long).

- [ ] **Step 3: Typecheck and lint the two changed files**

Run: `./node_modules/.bin/tsc --noEmit -p . 2>&1 | grep -E "Sidebar/App|Sidebar/components/ShopLinks"`
Expected: no output (no errors in either file — the project has pre-existing unrelated errors elsewhere, e.g. in `plugins/`, that are not caused by this change and can be ignored)

Run: `./node_modules/.bin/oxlint app/components/Sidebar/App.tsx app/components/Sidebar/components/ShopLinks.tsx`
Expected: exit code 0, no output

- [ ] **Step 4: Verify in the browser**

With the dev server running (`yarn dev`, or reuse an already-running instance), log in and check:
- Sidebar's first items are the shop links (Dashboard, Point of sale, Orders, ...), with no "Store" header above them.
- Below the shop links, a collapsible "Notes" header is present; expanding it shows Home, Search, Drafts, Starred (if any starred items exist), Shared with me (if any), Collections, Archive (if `can.createDocument`), Trash (if `can.createDocument`).
- Clicking each relocated link still navigates to the right page (spot-check Home, Search, one Collection).
- Collapsing "Notes" hides all of the above and the collapsed/expanded state persists across a page reload (this is `usePersistedState` in `Header.tsx` — already existing behavior, just confirm it still works for the new `id="notes"`).
- A role with fewer shop permissions (if there's a way to switch role in this mock setup — check `src/mocks/shop.ts` / `currentRole()`) still only sees the shop links it's allowed, same as before this change.

- [ ] **Step 5: Commit**

```bash
git add app/components/Sidebar/App.tsx app/components/Sidebar/components/ShopLinks.tsx
git commit -m "refactor(sidebar): promote shop nav, group wiki nav under Notes"
```

---

### Task 2: Default post-login landing to `/dashboard`

**Files:**
- Modify: `app/scenes/Login/Login.tsx:149`

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing new — same component, same props, only the final fallback `<Redirect>` target changes.

- [ ] **Step 1: Change the fallback redirect target**

In `app/scenes/Login/Login.tsx`, this block (already the last of four fallbacks — deep-link `postLoginPath`, `rememberLastPath`, and `team.defaultCollectionId` are checked first and are untouched):

```tsx
    return <Redirect to={homePath()} />;
```

becomes:

```tsx
    return <Redirect to="/dashboard" />;
```

If, after this change, `homePath` is no longer referenced anywhere else in `Login.tsx`, remove its import too — check with:

Run: `grep -n "homePath" app/scenes/Login/Login.tsx`
Expected: no matches other than the import line if unused elsewhere in the file — if the import line is the only remaining match, delete it from the `import { ... } from "~/utils/routeHelpers"` statement at the top of the file.

- [ ] **Step 2: Typecheck and lint**

Run: `./node_modules/.bin/tsc --noEmit -p . 2>&1 | grep "Login/Login"`
Expected: no output

Run: `./node_modules/.bin/oxlint app/scenes/Login/Login.tsx`
Expected: exit code 0, no output

- [ ] **Step 3: Verify in the browser**

Log out (or open a private/incognito window against the dev server), then log back in with no deep link, no `lastVisitedPath`, and a team with no `defaultCollectionId` configured (the seeded dev team should already satisfy this — confirm by checking where you land). Expected: you land on `/dashboard`, not `/home`.

Then confirm the three earlier-priority redirects still work as before (unchanged code, but worth a spot check since they sit right above the line you changed):
- If the mock setup has a way to trigger a deep link (`postLoginPath`) or a team with `defaultCollectionId` set, confirm those still take priority over `/dashboard`.

- [ ] **Step 4: Commit**

```bash
git add app/scenes/Login/Login.tsx
git commit -m "feat(login): default post-login landing to the shop dashboard"
```

---

### Task 3: Rename nav & entry-point copy — Document → Note, Collection → Notebook

**Files:**
- Modify: `app/components/Sidebar/components/Collections.tsx:61,65,83`
- Modify: `app/components/Sidebar/components/ArchiveLink.tsx:79`
- Modify: `app/menus/NewDocumentMenu.tsx:22,30`
- Modify: `app/scenes/Home.tsx:58,70,131,146`
- Modify: `app/scenes/Drafts.tsx:89`
- Modify: `app/scenes/Search/Search.tsx:361`
- Modify: `app/scenes/Archive.tsx:20,22`

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing new — every change is a literal string argument to an existing `t()` call. No prop, type, or signature changes anywhere in this task.

- [ ] **Step 1: `Collections.tsx` — sidebar label**

```tsx
        <Header id="collections" title={t("Collections")}>
          <Relative>
            <PaginatedList<Collection>
              options={params}
              aria-label={t("Collections")}
```

becomes:

```tsx
        <Header id="collections" title={t("Notebooks")}>
          <Relative>
            <PaginatedList<Collection>
              options={params}
              aria-label={t("Notebooks")}
```

And:

```tsx
                  <SidebarLink
                    label={
                      <Text type="tertiary" size="small" italic>
                        {t("No collections")}
                      </Text>
                    }
```

becomes:

```tsx
                  <SidebarLink
                    label={
                      <Text type="tertiary" size="small" italic>
                        {t("No notebooks")}
                      </Text>
                    }
```

- [ ] **Step 2: `ArchiveLink.tsx` — archived-notebooks aria-label**

```tsx
              aria-label={t("Archived collections")}
```

becomes:

```tsx
              aria-label={t("Archived notebooks")}
```

- [ ] **Step 3: `NewDocumentMenu.tsx` — create-note affordance**

```tsx
    <Tooltip content={t("New document")} shortcut="n" placement="bottom">
      <Button
        as={Link}
        to={newDocumentPath()}
        icon={<PlusIcon />}
        onPointerEnter={preloadEditor}
        onFocus={preloadEditor}
      >
        {t("New doc")}
      </Button>
    </Tooltip>
```

becomes:

```tsx
    <Tooltip content={t("New note")} shortcut="n" placement="bottom">
      <Button
        as={Link}
        to={newDocumentPath()}
        icon={<PlusIcon />}
        onPointerEnter={preloadEditor}
        onFocus={preloadEditor}
      >
        {t("New note")}
      </Button>
    </Tooltip>
```

- [ ] **Step 4: `Home.tsx` — search label and empty states**

```tsx
        <InputSearchPage source="dashboard" label={t("Search documents")} />
```

becomes:

```tsx
        <InputSearchPage source="dashboard" label={t("Search notes")} />
```

```tsx
      empty={
        <Empty>
          {t("Documents you’ve recently viewed will be here for easy access")}
        </Empty>
      }
```

becomes:

```tsx
      empty={
        <Empty>
          {t("Notes you’ve recently viewed will be here for easy access")}
        </Empty>
      }
```

```tsx
              empty={
                <Empty>
                  {t("Documents with recent activity will appear here")}
                </Empty>
              }
```

becomes:

```tsx
              empty={
                <Empty>
                  {t("Notes with recent activity will appear here")}
                </Empty>
              }
```

Further down in the same file (the "Created by me" tab's empty state):

Run: `grep -n "haven.t created any documents yet" app/scenes/Home.tsx`
Expected: one match, `<Empty>{t("You haven’t created any documents yet")}</Empty>`

Change that line to:

```tsx
                <Empty>{t("You haven’t created any notes yet")}</Empty>
```

- [ ] **Step 5: `Drafts.tsx` — filtered-empty state**

```tsx
            {isFiltered
              ? t("No documents found for your filters.")
              : t("You’ve not got any drafts at the moment.")}
```

becomes:

```tsx
            {isFiltered
              ? t("No notes found for your filters.")
              : t("You’ve not got any drafts at the moment.")}
```

- [ ] **Step 6: `Search.tsx` — no-results state**

```tsx
                    {t("No documents found for your search filters.")}
```

becomes:

```tsx
                    {t("No notes found for your search filters.")}
```

- [ ] **Step 7: `Archive.tsx` — sticky heading and empty state**

```tsx
        heading={<Subheading sticky>{t("Documents")}</Subheading>}
        empty={
          <Empty>{t("The document archive is empty at the moment.")}</Empty>
        }
```

becomes:

```tsx
        heading={<Subheading sticky>{t("Notes")}</Subheading>}
        empty={
          <Empty>{t("The note archive is empty at the moment.")}</Empty>
        }
```

- [ ] **Step 8: Typecheck and lint every file touched in this task**

Run:
```bash
./node_modules/.bin/tsc --noEmit -p . 2>&1 | grep -E \
  "Sidebar/components/Collections|Sidebar/components/ArchiveLink|menus/NewDocumentMenu|scenes/Home\.tsx|scenes/Drafts\.tsx|scenes/Search/Search|scenes/Archive\.tsx"
```
Expected: no output

Run: `./node_modules/.bin/oxlint app/components/Sidebar/components/Collections.tsx app/components/Sidebar/components/ArchiveLink.tsx app/menus/NewDocumentMenu.tsx app/scenes/Home.tsx app/scenes/Drafts.tsx app/scenes/Search/Search.tsx app/scenes/Archive.tsx`
Expected: exit code 0, no output

- [ ] **Step 9: Verify in the browser**

- Sidebar "Notes" group: the "Collections" sub-header now reads "Notebooks"; with zero collections, its empty row reads "No notebooks".
- Expand Archive with at least one archived collection to confirm the list still renders (aria-label changed, not the visible row content).
- On `/home`, the search field placeholder/label reads "Search notes"; the "Recently viewed" empty state (visit with no view history, if reachable) reads "...Notes you've recently viewed...".
- On `/home`, click "New note" (was "New doc") — confirm it still opens a new document exactly as before (only the label changed).
- On `/drafts` with a filter applied that matches nothing, empty state reads "No notes found for your filters."
- On `/search` with a query that matches nothing, empty state reads "No notes found for your search filters."
- On `/archive`, the sticky sub-heading reads "Notes" and, with an empty archive, the empty state reads "The note archive is empty at the moment."
- Open the command palette (Cmd+K / Ctrl+K) and confirm its "New document" entry is **unchanged** — this task must not touch it.

- [ ] **Step 10: Commit**

```bash
git add app/components/Sidebar/components/Collections.tsx \
        app/components/Sidebar/components/ArchiveLink.tsx \
        app/menus/NewDocumentMenu.tsx \
        app/scenes/Home.tsx \
        app/scenes/Drafts.tsx \
        app/scenes/Search/Search.tsx \
        app/scenes/Archive.tsx
git commit -m "feat(nav): rename Document/Collection to Note/Notebook on nav surfaces"
```
