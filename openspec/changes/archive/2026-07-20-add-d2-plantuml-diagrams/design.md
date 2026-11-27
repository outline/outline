## Context

Outline's editor already renders Mermaid diagrams client-side via a ProseMirror plugin that detects `code_fence` nodes with `language: "mermaid"`, renders SVG using the mermaid.js library, and displays results as widget decorations below the code block. It uses sessionStorage caching, theme-aware rendering, and handles edit/preview toggle via keyboard shortcuts.

D2 and PlantUML have no JavaScript rendering libraries — D2 is Go, PlantUML is Java. Both require server-side rendering via an external service (Kroki). Kroki also supports Mermaid rendering, which provides an option for teams who want consistent server-side rendering for all diagram types.

Outline configures integrations via an admin Settings UI backed by the `Integration` model. The Diagrams.net plugin (`plugins/diagrams/`) is the exact precedent: it stores a custom URL via the integrations API, which flows to the editor through `useEmbeds` → `EmbedDescriptor.settings`. This same pattern will be used for Kroki.

**Critical behavior:** If no Kroki integration is configured, D2 and PlantUML code fences MUST render as plain code blocks (same as any unrecognized language), and Mermaid continues to render client-side as it does today. The Kroki rendering functionality is entirely opt-in via admin configuration.

## Goals / Non-Goals

**Goals:**
- Render D2 and PlantUML code fences inline with the same UX as Mermaid — but only when Kroki is configured
- Optionally route Mermaid rendering through Kroki (toggle in settings) for server-side consistency
- Use the existing integration/plugin system (Settings → Integrations) for configuration
- Fall back to plain code block display for D2/PlantUML when unconfigured; fall back to client-side rendering for Mermaid when Kroki-Mermaid is off
- Support light/dark theme switching
- Cache renders to minimize network calls
- Degrade gracefully when the rendering service is unavailable

**Non-Goals:**
- Server-side rendering for PDF/export (future work)
- Interactive diagram editing (Diagrams.net handles that use case)
- Supporting all 20+ Kroki languages (only D2, PlantUML, and optionally Mermaid)
- Syntax highlighting for D2/PlantUML code (no refractor grammars exist; plain text is acceptable)
- Removing the client-side Mermaid library (it remains the default even when Kroki is available)

## Decisions

### 1. Configuration: Integration plugin (not env var)

**Choice:** Configure Kroki via Settings → Integrations (same as Diagrams.net), not an environment variable.

**Alternatives considered:**
- Env var `DIAGRAM_SERVICE_URL` — simpler but requires server restart; not accessible to workspace admins who don't have server access; inconsistent with how Diagrams.net is configured
- Both env var and settings UI — over-engineered; two sources of truth

**Rationale:** Follows the existing pattern established by `plugins/diagrams/`. Admins configure it from the Settings page. The integration record stores:
```json
{
  "kroki": {
    "url": "https://kroki.io",
    "mermaid": false
  }
}
```
If no integration exists, D2/PlantUML are inactive and Mermaid uses client-side rendering.

### 2. Feature gating: No integration = no rendering (D2/PlantUML), client-side rendering (Mermaid)

**Choice:**
- D2/PlantUML: No Kroki integration → plain code blocks. No error, no prompt.
- Mermaid: No Kroki integration OR `settings.kroki.mermaid === false` → existing client-side rendering (unchanged behavior). Only when explicitly enabled does Mermaid route through Kroki.

Block menu entries for D2/PlantUML are hidden when unconfigured. Mermaid always appears (it works without Kroki).

**Rationale:** Safest default. No data sent to external services without explicit admin opt-in. Zero behavioral change for existing Mermaid users unless they actively choose Kroki.

### 3. Mermaid routing: Plugin coordination

**Choice:** When Kroki-Mermaid is enabled, the existing Mermaid plugin skips rendering and the DiagramService plugin handles it instead.

**Implementation:** The Mermaid plugin checks `editor.props.embeds` for a Kroki integration with `settings.kroki.mermaid === true`. If found, it creates no decorations for Mermaid blocks (effectively disabling itself). The DiagramService plugin's `isDiagramService` check expands to include Mermaid nodes when this setting is active.

