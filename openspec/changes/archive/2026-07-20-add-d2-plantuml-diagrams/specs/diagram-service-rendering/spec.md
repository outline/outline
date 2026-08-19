## ADDED Requirements

### Requirement: Kroki integration is configurable via Settings
The system SHALL provide a "Kroki" entry under Settings → Integrations that allows an admin to configure a Kroki service URL and a "Render Mermaid via Kroki" toggle. The integration stores these as `settings.kroki.url` and `settings.kroki.mermaid`.

#### Scenario: Admin configures Kroki URL
- **WHEN** an admin navigates to Settings → Integrations → Kroki and enters a URL (e.g. "https://kroki.io") and saves
- **THEN** the system stores the integration and D2/PlantUML diagram rendering becomes active for all users in the workspace

#### Scenario: Admin enables Mermaid via Kroki
- **WHEN** an admin enables the "Render Mermaid via Kroki" toggle and saves
- **THEN** Mermaid code fences are rendered via the Kroki service instead of the client-side mermaid.js library

#### Scenario: Admin disables Mermaid via Kroki
- **WHEN** an admin disables the "Render Mermaid via Kroki" toggle and saves
- **THEN** Mermaid code fences revert to client-side rendering via the mermaid.js library

#### Scenario: Admin disconnects Kroki integration
- **WHEN** an admin disconnects the Kroki integration
- **THEN** D2/PlantUML diagram rendering is disabled (reverts to plain code blocks) and Mermaid reverts to client-side rendering

### Requirement: D2 code fences render as diagrams when Kroki is configured
The system SHALL render code fences with language `d2` as SVG diagrams below the code block when a Kroki integration is configured.

#### Scenario: D2 diagram renders successfully
- **WHEN** a Kroki integration is configured AND a user creates a code fence with language "d2" and types valid D2 source
- **THEN** the system displays the rendered SVG diagram below the code block after a debounce period

#### Scenario: D2 diagram with syntax error
- **WHEN** a Kroki integration is configured AND a user creates a code fence with language "d2" containing syntax errors
- **THEN** the system displays the error message from the rendering service below the code block

#### Scenario: Empty D2 code block
- **WHEN** a Kroki integration is configured AND a user creates a code fence with language "d2" with no content
- **THEN** the system displays "Empty diagram" placeholder text below the code block

### Requirement: PlantUML code fences render as diagrams when Kroki is configured
The system SHALL render code fences with language `plantuml` or `puml` as SVG diagrams below the code block when a Kroki integration is configured.

#### Scenario: PlantUML diagram renders successfully
- **WHEN** a Kroki integration is configured AND a user creates a code fence with language "plantuml" and types valid PlantUML source
- **THEN** the system displays the rendered SVG diagram below the code block after a debounce period

#### Scenario: PlantUML with puml alias
- **WHEN** a Kroki integration is configured AND a user creates a code fence with language "puml"
- **THEN** the system treats it identically to language "plantuml" and renders the diagram

#### Scenario: PlantUML diagram with syntax error
- **WHEN** a Kroki integration is configured AND a user creates a code fence with language "plantuml" containing invalid source
- **THEN** the system displays the error message from the rendering service below the code block

### Requirement: Mermaid code fences render via Kroki when enabled
The system SHALL render Mermaid code fences via the Kroki service instead of the client-side library when the Kroki integration is configured AND the "Render Mermaid via Kroki" toggle is enabled.

#### Scenario: Mermaid rendered via Kroki
- **WHEN** a Kroki integration is configured with `mermaid: true` AND a user creates a Mermaid code fence
- **THEN** the system renders the diagram via the Kroki service (not client-side mermaid.js)

#### Scenario: Mermaid toggle off — client-side rendering
- **WHEN** a Kroki integration is configured with `mermaid: false` AND a user creates a Mermaid code fence
- **THEN** the system renders the diagram using the client-side mermaid.js library (existing behavior)

#### Scenario: No Kroki integration — Mermaid unchanged
- **WHEN** no Kroki integration is configured AND a user creates a Mermaid code fence
- **THEN** the system renders the diagram using the client-side mermaid.js library (existing behavior)

### Requirement: D2 and PlantUML code fences display as plain code when Kroki is NOT configured
The system SHALL display D2 and PlantUML code fences as standard code blocks (no diagram rendering, no error, no configuration prompt) when no Kroki integration is configured.

#### Scenario: No Kroki integration — D2 code fence
- **WHEN** no Kroki integration is configured AND a user creates a code fence with language "d2"
- **THEN** the system displays it as a plain code block with no rendered diagram

