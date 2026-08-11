# Design Spec: Project B, Phase 1 — Rename the `Document` Identifier Family to `Note`

## Overview

Project A (`docs/superpowers/specs/2026-08-11-pet-store-nav-terminology-design.md`) renamed user-visible nav-surface copy from wiki vocabulary to pet-store vocabulary (Document → Note, Collection → Notebook) without touching code identifiers. This spec covers **Project B, Phase 1**: renaming the `Document` identifier family — classes, types, files, variables, properties, and explanatory comments — everywhere it appears in `app/` and `shared/` on the `feature/frontend-only` branch.

This is the first of several planned phases (Project B as a whole). Later, separate phases — not covered by this spec — will handle the `Collection` → `Notebook` identifier family, route paths, `src/mocks/` (the mock backend), and a final cleanup sweep.

## Key Finding That Changes the Risk Picture

`feature/frontend-only` has a commit (`a3ad34f`, "refactor: isolate frontend code and remove backend modules") that deleted the entire `server/` directory from this branch. The real Outline backend — Sequelize models, database migrations, the real-time collaboration (Y.js) engine — only exists on `main`, not here. What replaces it on this branch is `src/mocks/`, a browser-only, localStorage-backed mock system.

Consequence: renaming `Document` on this branch does **not** touch any database migration, any real Sequelize model, or any live collaboration-server logic, because none of those exist in this checkout. The actual blast radius is 128 files in `app/` and `shared/` (confirmed via `grep -rlE "\bDocument\b" app/ shared/ --include="*.ts" --include="*.tsx"`, excluding one `.test.ts` file). `plugins/*/server/` also references `Document` (8 files) but is orphaned dead code — nothing under `app/` or `shared/` imports from it, and it already fails to compile on this branch (missing `@server/*` path target) independent of this project.

## Goals

- Every `Document`-rooted identifier in `app/` and `shared/` — class name, type name, file name, variable/property name, and explanatory prose comment — reads as `Note` instead, consistently.
- The app still compiles (`tsc --noEmit` clean) and lints (`oxlint` clean) at the end.
- No behavior change: this is a rename, not a refactor. Anything that worked before this phase works identically after, just under a new name.

## Non-goals

- `Collection` → `Notebook` (Phase 2, separate spec).
- Route/URL path changes (Phase 3, separate spec) — internal identifiers change in this phase, but path strings like `/doc/:id` are untouched here.
- `src/mocks/` (Phase 4, separate spec) — the mock backend's own field/type names are untouched in this phase, even where they mirror `Document`. (Note: this means Phase 1 may need a thin adapter or accept a temporary naming mismatch at the `app/` ↔ `src/mocks/` boundary — resolved in the plan, see Open Question below.)
- `plugins/*/server/` — orphaned, already-broken dead code, explicitly excluded.
- Any change to `main` or any other branch.

## Design

### Naming convention

