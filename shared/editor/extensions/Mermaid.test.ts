import { describe, it, expect, vi } from "vitest";
import {
  createEditorState,
  codeBlock,
  doc,
  schema,
} from "@shared/test/editor";
import Mermaid, { pluginKey } from "./Mermaid";
import type { MermaidState } from "./Mermaid";
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
    commands: { edit_mermaid: vi.fn() },
  } as unknown as Editor;
}

/**
 * Retrieves the decoration count from the Mermaid plugin state.
 */
function getDecorationCount(
  state: ReturnType<typeof createEditorState>
): number {
  const pluginState = pluginKey.getState(state) as MermaidState;
  return pluginState.decorationSet.find(0, state.doc.content.size).length;
}

describe.skipIf(!hasDom)("Mermaid plugin - decoration creation (Group 14)", () => {
  it("creates decorations for mermaid code fence when no Kroki integration", () => {
    const editor = createMockEditor([]);
    const plugin = Mermaid({ isDark: false, editor });
    const testDoc = doc([codeBlock("graph TD\nA-->B", "mermaid")]);
    const state = createEditorState(testDoc, [plugin]);
    expect(getDecorationCount(state)).toBeGreaterThan(0);
  });

  it("creates decorations for mermaidjs code fence when no Kroki integration", () => {
    const editor = createMockEditor([]);
    const plugin = Mermaid({ isDark: false, editor });
    const testDoc = doc([codeBlock("sequenceDiagram\nA->>B: Hi", "mermaidjs")]);
    const state = createEditorState(testDoc, [plugin]);
    expect(getDecorationCount(state)).toBeGreaterThan(0);
  });

  it("creates decorations when Kroki configured but mermaid=false", () => {
    const editor = createMockEditor([
      {
        name: "kroki",
        settings: { kroki: { url: "https://kroki.example.com", mermaid: false } },
      },
    ]);
    const plugin = Mermaid({ isDark: false, editor });
    const testDoc = doc([codeBlock("graph TD\nA-->B", "mermaid")]);
    const state = createEditorState(testDoc, [plugin]);
    expect(getDecorationCount(state)).toBeGreaterThan(0);
  });

  it("creates decorations when Kroki configured but mermaid=undefined", () => {
    const editor = createMockEditor([
      {
        name: "kroki",
        settings: { kroki: { url: "https://kroki.example.com" } },
      },
    ]);
    const plugin = Mermaid({ isDark: false, editor });
    const testDoc = doc([codeBlock("graph TD\nA-->B", "mermaid")]);
    const state = createEditorState(testDoc, [plugin]);
    expect(getDecorationCount(state)).toBeGreaterThan(0);
  });
});

describe("Mermaid plugin - enabledFormats interaction, no-decoration (Group 8)", () => {
  it("creates ZERO decorations when enabledFormats includes mermaid (8.9)", () => {
    const editor = createMockEditor([
      {
        name: "kroki",
        settings: { kroki: { url: "http://x", enabledFormats: ["d2", "mermaid"] } },
      },
    ]);
    const plugin = Mermaid({ isDark: false, editor });
    const testDoc = doc([codeBlock("graph TD\nA-->B", "mermaid")]);
    const state = createEditorState(testDoc, [plugin]);
    expect(getDecorationCount(state)).toBe(0);
  });
});

describe.skipIf(!hasDom)("Mermaid plugin - enabledFormats interaction, with-decoration (Group 8)", () => {
  it("creates decorations when enabledFormats does NOT include mermaid (8.10)", () => {
    const editor = createMockEditor([
      {
        name: "kroki",
        settings: { kroki: { url: "http://x", enabledFormats: ["d2"] } },
      },
    ]);
    const plugin = Mermaid({ isDark: false, editor });
    const testDoc = doc([codeBlock("graph TD\nA-->B", "mermaid")]);
    const state = createEditorState(testDoc, [plugin]);
    expect(getDecorationCount(state)).toBeGreaterThan(0);
  });
});

describe("Mermaid plugin - no-decoration cases (Group 14)", () => {
  it("creates ZERO decorations when Kroki configured with mermaid=true", () => {
    const editor = createMockEditor([
      {
        name: "kroki",
        settings: { kroki: { url: "https://kroki.example.com", mermaid: true } },
      },
    ]);
    const plugin = Mermaid({ isDark: false, editor });
    const testDoc = doc([codeBlock("graph TD\nA-->B", "mermaid")]);
    const state = createEditorState(testDoc, [plugin]);
    expect(getDecorationCount(state)).toBe(0);
  });

  it("ignores D2 code fences", () => {
    const editor = createMockEditor([]);
    const plugin = Mermaid({ isDark: false, editor });
    const testDoc = doc([codeBlock("shape: circle", "d2")]);
    const state = createEditorState(testDoc, [plugin]);
    expect(getDecorationCount(state)).toBe(0);
  });

  it("ignores PlantUML code fences", () => {
    const editor = createMockEditor([]);
    const plugin = Mermaid({ isDark: false, editor });
    const testDoc = doc([
      codeBlock("@startuml\nAlice -> Bob\n@enduml", "plantuml"),
    ]);
    const state = createEditorState(testDoc, [plugin]);
    expect(getDecorationCount(state)).toBe(0);
  });
});
