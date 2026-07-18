import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  createEditorState,
  codeBlock,
  doc,
  p,
  schema,
} from "@shared/test/editor";
import DiagramService, { pluginKey } from "./DiagramService";
import type { DiagramServiceState } from "./DiagramService";
import type { Editor } from "../../../app/editor";

const hasDom = typeof document !== "undefined";

/**
 * Creates a mock editor instance with the given embeds configuration.
 */
function createMockEditor(
  embeds: Array<{ name?: string; settings?: Record<string, unknown> }> = []
) {
  return {
    props: {
      embeds,
      readOnly: false,
      onClickLink: vi.fn(),
    },
    view: { dom: { clientWidth: 800 } },
    schema,
  } as unknown as Editor;
}

/**
 * Retrieves the decoration count from the DiagramService plugin state.
 */
function getDecorationCount(
  state: ReturnType<typeof createEditorState>
): number {
  const pluginState = pluginKey.getState(state) as DiagramServiceState;
  return pluginState.decorationSet.find(0, state.doc.content.size).length;
}

describe("DiagramService plugin - No Config regression (Group 12)", () => {
  let mockEditor: Editor;

  beforeEach(() => {
    mockEditor = createMockEditor([]);
  });

  it("creates zero decorations for D2 code fence when no Kroki embed in props", () => {
    const plugin = DiagramService({ isDark: false, editor: mockEditor });
    const testDoc = doc([codeBlock("shape: circle", "d2")]);
    const state = createEditorState(testDoc, [plugin]);
    expect(getDecorationCount(state)).toBe(0);
  });

  it("creates zero decorations for PlantUML code fence when no Kroki embed in props", () => {
    const plugin = DiagramService({ isDark: false, editor: mockEditor });
    const testDoc = doc([codeBlock("@startuml\nAlice -> Bob\n@enduml", "plantuml")]);
    const state = createEditorState(testDoc, [plugin]);
    expect(getDecorationCount(state)).toBe(0);
  });

  it("creates zero decorations for Mermaid code fence (always handled by Mermaid plugin)", () => {
    const plugin = DiagramService({ isDark: false, editor: mockEditor });
    const testDoc = doc([codeBlock("graph TD\nA-->B", "mermaid")]);
    const state = createEditorState(testDoc, [plugin]);
    expect(getDecorationCount(state)).toBe(0);
  });

  it("creates zero decorations when Kroki embed has no settings", () => {
    const editor = createMockEditor([{ name: "kroki" }]);
    const plugin = DiagramService({ isDark: false, editor });
    const testDoc = doc([codeBlock("shape: circle", "d2")]);
    const state = createEditorState(testDoc, [plugin]);
    expect(getDecorationCount(state)).toBe(0);
  });

  it("D2 code fence remains as plain code (no decorations) when unconfigured", () => {
    const editor = createMockEditor([
      { name: "kroki", settings: { kroki: {} } },
    ]);
    const plugin = DiagramService({ isDark: false, editor });
    const testDoc = doc([codeBlock("shape: circle\nlabel: Hello", "d2")]);
    const state = createEditorState(testDoc, [plugin]);
    expect(getDecorationCount(state)).toBe(0);
  });

  it("PlantUML code fence remains as plain code (no decorations) when unconfigured", () => {
    const editor = createMockEditor([
      { name: "kroki", settings: { kroki: {} } },
    ]);
    const plugin = DiagramService({ isDark: false, editor });
    const testDoc = doc([
      codeBlock("@startuml\nBob -> Alice : hello\n@enduml", "plantuml"),
    ]);
    const state = createEditorState(testDoc, [plugin]);
    expect(getDecorationCount(state)).toBe(0);
  });
});