| Old | New |
|---|---|
| `Document` (class, type) | `Note` |
| `Documents` (plural) | `Notes` |
| `DocumentsStore` | `NotesStore` |
| Any camelCase identifier with `document`/`Document` as a root word (`documentId`, `isDocument`, `DocumentEvent`, `activeDocumentId`, etc.) | Same pattern, root word swapped (`noteId`, `isNote`, `NoteEvent`, `activeNoteId`) |
| `Document.ts`, `DocumentsStore.ts`, and any other file whose name is root-worded `Document` | `Note.ts`, `NotesStore.ts`, etc. — files renamed via `git mv`, not copy+delete, to preserve history |
| `app/scenes/Document/` (the editor scene's own directory) | `app/scenes/Note/` |
| Prose comments describing "a document..." as a concept | Rewritten to describe "a note..." — a comment that still says "document" after this phase is a documentation bug, not an acceptable leftover |

Explicitly unaffected: the browser's global `document` object (`window.document`, DOM APIs) — this is lowercase and a completely distinct binding from the capitalized `Document` class/type being renamed; grep with `\bDocument\b` (case-sensitive) does not match it, and no task in this phase should touch DOM API usage.

### File groups (task structure for the plan)

Sequential, not independently mergeable — TypeScript requires every reference to a renamed symbol to update together or the build breaks, and this codebase's convention forbids compatibility re-export shims. The groups below are how the *work* is organized (each becomes one or more plan tasks with an implementer + reviewer subagent pair, per the Approach B pattern already validated in Project A), not independently committable slices:

1. `app/models/**` (14 files, includes `app/models/base/*`) — the model classes themselves; foundation everything else depends on.
2. `app/stores/**` (6 files) — `DocumentsStore` and its siblings that reference it.
3. `app/scenes/Document/**` (25 files) — the editor scene itself; becomes `app/scenes/Note/**`.
4. `app/components/**` (18 files, general-purpose components outside Sidebar/Sharing).
5. `app/components/Sidebar/**` (11 files).
6. `app/menus/**` + `app/hooks/**` (10 files).
7. `app/components/Sharing/**` (5 files).
8. Remaining scattered scenes: `Shared`, `Search`, `Collection` (only its `Document`-referencing parts, not its own `Collection` identifiers), `Settings`, `Errors`, `Developer` (~8 files).
9. `shared/**` (6 files: `collaboration/CloseEvents.ts`, `types.ts`, `utils/browser.ts`, `utils/naturalSort.test.ts`, `editor/nodes/Mention.tsx`, `editor/plugins/TableLayoutPlugin.ts`). Confirmed low-risk: the one "collaboration" file's only `Document` reference is the string literal `"Document Too Large"` in an error-reason enum, not live connection logic.
10. Remaining singles: `app/editor/**`, `app/routes/**`, `app/actions/**`, `DocumentExplorer`, `CommandBar`, `HoverPreview`, `Notifications`, `Template`, `TemplatizeDialog`, `Export` (~10 files).

### Commit strategy

Unlike Project A (one commit per independently-reviewable task), groups 1-9 above form a single compilation unit — `tsc --noEmit` will not pass until every reference across all of them is updated, so intermediate commits between groups would be red. The plan will therefore batch implementation across all groups before the first commit, then commit once `tsc --noEmit` and `oxlint` are both clean end-to-end. Per-group review still happens (each group's diff gets its own reviewer pass for quality/completeness before moving to the next group), but the review gate is "does this group's diff look right in isolation," not "does the branch compile right now" — that check only becomes meaningful once all groups are done.

### Open question to resolve in the plan, not this spec

`src/mocks/` (Phase 4, out of scope here) currently shapes its mock API responses to match `app/`'s `Document` model's field names. If Phase 1 renames `app/models/Document.ts`'s fields but `src/mocks/` still returns the old field names, the mock system may break at the `app/` ↔ `src/mocks/` boundary. The plan must either (a) confirm this boundary is loosely-typed enough that no break occurs, or (b) include minimal, surgical adapter changes at just that boundary (not a full Phase 4 sweep) to keep the mock system functioning. This needs investigation during planning, not a decision here.

## Testing

No new tests — this is a mechanical rename, not new logic. Existing tests that reference `Document`-rooted identifiers (1 file: `shared/utils/naturalSort.test.ts`, plus any test files under `app/models/`, `app/stores/`, or `app/scenes/Document/` not yet enumerated) get the same rename treatment as their subject files, since a test file importing a renamed symbol must update to keep compiling. Verification: `tsc --noEmit` clean, `oxlint` clean, then a full manual browser walkthrough of the core note-taking flow (create, open, edit, save) since this phase touches the app's most central code path.

## Risk

Lower than initially assessed at the start of this brainstorm — no real backend, no real migrations, no real collaboration server exist on this branch to break. The residual risk is scale (128 files, two files over 700 lines each) and the atomicity constraint (must land as one coherent, fully-compiling change), not architectural danger.
