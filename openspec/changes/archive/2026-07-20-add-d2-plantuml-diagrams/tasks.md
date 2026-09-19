## 1. Integration Plugin (Configuration)

- [x] 1.1 Add `Kroki = "kroki"` to `IntegrationService` enum in `shared/types.ts`
- [x] 1.2 Add `Kroki: IntegrationService.Kroki` to `UserCreatableIntegrationService` const and type
- [x] 1.3 Add `kroki?: { url: string; mermaid?: boolean }` to `IntegrationSettings<IntegrationType.Embed>` in `shared/types.ts`
- [x] 1.4 Add Kroki settings schema to `server/routes/api/integrations/schema.ts` (`.or(z.object({ kroki: z.object({ url: z.url(), mermaid: z.boolean().optional() }) }))`)
- [x] 1.5 Create `plugins/kroki/plugin.json` with id, name, description
- [x] 1.6 Create `plugins/kroki/client/index.tsx` — register Settings hook (same pattern as `plugins/diagrams/client/index.tsx`)
- [x] 1.7 Create `plugins/kroki/client/Settings.tsx` — admin UI with URL input field and "Render Mermaid via Kroki" checkbox (pattern: `plugins/diagrams/client/Settings.tsx`)
- [x] 1.8 Create `plugins/kroki/client/Icon.tsx` — Kroki icon component

## 2. Language Infrastructure

- [x] 2.1 Add `isD2`, `isPlantUml`, and `isDiagramService` helpers to `shared/editor/lib/isCode.ts`
- [x] 2.2 Add `d2`, `plantuml`, and `puml` entries to `codeLanguages` in `shared/editor/lib/code.ts`
- [x] 2.3 Add `"d2", "plantuml", "puml"` to `nonPersistableLanguages` in `shared/editor/lib/code.ts`

## 3. Kroki Client

- [x] 3.1 Create `shared/editor/lib/KrokiClient.ts` with deflate+base64url encoding using `pako`
- [x] 3.2 Implement `render(language, source, theme)` method that builds Kroki GET URL and fetches SVG
- [x] 3.3 Implement `sanitizeSvg(svg)` to strip script tags and event handler attributes from response
- [x] 3.4 Add theme handling (D2 query param, PlantUML directive injection, Mermaid theme config)

## 4. ProseMirror Plugin (DiagramService)

- [x] 4.1 Create `shared/editor/extensions/DiagramService.ts` with plugin skeleton (state init, apply, decorations)
- [x] 4.2 Implement diagram detection using `findBlockNodes` + `isDiagramService`; include Mermaid nodes when `settings.kroki.mermaid === true`
- [x] 4.3 Read Kroki settings from `editor.props.embeds` (find entry with `name === "kroki"`); if absent, create no decorations (feature disabled for D2/PlantUML)
- [x] 4.4 Implement async rendering with 500ms debounce and AbortController
- [x] 4.5 Implement sessionStorage cache (keyed by theme+source hash, LRU 20 entries)
- [x] 4.6 Implement loading, error, and empty states as decoration widgets
- [x] 4.7 Implement theme change handling (re-render on theme meta transaction)
- [x] 4.8 Implement edit/preview toggle (Cmd+Enter to edit, Escape to exit, click to select)
- [x] 4.9 Implement lightbox on double-click of rendered diagram

## 5. Mermaid Plugin Coordination

- [x] 5.1 Modify `shared/editor/extensions/Mermaid.ts` to check for Kroki integration with `settings.kroki.mermaid === true` in embeds props
- [x] 5.2 When Kroki-Mermaid is enabled, Mermaid plugin skips creating decorations (yields to DiagramService plugin)
- [x] 5.3 When Kroki-Mermaid is disabled or Kroki is unconfigured, Mermaid plugin operates as today (no change)

## 6. Editor Integration

