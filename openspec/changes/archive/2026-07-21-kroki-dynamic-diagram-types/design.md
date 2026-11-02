## Context

The existing Kroki integration (from the `add-d2-plantuml-diagrams` change) hardcodes support for D2 and PlantUML, with a separate toggle for Mermaid. The integration stores `{ url: string; mermaid?: boolean }` and the DiagramService plugin uses `isDiagramService(node)` (which checks for d2/plantuml/puml) plus an optional `isMermaid` check.

Kroki's `GET /health` endpoint returns a JSON object listing all supported diagram backends with their status. This provides the mechanism to dynamically discover and offer all available formats.

## Goals / Non-Goals

**Goals:**
- Dynamically discover supported formats from the Kroki server on save
- Enable all discovered formats automatically (no per-format checkbox UI)
- Handle any enabled format the same way D2/PlantUML are handled today
- Provide a dedicated "Render Mermaid via Kroki" toggle (off = client-side, on = via Kroki)
- Maintain backward compatibility: existing configurations with `{ url, mermaid }` should migrate gracefully

**Non-Goals:**
- Per-format theme configuration (use existing heuristics; fall back to no theme for unknown formats)
- Per-format rendering options beyond enable/disable
- Removing the hardcoded `isD2`/`isPlantUml` helpers (they can remain for test/utility use but are no longer the primary gating mechanism)

## Decisions

### 1. Settings shape: `enabledFormats` array replaces `mermaid` boolean

**New shape:**
```json
{
  "kroki": {
    "url": "https://kroki.io",
    "enabledFormats": ["d2", "plantuml", "blockdiag", "ditaa", "svgbob", ...]
  }
}
```

**Migration:** If the integration has the old shape (`{ url, mermaid }`), treat it as `enabledFormats: ["d2", "plantuml"]` plus `"mermaid"` if `mermaid === true`. The Settings UI writes the new shape on next save.

### 2. Health endpoint fetch: on save

The system fetches `GET {url}/health` when the admin saves the Kroki configuration. This runs in the browser (no server proxy needed — CSP already allows `connect-src: *`). The response's `output` keys become the available format list, and all formats with `status: "pass"` are stored as `enabledFormats`.

If the fetch fails (server unreachable), show an error message and leave the previously saved settings unchanged.

### 3. Default selection: all formats enabled automatically

When the admin saves and the health endpoint returns successfully, all formats with `status: "pass"` are stored as `enabledFormats`. There is no per-format checkbox UI — all discovered formats are enabled. Mermaid inclusion is controlled separately via the dedicated "Render Mermaid via Kroki" toggle.

### 4. DiagramService plugin: dynamic format matching

Instead of `isDiagramService(node)` (hardcoded d2/plantuml), the plugin reads `settings.kroki.enabledFormats` and checks if `node.attrs.language` is in that list. The `isMermaid` special case is preserved: if `"mermaid"` is in `enabledFormats`, mermaid blocks are also handled by DiagramService (and the Mermaid plugin yields).

### 5. Code language registration: dynamic

On editor initialization, if Kroki is configured with `enabledFormats`, register those languages in `codeLanguages` dynamically (adding entries that don't already exist). This ensures they appear with proper labels in the language picker. Languages already in `codeLanguages` (like d2, plantuml) keep their existing entries.

### 6. Block menu: static entries for D2 and PlantUML

The block menu shows static entries for "D2 Diagram" and "PlantUML Diagram" (the most common formats), excluding mermaid (which already has its own entry). Other Kroki formats are usable by typing the language name directly in a code fence.

### 7. CSS: data-attribute approach

Instead of listing every possible language in CSS selectors, use a data attribute set by the DiagramService plugin on code blocks it owns: the existing `code-active` decoration logic checks against the DiagramService plugin state. The CSS selectors already handle `diagram-service-wrapper` generically. For read-only mode, the plugin applies a node decoration with a class that triggers the hide-code CSS.

### 8. Theme handling for unknown formats

For formats other than d2, plantuml, and mermaid, pass the source unmodified (no theme injection). The diagram will render in whatever default theme Kroki uses. This is acceptable — most formats don't have a dark/light theme concept.

## Risks / Trade-offs

- **Health endpoint availability** — If the Kroki server is down when the admin saves, format discovery fails. Mitigation: show an error message and leave previously saved settings unchanged; admin can retry later.
- **Migration** — Old settings shape needs graceful handling. Mitigation: fallback logic in DiagramService and Settings UI; all known Kroki formats enabled by default for legacy configurations.
- **Unknown format rendering** — Some Kroki formats may produce PNG not SVG. Mitigation: request SVG always; if format doesn't support SVG, the error will show in the diagram widget.
- **Empty response** — Kroki may return 200 with an empty body for certain inputs. Mitigation: detect empty body and show "Empty response from diagram service" error.