#### Scenario: No Kroki integration — PlantUML code fence
- **WHEN** no Kroki integration is configured AND a user creates a code fence with language "plantuml"
- **THEN** the system displays it as a plain code block with no rendered diagram

### Requirement: Diagrams respond to theme changes
The system SHALL re-render Kroki-rendered diagrams when the application theme switches between light and dark mode.

#### Scenario: Theme toggle re-renders diagrams
- **WHEN** the user switches from light to dark theme (or vice versa)
- **THEN** all visible Kroki-rendered diagrams (D2, PlantUML, and Mermaid if routed via Kroki) re-render with the appropriate theme variant

### Requirement: Diagram rendering is debounced
The system SHALL debounce diagram rendering requests to avoid excessive network calls while the user is actively typing.

#### Scenario: Typing in diagram code fence
- **WHEN** a user is typing in a Kroki-rendered code fence
- **THEN** the system waits 500ms after the last keystroke before sending a render request

#### Scenario: New input cancels pending request
- **WHEN** a render request is in flight and the user modifies the diagram source
- **THEN** the system aborts the in-flight request and starts a new debounce cycle

### Requirement: Rendered diagrams are cached
The system SHALL cache rendered SVG results in sessionStorage to avoid redundant network requests for identical diagram content.

#### Scenario: Cached diagram loads instantly
- **WHEN** a diagram's source and theme match a previously rendered result
- **THEN** the system displays the cached SVG immediately without a network request

#### Scenario: Cache respects theme
- **WHEN** a diagram was cached in light mode and the user switches to dark mode
- **THEN** the system does not use the light-mode cache and re-renders with the dark theme

### Requirement: Diagrams handle network failures gracefully
The system SHALL display a clear error state when the rendering service is unreachable or returns an error.

#### Scenario: Service unreachable
- **WHEN** a render request fails due to network error or timeout
- **THEN** the system displays "Could not reach diagram service" below the code block

#### Scenario: Service returns HTTP error
- **WHEN** the rendering service returns a 4xx or 5xx status
- **THEN** the system displays the error response body (typically a syntax error message) below the code block

### Requirement: Block menu includes D2 and PlantUML entries only when configured
The system SHALL show block menu entries for D2 and PlantUML diagrams only when a Kroki integration is configured.

#### Scenario: Kroki configured — block menu shows entries
- **WHEN** a Kroki integration is configured AND a user opens the block menu (/)
- **THEN** "D2 Diagram" and "PlantUML Diagram" entries are visible and searchable

#### Scenario: Kroki NOT configured — block menu hides entries
- **WHEN** no Kroki integration is configured AND a user opens the block menu (/)
- **THEN** no D2 or PlantUML diagram entries appear in the menu

#### Scenario: Block menu searchable by keywords
- **WHEN** a Kroki integration is configured AND a user types "/diagram" or "/d2" or "/plantuml" or "/uml"
- **THEN** the relevant diagram entries appear in the filtered results

### Requirement: Diagram code blocks support edit/preview toggle
The system SHALL allow users to toggle between editing the diagram source and viewing the rendered preview (same interaction as Mermaid).

#### Scenario: Click on rendered diagram selects code block
- **WHEN** a user clicks on the rendered SVG preview
- **THEN** the code fence is selected as a node selection (showing the preview)

#### Scenario: Enter edit mode
- **WHEN** a user presses Cmd+Enter (or Ctrl+Enter) on a selected diagram code block
- **THEN** the code block enters edit mode showing the source code with cursor

#### Scenario: Exit edit mode
- **WHEN** a user presses Escape while editing a diagram code fence
- **THEN** the code block exits edit mode and shows the rendered preview

### Requirement: SVG responses are sanitized
The system SHALL sanitize SVG responses from the rendering service before inserting them into the DOM.

#### Scenario: Script tags removed
- **WHEN** an SVG response contains `<script>` elements
- **THEN** the system removes them before rendering

#### Scenario: Event handlers removed
- **WHEN** an SVG response contains event handler attributes (onclick, onload, etc.)
- **THEN** the system removes those attributes before rendering

### Requirement: Diagram service requests are not blocked by CSP
The system's existing Content-Security-Policy (`connect-src: *`) SHALL permit fetch requests to the configured Kroki service URL without any CSP modification.

#### Scenario: Fetch to Kroki is permitted
- **WHEN** a Kroki integration is configured AND a diagram render request is made
- **THEN** the request is not blocked by CSP (covered by existing `connect-src: *` policy)