- [x] 6.1 Register DiagramService plugin where Mermaid plugin is instantiated
- [x] 6.2 Add "D2 Diagram" and "PlantUML Diagram" entries to block menu in `app/editor/menus/block.tsx`, conditionally visible when Kroki integration is configured
- [x] 6.3 Update `app/editor/menus/code.tsx` to show edit button for diagram service blocks (D2, PlantUML, and Mermaid-via-Kroki)

## 7. Assets

- [x] 7.1 Add D2 icon (`public/images/d2.png`) for block menu
- [x] 7.2 Add Kroki icon (`public/images/kroki.png`) for settings page

## 8. Dev Tooling

- [x] 8.1 Add Kroki service to `docker-compose.dev.yml` for local testing
- [x] 8.2 Document Kroki integration setup in dev environment

## 9. Tests — Language Helpers (`shared/editor/lib/isCode.test.ts`)

- [x] 10.1 Test `isD2` returns true for code_fence with `language: "d2"`
- [x] 10.2 Test `isD2` returns false for code_fence with `language: "javascript"`
- [x] 10.3 Test `isD2` returns false for non-code nodes (paragraph)
- [x] 10.4 Test `isPlantUml` returns true for `language: "plantuml"`
- [x] 10.5 Test `isPlantUml` returns true for `language: "puml"`
- [x] 10.6 Test `isPlantUml` returns false for `language: "d2"`
- [x] 10.7 Test `isDiagramService` returns true for d2, plantuml, and puml
- [x] 10.8 Test `isDiagramService` returns false for mermaid, javascript, etc.

## 10. Tests — Code Language Registry (`shared/editor/lib/code.test.ts`)

- [x] 11.1 Test `getLabelForLanguage("d2")` returns "D2"
- [x] 11.2 Test `getLabelForLanguage("plantuml")` returns "PlantUML"
- [x] 11.3 Test `getLabelForLanguage("puml")` returns "PlantUML"
- [x] 11.4 Test `getRefractorLangForLanguage("d2")` returns undefined (no syntax highlighting)
- [x] 11.5 Test `setRecentlyUsedCodeLanguage("d2")` does not persist (nonPersistableLanguages)
- [x] 11.6 Test `setRecentlyUsedCodeLanguage("plantuml")` does not persist
- [x] 11.7 Test `setRecentlyUsedCodeLanguage("puml")` does not persist
- [x] 11.8 Test `getFrequentCodeLanguages` excludes d2, plantuml, puml from persisted data

## 11. Tests — KrokiClient (`shared/editor/lib/KrokiClient.test.ts`)

- [x] 12.1 Test `encode` produces correct deflate+base64url output for known input
- [x] 12.2 Test `encode` handles empty string
- [x] 12.3 Test `encode` handles multi-line diagram source with unicode
- [x] 12.4 Test `buildUrl` returns correct format: `{serviceUrl}/{language}/svg/{encoded}`
- [x] 12.5 Test `buildUrl` for D2 appends `?theme=200` in dark mode
- [x] 12.6 Test `buildUrl` for D2 omits theme param in light mode
- [x] 12.7 Test `buildUrl` for PlantUML prepends `!theme cyborg-outline` to source in dark mode
- [x] 12.8 Test `buildUrl` for PlantUML does not modify source in light mode
- [x] 12.9 Test `buildUrl` for Mermaid with appropriate theme handling
- [x] 12.10 Test `sanitizeSvg` removes `<script>` tags
- [x] 12.11 Test `sanitizeSvg` removes `<script>` with attributes (e.g. `<script type="text/javascript">`)
- [x] 12.12 Test `sanitizeSvg` removes inline event handlers (`onclick`, `onload`, `onerror`, `onmouseover`)
- [x] 12.13 Test `sanitizeSvg` preserves valid SVG content (paths, groups, text)
- [x] 12.14 Test `sanitizeSvg` handles SVG with embedded CDATA
- [x] 12.15 Test `render` calls fetch with correct URL (mock fetch)
- [x] 12.16 Test `render` returns sanitized SVG on success
- [x] 12.17 Test `render` throws on network error
- [x] 12.18 Test `render` throws with error message body on 400 response

