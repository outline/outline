## Why

The current Kroki integration hardcodes support for D2 and PlantUML only. Kroki supports 20+ diagram languages, and different self-hosted instances may have different backends enabled. Rather than manually adding each language, the integration should dynamically discover supported formats from the configured Kroki server and let the admin choose which to enable.

## What Changes

- The Kroki Settings UI fetches `GET /health` from the configured server URL to discover available diagram types
- Displays a checkbox list of all supported formats returned by the health endpoint
- All formats are checked by default **except** Mermaid (which Outline handles natively via client-side rendering)
- The Mermaid checkbox (if the server supports it) replaces the current "Render Mermaid via Kroki" toggle — checking it routes Mermaid through Kroki, unchecking it uses client-side rendering
- The integration settings store the list of enabled formats (replacing the hardcoded d2/plantuml assumption)
- The DiagramService plugin dynamically handles any enabled format (not just d2/plantuml)
- The block menu dynamically shows entries for enabled formats
- Code fences with any enabled format's language are rendered via Kroki; disabled formats display as plain code

## Capabilities

### New Capabilities

### Modified Capabilities
- `diagram-service-rendering`: Rendering is no longer limited to D2 and PlantUML. The set of rendered languages is dynamically determined by what the Kroki server supports and which formats the admin has enabled. The Mermaid toggle behavior is preserved but expressed as a checkbox in the unified list.

## Impact

- `plugins/kroki/client/Settings.tsx` — major rewrite: fetch /health, render checkbox list, store enabled formats
- `shared/types.ts` — `IntegrationSettings` kroki shape changes: `{ url: string; enabledFormats: string[]; }` (replaces `mermaid?: boolean`)
- `server/routes/api/integrations/schema.ts` — update validation schema for new settings shape
- `shared/editor/extensions/DiagramService.ts` — detect any enabled format dynamically instead of hardcoded d2/plantuml/mermaid check
- `shared/editor/lib/isCode.ts` — may need dynamic approach rather than individual `isD2`/`isPlantUml` functions
- `shared/editor/lib/code.ts` — dynamic language entries for enabled formats
- `app/editor/menus/block.tsx` — dynamic menu entries for enabled formats
- `shared/editor/nodes/CodeFence.ts` — dynamic code-active decoration check
- `shared/editor/components/Styles.ts` — dynamic CSS or data-attribute approach for hiding code blocks
- `shared/editor/lib/Lightbox.ts` — support any Kroki-rendered format