**Alternatives considered:**
- Remove the Mermaid plugin entirely when Kroki-Mermaid is on — too risky; if Kroki goes down, all Mermaid diagrams break with no fallback
- Run both plugins simultaneously — would render duplicates

**Rationale:** Clean handoff. If Kroki becomes unreachable, admin can disable the toggle and Mermaid immediately works again via client-side rendering. No code is deleted from the Mermaid plugin.

### 4. Rendering service: Kroki

**Choice:** Kroki (https://kroki.io) as the unified rendering backend for D2, PlantUML, and optionally Mermaid.

**Rationale:** One API for all three languages. MIT-licensed. Docker-deployable. Public instance available.

### 5. Architecture: Separate DiagramService plugin

**Choice:** New `DiagramService.ts` plugin handles all Kroki-rendered languages (D2, PlantUML, and optionally Mermaid).

**Rationale:** The Mermaid plugin remains untouched except for a single gating check. All network-based rendering logic lives in one place. Adding future Kroki languages only requires updating `isDiagramService`.

### 6. Encoding: Kroki GET with deflate+base64url

**Choice:** Use Kroki's GET endpoint with deflate-compressed, base64url-encoded diagram source.

**Rationale:** GET allows browser-level caching. `pako` is already a dependency.

### 7. Debounce: 500ms with abort

500ms debounce after last keystroke. AbortController cancels stale requests.

### 8. Theme handling

- D2: `?theme=200` (dark) or no param (light)
- PlantUML: Inject `!theme cyborg-outline` as first line for dark mode
- Mermaid (via Kroki): Encode theme config in source or use Kroki's theme param

### 9. How the service URL reaches the editor

1. Admin configures Kroki URL + Mermaid toggle via Settings → Integrations → Kroki
2. Stored as `Integration` record: `service: "kroki"`, `type: IntegrationType.Embed`, `settings: { kroki: { url: "...", mermaid: true/false } }`
3. `useEmbeds` hook injects settings into embed descriptors
4. Editor receives embeds via props
5. DiagramService plugin reads Kroki settings from `editor.props.embeds`
6. Mermaid plugin reads the same settings to determine whether to yield

## Architecture Fit

The change aligns with Outline's architecture:

- **Plugin system**: `plugins/kroki/` follows the exact pattern of `plugins/diagrams/` — client-only plugin with `plugin.json`, `client/index.tsx` (registers Settings hook via PluginManager), `client/Settings.tsx`, `client/Icon.tsx`. Auto-discovered via `import.meta.glob("../../plugins/*/client/index.{ts,js,tsx,jsx}")`.
- **Integration model**: Uses `IntegrationType.Embed` + `IntegrationService.Kroki`. Settings stored in the `Integration` model. Flows to editor via `useEmbeds` hook → `EmbedDescriptor.settings`.
- **Shared editor code**: `KrokiClient.ts` and `DiagramService.ts` live in `shared/editor/` because the editor is shared between frontend rendering and server-side document processing. The plugin uses ProseMirror's decoration system, same as the existing Mermaid extension.
- **Type safety**: `IntegrationSettings<IntegrationType.Embed>` in `shared/types.ts` needs a `kroki?: { url: string; mermaid?: boolean }` field (same pattern as `diagrams?: { url: string }`).
- **CSP**: No changes needed — `connect-src` is already `["*"]` in `server/middlewares/csp.ts`, so the browser already permits fetch requests to any origin including Kroki.
- **No server-side changes beyond types/schema**: The rendering happens entirely client-side (browser fetches from Kroki). The server only stores the integration config and validates it via the existing integrations API.

## Risks / Trade-offs

- **External service dependency** → Diagrams won't render if Kroki is unreachable. Mitigation: sessionStorage cache; error states; admin can disable Mermaid-via-Kroki to restore client-side rendering instantly.

- **Mermaid rendering differences** → Kroki's Mermaid version may differ from the client-side library, producing slightly different output. Mitigation: document this in the settings UI; admin can compare and choose.

- **Content sent to external service** → Diagram source is transmitted to the configured Kroki URL. Mitigation: entirely opt-in; self-hosted Kroki available; documented in settings description.

- **Feature invisibility** → Users won't see D2/PlantUML options until admin configures Kroki. Mitigation: block menu entries appear once configured; Mermaid always works regardless.
