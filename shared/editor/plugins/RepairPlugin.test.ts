import { createEditorState, doc, heading, p } from "@shared/test/editor";
import type { EditorState } from "prosemirror-state";
import { Plugin } from "prosemirror-state";
import {
  multiplayerPluginKey,
  type MultiplayerOperations,
} from "../lib/multiplayer";
import { RepairPlugin } from "./RepairPlugin";

describe("RepairPlugin", () => {
  const multiplayer: MultiplayerOperations = {
    isRemoteTransaction: (transaction) => !!transaction.getMeta("remote"),
    stopCapturing: () => {},
  };
  const facade = new Plugin({ key: multiplayerPluginKey, multiplayer });

  // Treats level one headings as needing repair to level two.
  const buildPlugin = () => {
    const needsRepair = vi.fn(
      (node) => node.type.name === "heading" && node.attrs.level === 1
    );
    const plugin = new RepairPlugin({
      needsRepair,
      repair: (state, nodes) => {
        const tr = state.tr;
        nodes.forEach(({ pos }) => tr.setNodeAttribute(pos, "level", 2));
        return tr;
      },
    });
    return { plugin, needsRepair };
  };

  const levels = (state: EditorState) => {
    const result: number[] = [];
    state.doc.descendants((node) => {
      if (node.type.name === "heading") {
        result.push(node.attrs.level);
      }
    });
    return result;
  };

  const insertRemote = (state: EditorState) =>
    state.apply(
      state.tr
        .insert(state.doc.content.size, heading("Remote", 1))
        .setMeta("remote", true)
    );

  it("repairs loaded content on the first local change", () => {
    const { plugin } = buildPlugin();
    const state = createEditorState(doc([heading("Loaded", 1), p("Text")]), [
      facade,
      plugin,
    ]);

    const newState = state.apply(state.tr.insertText("x", 10));

    expect(levels(newState)).toEqual([2]);
  });

  it("does not repair in response to a remote change", () => {
    const { plugin } = buildPlugin();
    const state = createEditorState(doc(p("Text")), [facade, plugin]);

    const newState = insertRemote(state);

    expect(levels(newState)).toEqual([1]);
  });

  it("repairs received content on the next local change", () => {
    const { plugin } = buildPlugin();
    const state = createEditorState(doc(p("Text")), [facade, plugin]);

    const localState = state.apply(state.tr.insertText("x", 1));
    const remoteState = insertRemote(localState);
    const newState = remoteState.apply(remoteState.tr.insertText("y", 1));

    expect(levels(newState)).toEqual([2]);
  });

  it("only checks changed nodes when no repair is pending", () => {
    const { plugin, needsRepair } = buildPlugin();
    const state = createEditorState(
      doc([p("One"), p("Two"), p("Three"), p("Four")]),
      [facade, plugin]
    );

    const localState = state.apply(state.tr.insertText("x", 1));
    const remoteState = localState.apply(
      localState.tr.insertText("z", 7).setMeta("remote", true)
    );
    needsRepair.mockClear();
    remoteState.apply(remoteState.tr.insertText("y", 1));

    // The changed paragraph and its text, not the whole document.
    expect(needsRepair.mock.calls.length).toBeLessThanOrEqual(2);
  });
});
