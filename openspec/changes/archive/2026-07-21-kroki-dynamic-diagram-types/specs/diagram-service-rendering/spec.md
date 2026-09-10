## MODIFIED Requirements

### Requirement: Kroki integration is configurable via Settings
The system SHALL provide a "Kroki" entry under Settings → Integrations that allows an admin to configure a Kroki service URL and a "Render Mermaid via Kroki" toggle. On save, the system fetches `GET {url}/health` to discover supported formats and stores all formats with `status: "pass"` as `enabledFormats`. The integration stores these as `settings.kroki.url` and `settings.kroki.enabledFormats` (an array of format identifiers).

#### Scenario: Admin saves Kroki configuration
- **WHEN** an admin navigates to Settings → Integrations → Kroki, enters a URL, and clicks save
- **THEN** the system fetches `GET {url}/health`, extracts all formats with `status: "pass"`, stores them as `enabledFormats`, and rendering becomes active for those formats

#### Scenario: Health endpoint unreachable on save
- **WHEN** the health endpoint cannot be reached during save
- **THEN** the system displays an error message and the previously saved settings remain unchanged

#### Scenario: Health endpoint returns empty body
- **WHEN** the Kroki service returns HTTP 200 but an empty response body
- **THEN** the system displays the error "Empty response from diagram service"

#### Scenario: Mermaid toggle enabled
- **WHEN** an admin enables the "Render Mermaid via Kroki" toggle and saves
- **THEN** "mermaid" is included in `enabledFormats` and Mermaid code fences are rendered via the Kroki service instead of the client-side mermaid.js library

#### Scenario: Mermaid toggle disabled
- **WHEN** the "Render Mermaid via Kroki" toggle is off (or Kroki is not configured)
- **THEN** Mermaid code fences are rendered using the client-side mermaid.js library (existing behavior)

#### Scenario: Admin disconnects Kroki integration
- **WHEN** an admin disconnects the Kroki integration
- **THEN** all Kroki-rendered diagram formats revert to plain code blocks and Mermaid reverts to client-side rendering

#### Scenario: Migration from old settings shape
- **WHEN** the integration has the legacy `{ url, mermaid }` settings shape
- **THEN** the system treats it as all known Kroki formats enabled by default, plus `"mermaid"` if the mermaid field was true. The Settings UI writes the new shape on next save.

### Requirement: Any enabled format code fence renders as a diagram
The system SHALL render code fences with any language in `enabledFormats` as SVG diagrams below the code block, using the configured Kroki service URL.

#### Scenario: Enabled format renders successfully
- **WHEN** a format is in `enabledFormats` AND a user creates a code fence with that language and types valid source
- **THEN** the system displays the rendered SVG diagram below the code block after a debounce period

#### Scenario: Enabled format with syntax error
- **WHEN** a format is in `enabledFormats` AND the source contains errors
- **THEN** the system displays the error message from the rendering service below the code block

#### Scenario: Disabled format displays as plain code
- **WHEN** a format is NOT in `enabledFormats` AND a user creates a code fence with that language
- **THEN** the system displays it as a plain code block with no rendered diagram

#### Scenario: Empty enabled format code block
- **WHEN** a format is in `enabledFormats` AND the code fence has no content
- **THEN** the system displays "Empty diagram" placeholder text below the code block

### Requirement: Block menu shows D2 and PlantUML entries
The system SHALL show static block menu entries for "D2 Diagram" and "PlantUML Diagram" when those formats are in `enabledFormats`. Other Kroki formats are usable by typing the language name directly in a code fence.

#### Scenario: Block menu shows D2 and PlantUML
- **WHEN** `enabledFormats` contains "d2" and "plantuml" AND a user opens the block menu
- **THEN** entries for "D2 Diagram" and "PlantUML Diagram" appear

#### Scenario: Other formats usable via code fence
- **WHEN** `enabledFormats` contains formats like "ditaa" or "svgbob"
- **THEN** no block menu entry appears for those formats, but a user can type a code fence with that language and it will render as a diagram

#### Scenario: Block menu excludes mermaid
- **WHEN** "mermaid" is in `enabledFormats`
- **THEN** no additional mermaid block menu entry is shown (the existing Mermaid entry handles it)

### Requirement: Mermaid code fences render via Kroki when mermaid is enabled
The system SHALL render Mermaid code fences via the Kroki service instead of the client-side library when "mermaid" is included in `enabledFormats`. The Mermaid plugin yields to DiagramService when mermaid is in the enabled list.

#### Scenario: Mermaid in enabledFormats
- **WHEN** "mermaid" is in `enabledFormats` AND a user creates a Mermaid code fence
- **THEN** the system renders it via the Kroki service (the Mermaid plugin yields to DiagramService)

#### Scenario: Mermaid not in enabledFormats
- **WHEN** "mermaid" is not in `enabledFormats` AND a user creates a Mermaid code fence
- **THEN** the system renders it using the client-side mermaid.js library
