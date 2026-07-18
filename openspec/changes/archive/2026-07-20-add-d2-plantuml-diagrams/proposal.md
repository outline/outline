## Why

Outline renders Mermaid diagrams inline from code fences, but has no equivalent for D2 or PlantUML — two widely-used diagram-as-code languages. PlantUML currently only works as a URL embed (pasting a plantuml.com link), and D2 has no support at all. Adding inline rendering for both completes the diagram story and aligns with user expectations from other knowledge tools.

Additionally, some teams prefer server-side Mermaid rendering for consistency (avoiding client-side rendering differences) or to reduce the client bundle size. Kroki supports Mermaid, so the same integration can optionally handle all three languages.

## What Changes

- Add `d2` and `plantuml`/`puml` as recognized diagram languages in code fences
- When a Kroki integration is configured (via Settings → Integrations), render D2 and PlantUML code fences as live SVG diagrams using the configured Kroki service URL
- When the integration is NOT configured, D2 and PlantUML code fences display as plain code blocks (standard code display) — no diagram rendering occurs
- Add a "Render Mermaid via Kroki" toggle in the Kroki integration settings; when enabled, Mermaid code fences are rendered via Kroki instead of the client-side mermaid.js library
- Introduce a Kroki-based rendering client that encodes diagram source and fetches SVG from the configured service URL
- Add a ProseMirror plugin (modeled on the existing Mermaid plugin) that renders diagrams as widget decorations below code blocks
- Add block menu entries for inserting D2 and PlantUML diagrams (only visible when integration is configured)
- Add a "Kroki" integration plugin under Settings → Integrations (same pattern as Diagrams.net) with a configurable service URL field and Mermaid toggle
- No CSP changes needed — existing `connect-src: *` policy already permits fetch to any origin

## Capabilities

### New Capabilities
- `diagram-service-rendering`: Client-side rendering of D2 and PlantUML code fences via an external Kroki service, gated behind integration configuration. When unconfigured, code fences display as standard code blocks. Optionally routes Mermaid rendering through Kroki as well.

### Modified Capabilities

## Impact

- `shared/editor/` — new plugin, client library, language detection helpers; conditional Mermaid routing
- `plugins/` — new `kroki` plugin (Settings UI, same pattern as `plugins/diagrams/`)
- `shared/types.ts` — new `IntegrationService.Kroki` enum value
- `app/editor/menus/` — block menu and code toolbar updates (conditional on integration)
- `shared/editor/extensions/Mermaid.ts` — must check for Kroki-Mermaid setting and defer to DiagramService plugin when enabled
- CSP: no changes needed (`connect-src: *` already set)
- `public/images/` — D2 and Kroki icon assets
- Dependencies: none new (`pako` already present)
