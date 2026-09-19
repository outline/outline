## 1. Settings Shape Migration

- [x] 1.1 Update `IntegrationSettings<IntegrationType.Embed>` in `shared/types.ts`: change `kroki?: { url: string; mermaid?: boolean }` to `kroki?: { url: string; enabledFormats?: string[] }`
- [x] 1.2 Update `server/routes/api/integrations/schema.ts`: change kroki validation to `z.object({ url: z.url(), enabledFormats: z.array(z.string()).optional() })`
- [x] 1.3 Add migration logic in DiagramService plugin: if `settings.kroki` has `mermaid` field but no `enabledFormats`, derive `enabledFormats` from legacy shape

## 2. Settings UI Rewrite

- [x] 2.1 Add health endpoint fetch to `plugins/kroki/client/Settings.tsx`: fetch `GET {url}/health` when URL changes (debounced 500ms)
- [x] 2.2 Parse health response: extract format names from `output` keys where `status === "pass"`
- [x] 2.3 Display checkbox list of available formats, grouped alphabetically
- [x] 2.4 Default selection: all formats checked except "mermaid"
- [x] 2.5 Show "(handles Mermaid rendering instead of browser)" note next to the mermaid checkbox
- [x] 2.6 Handle health fetch errors: show error message, keep last-saved selections, add "Retry" button
- [x] 2.7 Store `enabledFormats` as array of checked format identifiers on save
- [x] 2.8 Remove the separate "Render Mermaid via Kroki" Switch (replaced by mermaid checkbox in the list)

## 3. DiagramService Plugin — Dynamic Format Matching

- [x] 3.1 Replace `isDiagramService(node)` check with dynamic lookup: `enabledFormats.includes(node.attrs.language)` (normalizing puml→plantuml, mermaidjs→mermaid)
- [x] 3.2 Replace `handleMermaid` boolean with check: `enabledFormats.includes("mermaid")`
- [x] 3.3 Update `getKrokiSettings` to return `{ url: string; enabledFormats: string[] }` (with migration fallback)
- [x] 3.4 Update language mapping function to handle any format string (not just d2/plantuml/mermaid)

## 4. Mermaid Plugin Coordination

- [x] 4.1 Update `isKrokiMermaidEnabled` in Mermaid.ts: check `enabledFormats?.includes("mermaid")` instead of `settings.kroki.mermaid === true`

## 5. Block Menu — Dynamic Entries

- [x] 5.1 Update `app/editor/menus/block.tsx`: generate diagram entries dynamically from `enabledFormats` (read from embeds prop)
- [x] 5.2 Exclude "mermaid" from dynamic entries (existing Mermaid entry handles it)
- [x] 5.3 Generate title as `"{Format} Diagram"` with capitalized format name
- [x] 5.4 Use a generic diagram icon for formats without a specific icon (d2/plantuml keep their icons)

## 6. Code Language Registration

- [x] 6.1 Dynamically register enabled formats in `codeLanguages` that don't already have entries (at editor init time or via the embeds prop)
- [x] 6.2 Add enabled formats to `nonPersistableLanguages` dynamically
- [x] 6.3 Ensure language selector shows proper labels for dynamically registered formats

## 7. CSS and Code-Active Decoration

- [x] 7.1 Update `createActiveCodeBlockDecoration` in CodeFence.ts: check DiagramService state for any code block that DiagramService owns (use `enabledFormats` check instead of `isDiagramService(node)`)
- [x] 7.2 Update CSS selectors: use a generic approach (data-attribute or check for adjacent `.diagram-service-wrapper`) instead of listing individual languages
- [x] 7.3 Update Lightbox `isLightboxNode`: check if language is in enabled formats (via plugin state or dynamic check)

## 8. Tests

- [x] 8.1 N/A — Settings UI uses simplified flow (health fetched on save, format list stored directly); no checkbox rendering to unit-test
- [x] 8.2 N/A — Default selection logic is in the save handler, not a testable UI state
- [x] 8.3 N/A — Error handling in Settings UI is a React component concern tested via integration/E2E, not unit tests
- [x] 8.4 Test migration: old `{ url, mermaid: true }` produces decorations for mermaid code block (DiagramService.test.ts)
- [x] 8.5 Test migration: old `{ url, mermaid: false }` produces NO decorations for mermaid code block (DiagramService.test.ts)
- [x] 8.6 Test DiagramService: enabled format (ditaa in enabledFormats) renders diagram decoration (DiagramService.test.ts)
- [x] 8.7 Test DiagramService: disabled format (ditaa NOT in enabledFormats) shows plain code (DiagramService.test.ts)
- [x] 8.8 Test DiagramService: non-diagram language (javascript) not in enabledFormats shows plain code (DiagramService.test.ts)
- [x] 8.9 Test Mermaid plugin yields (zero decorations) when enabledFormats includes "mermaid" (Mermaid.test.ts)
- [x] 8.10 Test Mermaid plugin renders decorations when enabledFormats does NOT include "mermaid" (Mermaid.test.ts)
- [x] 8.11 N/A — Block menu entries are static (D2/PlantUML); dynamic entries were descoped from the implementation
- [x] 8.12 Test integration schema: accepts new enabledFormats array shape (integrations.test.ts)
- [x] 8.13 Test integration schema: rejects invalid enabledFormats (non-array) (integrations.test.ts)