## 12. Tests — DiagramService Plugin Regression: No Config (`shared/editor/extensions/DiagramService.test.ts`)

These tests verify that when Kroki is NOT configured, behavior matches current (no rendering, plain code blocks):

- [x] 13.1 Test plugin creates zero decorations for D2 code fence when no Kroki embed in props
- [x] 13.2 Test plugin creates zero decorations for PlantUML code fence when no Kroki embed in props
- [x] 13.3 Test plugin creates zero decorations for Mermaid code fence (always — Mermaid plugin handles it, not DiagramService)
- [x] 13.4 Test plugin creates zero decorations when Kroki embed exists but has no settings (malformed integration)
- [x] 13.5 Test D2 code fence remains editable as plain code when Kroki is unconfigured
- [x] 13.6 Test PlantUML code fence remains editable as plain code when Kroki is unconfigured

## 13. Tests — DiagramService Plugin: Active Rendering (`shared/editor/extensions/DiagramService.test.ts`)

- [x] 14.1 Test plugin creates decoration widget for D2 code fence when Kroki embed has settings with URL
- [x] 14.2 Test plugin creates decoration widget for PlantUML code fence when Kroki is configured
- [x] 14.3 Test plugin creates decoration widget for `puml` code fence when Kroki is configured
- [x] 14.4 Test plugin does NOT create decoration for Mermaid code fence when `settings.kroki.mermaid` is false
- [x] 14.5 Test plugin creates decoration for Mermaid code fence when `settings.kroki.mermaid` is true
- [x] 14.6 Test plugin handles multiple diagram code fences in same document (one D2, one PlantUML)
- [x] 14.7 Test plugin re-renders on document change (text inserted in code fence)
- [x] 14.8 Test plugin re-renders on theme toggle (dark → light)
- [x] 14.9 Test plugin does not re-render when unrelated document change occurs (text in paragraph above)
- [x] 14.10 Test plugin shows "Empty diagram" for empty D2 code fence
- [x] 14.11 Test plugin shows "Empty diagram" for empty PlantUML code fence

## 14. Tests — Mermaid Plugin Regression (`shared/editor/extensions/Mermaid.test.ts`)

These verify existing Mermaid behavior is preserved:

- [x] 15.1 Test Mermaid plugin creates decorations for mermaid code fence when no Kroki integration exists
- [x] 15.2 Test Mermaid plugin creates decorations for mermaidjs code fence when no Kroki integration exists
- [x] 15.3 Test Mermaid plugin creates decorations when Kroki is configured but `settings.kroki.mermaid` is false
- [x] 15.4 Test Mermaid plugin creates decorations when Kroki is configured but `settings.kroki.mermaid` is undefined
- [x] 15.5 Test Mermaid plugin creates ZERO decorations when Kroki is configured with `settings.kroki.mermaid: true` (yields to DiagramService)
- [x] 15.6 Test Mermaid plugin ignores D2 code fences (does not render them regardless of config)
- [x] 15.7 Test Mermaid plugin ignores PlantUML code fences (does not render them regardless of config)

## 15. Tests — Integration Schema Validation (`server/routes/api/integrations/integrations.test.ts`)

- [x] 16.1 Test creating Kroki integration with valid URL succeeds
- [x] 16.2 Test creating Kroki integration with valid URL and `mermaid: true` succeeds
- [x] 16.3 Test creating Kroki integration with valid URL and `mermaid: false` succeeds
- [x] 16.4 Test creating Kroki integration with invalid URL fails validation
- [x] 16.5 Test creating Kroki integration with missing URL fails validation
- [x] 16.6 Test updating existing Kroki integration URL succeeds
- [x] 16.7 Test deleting Kroki integration succeeds and returns empty settings

## 16. Future Work

- [x] 16.1 Investigate other Kroki-supported diagram formats (e.g. structurizr, vega, ditaa, nomnoml, svgbob, bytefield, wavedrom, excalidraw) and assess which are worth adding as recognized code fence languages