describe.skipIf(!hasDom)("DiagramService plugin - enabledFormats migration (Group 8)", () => {
  it("creates decoration for mermaid when legacy settings have mermaid: true (8.4)", () => {
    const editor = createMockEditor([
      {
        name: "kroki",
        settings: { kroki: { url: "http://x", mermaid: true } },
      },
    ]);
    const plugin = DiagramService({ isDark: false, editor });
    const testDoc = doc([codeBlock("graph TD\nA-->B", "mermaid")]);
    const state = createEditorState(testDoc, [plugin]);
    expect(getDecorationCount(state)).toBeGreaterThan(0);
  });

  it("creates NO decoration for mermaid when legacy settings have mermaid: false (8.5)", () => {
    const editor = createMockEditor([
      {
        name: "kroki",
        settings: { kroki: { url: "http://x", mermaid: false } },
      },
    ]);
    const plugin = DiagramService({ isDark: false, editor });
    const testDoc = doc([codeBlock("graph TD\nA-->B", "mermaid")]);
    const state = createEditorState(testDoc, [plugin]);
    expect(getDecorationCount(state)).toBe(0);
  });

  it("creates decoration for ditaa when enabledFormats includes ditaa (8.6)", () => {
    const editor = createMockEditor([
      {
        name: "kroki",
        settings: { kroki: { url: "http://x", enabledFormats: ["ditaa"] } },
      },
    ]);
    const plugin = DiagramService({ isDark: false, editor });
    const testDoc = doc([codeBlock("+--+\n|  |\n+--+", "ditaa")]);
    const state = createEditorState(testDoc, [plugin]);
    expect(getDecorationCount(state)).toBeGreaterThan(0);
  });

  it("creates NO decoration for ditaa when enabledFormats does not include it (8.7)", () => {
    const editor = createMockEditor([
      {
        name: "kroki",
        settings: { kroki: { url: "http://x", enabledFormats: ["d2"] } },
      },
    ]);
    const plugin = DiagramService({ isDark: false, editor });
    const testDoc = doc([codeBlock("+--+\n|  |\n+--+", "ditaa")]);
    const state = createEditorState(testDoc, [plugin]);
    expect(getDecorationCount(state)).toBe(0);
  });

  it("creates NO decoration for javascript code fence even with enabledFormats set (8.8)", () => {
    const editor = createMockEditor([
      {
        name: "kroki",
        settings: { kroki: { url: "http://x", enabledFormats: ["d2"] } },
      },
    ]);
    const plugin = DiagramService({ isDark: false, editor });
    const testDoc = doc([codeBlock("const x = 1;", "javascript")]);
    const state = createEditorState(testDoc, [plugin]);
    expect(getDecorationCount(state)).toBe(0);
  });
});

describe.skipIf(!hasDom)("DiagramService plugin - Active rendering (Group 13)", () => {
  let mockEditor: Editor;

  beforeEach(() => {
    mockEditor = createMockEditor([
      {
        name: "kroki",
        settings: { kroki: { url: "https://kroki.example.com" } },
      },
    ]);
  });

  it("creates decoration widget for D2 code fence when Kroki is configured", () => {
    const plugin = DiagramService({ isDark: false, editor: mockEditor });
    const testDoc = doc([codeBlock("shape: circle", "d2")]);
    const state = createEditorState(testDoc, [plugin]);
    expect(getDecorationCount(state)).toBeGreaterThan(0);
  });

  it("creates decoration widget for PlantUML code fence when Kroki is configured", () => {
    const plugin = DiagramService({ isDark: false, editor: mockEditor });
    const testDoc = doc([
      codeBlock("@startuml\nAlice -> Bob\n@enduml", "plantuml"),
    ]);
    const state = createEditorState(testDoc, [plugin]);
    expect(getDecorationCount(state)).toBeGreaterThan(0);
  });

  it("creates decoration widget for puml code fence when Kroki is configured", () => {
    const plugin = DiagramService({ isDark: false, editor: mockEditor });
    const testDoc = doc([
      codeBlock("@startuml\nAlice -> Bob\n@enduml", "puml"),
    ]);
    const state = createEditorState(testDoc, [plugin]);
    expect(getDecorationCount(state)).toBeGreaterThan(0);
  });

  it("does NOT create decoration for Mermaid when settings.kroki.mermaid is false", () => {
    const editor = createMockEditor([
      {
        name: "kroki",
        settings: { kroki: { url: "https://kroki.example.com", mermaid: false } },
      },
    ]);
    const plugin = DiagramService({ isDark: false, editor });
    const testDoc = doc([codeBlock("graph TD\nA-->B", "mermaid")]);
    const state = createEditorState(testDoc, [plugin]);
    expect(getDecorationCount(state)).toBe(0);
  });

  it("creates decoration for Mermaid when settings.kroki.mermaid is true", () => {
    const editor = createMockEditor([
      {
        name: "kroki",
        settings: { kroki: { url: "https://kroki.example.com", mermaid: true } },
      },
    ]);
    const plugin = DiagramService({ isDark: false, editor });
    const testDoc = doc([codeBlock("graph TD\nA-->B", "mermaid")]);
    const state = createEditorState(testDoc, [plugin]);
    expect(getDecorationCount(state)).toBeGreaterThan(0);
  });

  it("multiple diagram fences in same document each get a decoration", () => {
    const plugin = DiagramService({ isDark: false, editor: mockEditor });
    const testDoc = doc([
      codeBlock("shape: circle", "d2"),
      p("some text between"),
      codeBlock("@startuml\nAlice -> Bob\n@enduml", "plantuml"),
    ]);
    const state = createEditorState(testDoc, [plugin]);
    // Each diagram block gets 2 decorations (widget + node), so 2 blocks = 4
    expect(getDecorationCount(state)).toBe(4);
  });

  it("empty code fences still get a decoration (shows 'Empty diagram')", () => {
    const plugin = DiagramService({ isDark: false, editor: mockEditor });
    const testDoc = doc([codeBlock("", "d2")]);
    const state = createEditorState(testDoc, [plugin]);
    expect(getDecorationCount(state)).toBeGreaterThan(0);
  });
});
