# Project B Phase 1: Rename `Document` to `Note` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename every TypeScript-level `Document`-rooted identifier (classes, types, files, variables, properties, comments) to `Note` across `app/` and `shared/`, without touching the wire-protocol contract with `src/mocks/`.

**Architecture:** A 10-group mechanical rename, executed sequentially within one continuous session because renaming a TypeScript symbol requires every reference to update together or the build breaks (no compatibility re-export shims — forbidden by project convention). Implementation happens across all 10 groups first (each group reviewed in isolation for quality), then ONE commit at the very end once `tsc --noEmit` and `oxlint` are both clean across the whole change. This differs from Project A's per-task-commit pattern; see "Commit Strategy" below.

**Tech Stack:** TypeScript, React, MobX, `git mv` for file renames (preserves history over copy+delete).

## Global Constraints

- Scope: `app/` and `shared/` only. `Collection`, route paths (`/doc/:id` etc.), `src/mocks/`, and `plugins/*/server/` (orphaned dead code, doesn't compile on this branch) are explicitly out of scope — later phases or intentionally excluded.
- Naming: `Document`→`Note`, `Documents`→`Notes`, `DocumentsStore`→`NotesStore`, and the same root-word swap for every camelCase/PascalCase derivative (`documentId`→`noteId`, `isDocument`→`isNote`, `DocumentEvent`→`NoteEvent`, `activeDocumentId`→`activeNoteId`, etc.).
- File renames use `git mv`, not delete+recreate, to preserve `git blame`/history. `Document.ts`→`Note.ts`, `DocumentsStore.ts`→`NotesStore.ts`, and the whole `app/scenes/Document/` directory→`app/scenes/Note/`.
- Prose comments describing "a document" as a concept get rewritten to describe "a note" — a leftover comment saying "document" after this phase is a documentation bug.
- `window.document` (the browser's global DOM object) is never touched — it's lowercase and a completely different binding from the capitalized `Document` class/type. Searches in this plan use case-sensitive `\bDocument\b`, which never matches `window.document`.

### CRITICAL — wire-protocol exclusion rule (read before touching any file)

`app/` talks to `src/mocks/apiMock.ts` (an out-of-scope, Phase-4 mock backend) over a JSON wire protocol. Some strings and property keys that contain "document" are not TypeScript symbols the compiler tracks — they're the literal wire contract. **Do not rename these; they must stay exactly as they are today:**

1. **`static modelName = "Document"`** in `app/models/Document.ts`. This exact string is read by `app/stores/base/Store.ts:94` — `this.apiEndpoint = pluralize(lowerFirst(model.modelName));` — to auto-derive the API endpoint (`"documents"`). If this string changes to `"Note"`, every generic CRUD call (create/update/delete/info) silently starts hitting `/notes.*` endpoints that `apiMock.ts` has no handler for. TypeScript will NOT catch this (the field is typed as plain `string`) — it fails silently at runtime. **Rename the class itself (`class Document` → `class Note`), but leave the string value `"Document"` inside `static modelName = "Document";` unchanged.**
2. **RPC action-name string literals** passed to `client.post()`/`client.get()`, e.g. `"/documents.list"`, `"/documents.search"`, `"/documents.move"` in `app/stores/DocumentsStore.ts`. `src/mocks/apiMock.ts` matches these with a literal `switch`/`case` — e.g. `case "documents.list":`. Leave every one of these string literals exactly as-is.
3. **JSON response envelope keys** read off parsed API responses, e.g. `res.data.document`, `res.data.documents` in `app/stores/DocumentsStore.ts`. `apiMock.ts` returns `{ data: { document: presentDocument(doc) } }` — the key `document` is part of the wire contract. Leave these property accesses as `.document`/`.documents`.
4. **Request payload keys**, whether explicit (`{ documentId: someVar }`) or shorthand (`{ documentId }`) inside a `client.post()`/`client.get()` call. If you rename the local variable `documentId` to `noteId` but the object is a wire payload, keep the payload KEY as `documentId` — write `{ documentId: noteId }`, not `{ noteId }`. `apiMock.ts` reads `body.documentId`; changing the key silently breaks the request.

**How to tell wire-protocol code from safe-to-rename code:** if the string/key would appear literally in an HTTP request or response body — anything passed to or read from `client.post()`/`client.get()`/`res.data`/the object returned by `apiMock.ts` — leave its text alone. Everything else (class names, type names, local variables not used as wire payload keys, non-wire object/Map keys like `this.backlinks.set(documentId, ...)` where `backlinks` is a client-only `Map`, file names, comments) gets renamed per the table above.

If you're genuinely unsure whether a specific occurrence is wire-protocol or safe to rename, stop and report it rather than guessing — say so in your report under "Ambiguous cases," don't silently pick one.

---

## Commit Strategy

Groups 1–9 below are NOT independently committable — `tsc --noEmit` will show errors in every group until every group referencing a renamed symbol has been updated, because they all import from `app/models/Document.ts` and `app/stores/DocumentsStore.ts` (Group 1's targets). The plan is executed as:

1. Implement Group 1 (models) fully, then Group 2 (stores) fully, ... through Group 10, **without running `git commit` after each group**.
2. After each group's implementation, its diff still gets a quality-focused review (does this group's renaming look correct and complete in isolation, reading the diff against the rules above) — just not a "does the whole repo compile" gate, since that's only meaningful once every group is done.
3. After Group 10 is implemented and reviewed, run `tsc --noEmit` and `oxlint` across the whole repo. Fix anything red. Only then make ONE commit covering all 10 groups.

This means the task-reviewer role for Groups 1–9 checks "is this group's rename correct and complete against the rule," not "does `tsc` pass yet" (it won't, until Group 10 is done) — reviewers must be told this explicitly so a red `tsc` mid-sequence isn't mistaken for a defect.

---

## Task 1: `app/models/**` — the model layer (14 files, foundation)

**Files (all contain `\bDocument\b`):**
- `app/models/Document.ts` → rename to `app/models/Note.ts` via `git mv`
- `app/models/Collection.ts` (imports `Document`; only its `Document`-referencing lines change — its own `Collection` identifiers are Phase 2, untouched)
- `app/models/Comment.ts`
- `app/models/Event.ts`
- `app/models/GroupMembership.ts`
- `app/models/Notification.ts`
- `app/models/Pin.ts`
- `app/models/Revision.ts`
- `app/models/Share.ts`
- `app/models/Star.ts`
- `app/models/Subscription.ts`
- `app/models/User.ts`
- `app/models/UserMembership.ts`
- `app/models/View.ts`
- `app/models/base/NavigableModel.ts`

**Interfaces:**
- Produces: `class Note` (default export from `app/models/Note.ts`, formerly `class Document` from `app/models/Document.ts`), keeping `static modelName = "Document";` UNCHANGED per the wire-protocol rule above. Every other file in this plan that imports `Document` from `~/models/Document` must import `Note` from `~/models/Note` instead.

- [ ] **Step 1: Rename the file**

```bash
git mv app/models/Document.ts app/models/Note.ts
```

- [ ] **Step 2: Rename the class and its internal identifiers in `app/models/Note.ts`, preserving the wire-protocol exception**

Read the full current file first. Apply these changes:
- `export default class Document extends ArchivableModel implements Searchable {` → `export default class Note extends ArchivableModel implements Searchable {`
- `static modelName = "Document";` → **leave completely unchanged** (this is the wire-protocol exception — the class is renamed, this one string literal is not).
- `constructor(fields: Record<string, unknown>, store: DocumentsStore) {` → `constructor(fields: Record<string, unknown>, store: NotesStore) {` (the store class itself is renamed in Task 2 — this file's import of it must match: `import type DocumentsStore from "~/stores/DocumentsStore";` → `import type NotesStore from "~/stores/NotesStore";`, and the type is imported from the new file path even though Task 2 hasn't executed the rename in `app/stores/` yet — that's fine, TypeScript will show a missing-module error until Task 2 completes; this is expected mid-sequence, per the Commit Strategy above).
- `store: DocumentsStore;` (property declaration) → `store: NotesStore;`
- Every other `Document` occurrence as a type annotation, variable name, or property name (e.g. any `documentId`, `isDocument`-style identifiers within this file) → renamed per the root-word-swap rule.
- Prose comments mentioning "document" as a concept (e.g. `/** The original data source of the document, if imported. */`) → rewritten to say "note" (e.g. `/** The original data source of the note, if imported. */`).
- Do NOT rename anything that is a wire-protocol string per the Global Constraints section (grep this file for `client.post`, `client.get`, and check any string literals or object keys near those calls before renaming them).

- [ ] **Step 3: Update `app/models/Collection.ts`'s `Document`-referencing lines only**

Read the file first. It imports and references `Document` (e.g. `import Document from "./Document";` and uses `Document` in type positions for relations). Update:
- `import Document from "./Document";` → `import Note from "./Note";`
- Every usage of `Document` as a type (e.g. `documents: Document[]`) → `Note` (e.g. `notes: Note[]`), including the variable/property name if it's root-worded `document` (not wire-protocol — this is a class-side relation property, not a JSON payload key; confirm by checking it isn't inside a `client.post`/`client.get` call or `res.data` access before renaming).
- Do NOT touch this file's own `Collection`-rooted identifiers — that's Phase 2.

- [ ] **Step 4: Update the remaining 12 files in this group**

For each of `Comment.ts`, `Event.ts`, `GroupMembership.ts`, `Notification.ts`, `Pin.ts`, `Revision.ts`, `Share.ts`, `Star.ts`, `Subscription.ts`, `User.ts`, `UserMembership.ts`, `View.ts`, `base/NavigableModel.ts`:
- Read the file first.
- Update every import of `Document` from `~/models/Document` (or a relative path to the same file) to import `Note` from `~/models/Note`.
- Rename every `Document`-rooted type annotation, variable, and property name per the root-word-swap rule, EXCEPT any that are wire-protocol payload/response keys (check each against a `client.post`/`client.get`/`res.data` call site before renaming).
- Rewrite prose comments mentioning "document" as a concept.

- [ ] **Step 5: Grep-verify no stray capitalized `Document` symbol references remain in this group's files (wire-protocol strings excepted)**

Run: `grep -n '\bDocument\b' app/models/Note.ts app/models/Collection.ts app/models/Comment.ts app/models/Event.ts app/models/GroupMembership.ts app/models/Notification.ts app/models/Pin.ts app/models/Revision.ts app/models/Share.ts app/models/Star.ts app/models/Subscription.ts app/models/User.ts app/models/UserMembership.ts app/models/View.ts app/models/base/NavigableModel.ts`

Expected: the only match should be the single line `static modelName = "Document";` in `app/models/Note.ts`. Any other match is either a missed rename or a wire-protocol string worth double-checking against the exclusion rule.

- [ ] **Step 6: Report, do not commit yet**

Per the Commit Strategy, this group is not committed independently. Write your report (what changed, the grep output from Step 5, any ambiguous cases) and stop — the controller will dispatch Task 2 next, and the final commit happens after Task 10.

---

## Task 2: `app/stores/**` — the store layer (6 files)

**Files:**
- `app/stores/DocumentsStore.ts` → rename to `app/stores/NotesStore.ts` via `git mv`
- `app/stores/CollectionsStore.ts` (only its `Document`-referencing lines; `Collection` identifiers are Phase 2)
- `app/stores/NotificationsStore.ts`
- `app/stores/RootStore.ts`
- `app/stores/SharesStore.ts`
- `app/stores/UiStore.ts`

**Interfaces:**
- Consumes: `Note` (default export) from `~/models/Note`, produced by Task 1.
- Produces: `class NotesStore` (default export from `app/stores/NotesStore.ts`). `RootStore.ts`'s property that holds the store instance (e.g. `documents: DocumentsStore`) must be renamed to match (`notes: NotesStore`) — every file elsewhere in the plan that accesses `rootStore.documents` or (via the `useStores()` hook) destructures `{ documents }` needs the equivalent rename in its own task; Task 2 only handles the declaration in `RootStore.ts` itself.

- [ ] **Step 1: Rename the file**

```bash
git mv app/stores/DocumentsStore.ts app/stores/NotesStore.ts
```

- [ ] **Step 2: Rename the class and apply the wire-protocol exclusion rule in `app/stores/NotesStore.ts`**

Read the full current file first (756 lines). Apply:
- `export default class DocumentsStore extends Store<Document> {` (or similar — confirm exact current signature) → `export default class NotesStore extends Store<Note> {`
- Import of the model: `import Document from "~/models/Document";` → `import Note from "~/models/Note";`
- Every method name, parameter, and local variable rooted in `document`/`Document` → renamed, EXCEPT:
  - Every RPC action-name string literal passed to `client.post()` (`"/documents.list"`, `"/documents.search"`, `"/documents.move"`, `"/documents.duplicate"`, `"/documents.archive"`, `"/documents.restore"`, `"/documents.unpublish"`, `"/documents.empty_trash"`, `"/documents.search_titles"`, `"/relationships.list"`'s `{ documentId }` payload, and every other `"/documents.*"` string in this file) — **leave every one of these exactly as-is**, per the wire-protocol rule.
  - Every `res.data.document` / `res.data.documents` property access — **leave as-is**.
  - Any `{ documentId }` or `{ documentId: x }` object literal that is the argument to a `client.post()`/`client.get()` call — the KEY stays `documentId` even if the local variable it's assigned from is renamed to `noteId` (write `{ documentId: noteId }`).
  - Non-wire usages are safe to rename freely — e.g. `getBacklinkedDocuments(documentId: string): Document[]` → `getBacklinkedNotes(noteId: string): Note[]` (this is a local method operating on an in-memory `Map`, not a wire call).
- Prose comments describing "document" as a concept → rewritten for "note".

- [ ] **Step 3: Update `app/stores/CollectionsStore.ts`'s `Document`-referencing lines only**

Read the file first. Update its import of and references to `Document`/`DocumentsStore` to `Note`/`NotesStore`. Leave its own `Collection`-rooted identifiers untouched (Phase 2).

- [ ] **Step 4: Update `NotificationsStore.ts`, `RootStore.ts`, `SharesStore.ts`, `UiStore.ts`**

For each file:
- Read it first.
- Update imports of `Document`/`DocumentsStore` to `Note`/`NotesStore`.
- In `RootStore.ts` specifically: find the property that instantiates/holds the documents store (commonly a property like `documents: DocumentsStore;` alongside `this.documents = new DocumentsStore(...)`) and rename both the property name and the type to `notes: NotesStore` / `this.notes = new NotesStore(...)`. This property name is what every consumer elsewhere in the app uses via `useStores()` — later tasks depend on it being exactly `notes`.
- Apply the same wire-protocol exclusion rule as Task 1/Step 2 to any wire-facing code in these files.

- [ ] **Step 5: Grep-verify**

Run: `grep -n '\bDocument\b' app/stores/NotesStore.ts app/stores/CollectionsStore.ts app/stores/NotificationsStore.ts app/stores/RootStore.ts app/stores/SharesStore.ts app/stores/UiStore.ts`

Expected matches: only wire-protocol strings identified above (RPC action names, `res.data.document(s)`, wire payload keys) and the `modelName` reference chain if any of these files reads `Note.modelName` for display purposes (check case-by-case — if a file reads `.modelName` to show a generic label like "Cannot create {modelName}", that's fine to leave since it reflects the same wire-facing `"Document"` string Task 1 preserved).

- [ ] **Step 6: Report, do not commit**

Write your report; stop for Task 3.

---

## Task 3: `app/scenes/Document/**` → `app/scenes/Note/**` (25 files, the editor scene)

**Files:** every file under `app/scenes/Document/` (17 in the top level, 4 under `components/History`, 2 under `hooks`, 2 under `components/Comments` — confirm exact current list with `find app/scenes/Document -type f` before starting, since this is the largest single group and the most likely to have shifted slightly).

**Interfaces:**
- Consumes: `Note` from `~/models/Note` (Task 1), `notes` property on the root store (Task 2).
- Produces: the renamed scene directory `app/scenes/Note/`, which `app/routes/scenes.ts` and `app/routes/authenticated.tsx` (Task 10) import from — those files are not part of this task, but Task 10 depends on this task's new path being correct.

- [ ] **Step 1: Rename the directory**

```bash
git mv app/scenes/Document app/scenes/Note
```

`git mv` on a directory moves every file inside it while preserving history for each.

- [ ] **Step 2: Enumerate the moved files and update each one**

Run: `find app/scenes/Note -type f -name "*.ts" -o -type f -name "*.tsx"` to get the exact current list.

For each file:
- Read it first.
- Update every import path that referenced the old `~/scenes/Document/...` location to `~/scenes/Note/...`.
- Update every import of `Document`/`DocumentsStore` to `Note`/`NotesStore`.
- Rename every `Document`-rooted identifier (component names like `DocumentTitle` → `NoteTitle`, prop names, local variables, hook names) per the root-word-swap rule.
- Apply the wire-protocol exclusion rule to anything touching `client.post`/`client.get`/`res.data` (this scene likely has direct API calls for autosave, publish, etc. — check each one).
- Rewrite prose comments describing "document" as a concept.
- If a file itself is named with a `Document`-root (e.g. `DocumentTitle.tsx`, `useDocumentSave.ts`), rename the file too via `git mv`, and update every other file's import path that points to it (cross-reference within this same task, since these files reference each other heavily — e.g. `Document.tsx` likely imports `DocumentTitle.tsx`, `Header.tsx` likely imports hooks from `hooks/useDocumentSave.ts`).

- [ ] **Step 3: Grep-verify within the renamed directory**

Run: `grep -rn '\bDocument\b' app/scenes/Note/`

Expected: only wire-protocol strings (API calls this scene makes directly for save/publish/autosave — verify each against the exclusion rule) and no missed renames.

- [ ] **Step 4: Report, do not commit**

Note in your report the exact final file list (in case it differed from the 25-file estimate) so Task 10 (which updates route imports pointing at this directory) has accurate information.

---

## Task 4: `app/components/**` general components (18 files)

**Files:** run `grep -rlE "\bDocument\b" app/components/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "app/components/Sidebar\|app/components/Sharing"` to get the exact current 18-file list (Sidebar and Sharing subdirectories are handled separately in Tasks 5 and 7 — exclude them here to avoid double-processing).

**Interfaces:**
- Consumes: `Note` from `~/models/Note`, `notes` store property, and (for any component that renders scene content) exports from `~/scenes/Note/` (Task 3).

- [ ] **Step 1: Read and update each file**

For each file in the list from the command above:
- Read it first.
- Update imports of `Document`/`DocumentsStore` to `Note`/`NotesStore`, and any import paths pointing at the old `~/scenes/Document/` location to `~/scenes/Note/`.
- Rename `Document`-rooted component/prop/variable names per the root-word-swap rule.
- Apply the wire-protocol exclusion rule to any direct API calls.
- Rewrite prose comments.

- [ ] **Step 2: Grep-verify**

Run: `grep -rn '\bDocument\b' app/components/ --include="*.ts" --include="*.tsx" | grep -v "app/components/Sidebar\|app/components/Sharing"`

Expected: only wire-protocol exceptions.

- [ ] **Step 3: Report, do not commit**

---

## Task 5: `app/components/Sidebar/**` (11 files)

**Files:** `grep -rlE "\bDocument\b" app/components/Sidebar/ --include="*.ts" --include="*.tsx" 2>/dev/null` (9 in `components/`, 2 in `hooks/` per the spec's directory count — confirm exact list before starting).

**Interfaces:**
- Consumes: `Note` from `~/models/Note`, `notes` store property.

- [ ] **Step 1: Read and update each file**

Same treatment as Task 4: update imports, rename identifiers, apply the wire-protocol exclusion rule, rewrite comments. Note that this directory was already touched by Project A (the sidebar restructure and "Collections"→"Notebooks" label) — those are UI-text (`t()` string) changes, already committed, and are NOT what this task touches. This task only renames TypeScript identifiers; do not revisit or second-guess Project A's text changes.

- [ ] **Step 2: Grep-verify**

Run: `grep -rn '\bDocument\b' app/components/Sidebar/`

- [ ] **Step 3: Report, do not commit**

---

## Task 6: `app/menus/**` + `app/hooks/**` (10 files)

**Files:** `grep -rlE "\bDocument\b" app/menus/ app/hooks/ --include="*.ts" --include="*.tsx" 2>/dev/null` (5 + 5 per the spec's count).

Note: `app/menus/NewDocumentMenu.tsx` is in this group. Project A already renamed its user-visible strings (`t("New document")`→`t("New note")`, `t("New doc")`→`t("New note")`) — those `t()` calls are untouched here. This task renames the FILE (`NewDocumentMenu.tsx`→`NewNoteMenu.tsx` via `git mv`) and any TypeScript identifiers (component name, imports), not the already-migrated UI strings.

- [ ] **Step 1: Read and update each file, renaming files where the name is `Document`-rooted**

Same treatment as Task 4/5.

- [ ] **Step 2: Grep-verify**

Run: `grep -rn '\bDocument\b' app/menus/ app/hooks/`

- [ ] **Step 3: Report, do not commit**

---

## Task 7: `app/components/Sharing/**` (5 files)

**Files:** `grep -rlE "\bDocument\b" app/components/Sharing/ --include="*.ts" --include="*.tsx" 2>/dev/null` (includes the `Sharing/Document/` subdirectory, 4 files per the spec's count, plus 1 in `Sharing/components/`).

- [ ] **Step 1: Read and update each file**

If `app/components/Sharing/Document/` is itself a directory (not just files with `Document` in the name), rename it via `git mv` to `app/components/Sharing/Note/` and update every import path pointing at it, in this same task.

- [ ] **Step 2: Grep-verify**

Run: `grep -rn '\bDocument\b' app/components/Sharing/`

- [ ] **Step 3: Report, do not commit**

---

## Task 8: Remaining scattered scenes (~8 files)

**Files:** `grep -rlE "\bDocument\b" app/scenes/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "app/scenes/Note"` — this covers `Shared`, `Search`, `Collection` (only `Document`-referencing lines — its `Collection` identifiers stay untouched), `Settings`, `Errors`, `Developer`, and any top-level `app/scenes/*.ts(x)` files.

- [ ] **Step 1: Read and update each file**

Same treatment as prior tasks. In `app/scenes/Collection/**` specifically, only touch lines referencing `Document`; its own `Collection`/`Notebook` identifiers are Phase 2 and must not change here.

- [ ] **Step 2: Grep-verify**

Run: `grep -rln '\bDocument\b' app/scenes/ | grep -v "app/scenes/Note"`

- [ ] **Step 3: Report, do not commit**

---

## Task 9: `shared/**` (6 files)

**Files:** `shared/collaboration/CloseEvents.ts`, `shared/types.ts`, `shared/utils/browser.ts`, `shared/utils/naturalSort.test.ts`, `shared/editor/nodes/Mention.tsx`, `shared/editor/plugins/TableLayoutPlugin.ts`.

**Interfaces:**
- Produces: any shared types renamed here (e.g. in `shared/types.ts`) are consumed across the whole `app/` — if this task finds a `Document`-rooted type in `shared/types.ts` that earlier tasks (1-8) already imported and used under its old name, note this explicitly in the report; it likely means an earlier task needs a follow-up pass. Investigate `shared/types.ts` FIRST in this task, before the other 5 files, specifically to check for this ordering risk.

- [ ] **Step 1: Investigate `shared/types.ts` for `Document`-rooted types that earlier tasks may already depend on**

Read the file. If it exports a type like `DocumentEvent` or similar that Tasks 1-8 already imported (under the assumption it would be renamed), cross-check by grepping the already-modified files: `grep -rn "DocumentEvent" app/` (substitute the actual type name found). Rename the type here, and if any earlier task's files still reference the old name, fix those references now as part of this task (name the specific files you touched beyond this group's own 6 in your report).

- [ ] **Step 2: Update `shared/collaboration/CloseEvents.ts`**

This file's only `Document` reference (confirmed during planning research) is the string literal `reason: "Document Too Large"` — an error-reason enum value shown to users, not a wire-protocol key read by `apiMock.ts`'s `switch` statement. Rename it: `reason: "Note Too Large"`.

- [ ] **Step 3: Update `shared/utils/browser.ts`, `shared/utils/naturalSort.test.ts`, `shared/editor/nodes/Mention.tsx`, `shared/editor/plugins/TableLayoutPlugin.ts`**

Read each file first. Apply the standard rename + wire-protocol exclusion + comment rewrite treatment.

- [ ] **Step 4: Grep-verify**

Run: `grep -rn '\bDocument\b' shared/`

- [ ] **Step 5: Report, do not commit**

---

## Task 10: Remaining singles (~10 files) + final compile verification

**Files:** `app/editor/**`, `app/routes/**` (2 files — this is where `app/scenes/Note/` from Task 3 gets wired into routing), `app/actions/**` (excluding `app/actions/definitions/documents.tsx`, which stays untouched per Project A's established exclusion — it backs the command palette and is intentionally out of scope for both Project A and this phase), `DocumentExplorer`, `CommandBar`, `HoverPreview`, `Notifications`, `Template`, `TemplatizeDialog`, `Export` components.

Confirm the exact current list with: `grep -rlE "\bDocument\b" app/ shared/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "\.test\.\|app/models\|app/stores\|app/scenes/Note\|app/scenes/Shared\|app/scenes/Search\|app/scenes/Collection\|app/scenes/Settings\|app/scenes/Errors\|app/scenes/Developer\|app/components/Sidebar\|app/components/Sharing\|app/menus\|app/hooks\|shared/"` — this is everything not already covered by Tasks 1-9.

**Interfaces:**
- Consumes: `app/scenes/Note/` (Task 3), `Note`/`NotesStore` (Tasks 1-2).

- [ ] **Step 1: Read and update each remaining file**

Standard treatment. In `app/routes/**` specifically: update any `import ... from "~/scenes/Document"` (or similar) to `~/scenes/Note`, and any route component references.

Explicitly confirm `app/actions/definitions/documents.tsx` is NOT in your file list — if it appears, stop and report it as a conflict with the established exclusion rather than editing it.

- [ ] **Step 2: Grep-verify this group**

Run: `grep -rn '\bDocument\b' <the file list from this task>`

- [ ] **Step 3: Full-repo grep sweep**

Run: `grep -rlE "\bDocument\b" app/ shared/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "\.test\."`

Expected: zero files, OR only files where every remaining match is a confirmed wire-protocol exception (list them explicitly in your report with file:line and which exclusion rule applies to each).

- [ ] **Step 4: Full TypeScript compile check**

Run: `./node_modules/.bin/tsc --noEmit -p . 2>&1 | grep -v "plugins/azure\|plugins/discord\|plugins/email\|plugins/gitlab\|plugins/slab\|plugins/google\|plugins/linear\|plugins/oidc\|plugins/passkeys\|plugins/search-postgres\|plugins/storage\|plugins/notion\|plugins/iframely\|plugins/github\|plugins/figma\|plugins/slack\|plugins/webhooks"`

(The plugin exclusions filter out this branch's pre-existing, unrelated broken `@server/*` imports — confirmed baseline noise from before this project started, not caused by this change.)

Expected: no output. If there is output, it's a real compile error from this rename — fix it before proceeding. Do not report DONE with a red `tsc`.

- [ ] **Step 5: Full lint check**

Run: `./node_modules/.bin/oxlint app/ shared/`

Expected: exit code 0.

- [ ] **Step 6: The single commit for all 10 groups**

```bash
git add app/ shared/
git status
```

Review the `git status` output — confirm it shows the expected ~128 modified files plus the `git mv` renames (which `git status` shows as `renamed:`), and nothing outside `app/`/`shared/`.

```bash
git commit -m "refactor: rename the Document identifier family to Note

Renames every TypeScript-level Document-rooted class, type, file,
variable, property, and explanatory comment to Note across app/ and
shared/. Wire-protocol strings shared with the mock backend
(modelName, RPC action names, JSON envelope keys) are deliberately
left as \"document\"/\"Document\" until the mock backend itself is
updated in a later phase.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

- [ ] **Step 7: Manual browser verification (report as a concern if not possible in your environment)**

Verify the core note-taking flow still works: open an existing note from a collection, edit its content, confirm autosave/save works, navigate to `/drafts`, `/search`, `/archive`, `/trash`, and confirm each still lists notes correctly. This exercises the exact wire-protocol boundary (Step-by-step exclusions above) most likely to have a subtle bug.

---

## Self-Review Notes (for the controller, not a task)

- Every group's file list should be re-confirmed with a fresh `grep` at the start of its task, not assumed from this plan's counts — the codebase may have shifted slightly between planning and execution, and grep is cheap to re-run.
- The wire-protocol exclusion rule is the single highest-risk part of this plan. Task reviewers for every group must specifically check the group's diff against it, not just check that identifiers were renamed.
- If any task's implementer reports "Ambiguous cases," the controller resolves them before moving to the next task — do not let ambiguity carry forward silently.
