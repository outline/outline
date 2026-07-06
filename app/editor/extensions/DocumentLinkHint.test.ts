import { inputRules } from "prosemirror-inputrules";
import type { Node } from "prosemirror-model";
import { EditorView } from "prosemirror-view";
import { UserPreference } from "@shared/types";
import type { UserPreferences } from "@shared/types";
import {
  codeBlock,
  createEditorStateWithSelection,
  doc,
  p,
} from "@shared/test/editor";
import type { Editor } from "~/editor";
import DocumentLinkHint from "./DocumentLinkHint";

const onShowDocumentLinkHint = vi.fn();

function buildExtension(userPreferences?: UserPreferences) {
  const extension = new DocumentLinkHint();
  extension.editor = {
    props: { onShowDocumentLinkHint, userPreferences },
  } as unknown as Editor;
  return extension;
}

/**
 * Mounts an editor with the extension's input rules and simulates typing a
 * single character at the end of the given document.
 */
function type(extension: DocumentLinkHint, testDoc: Node, char: string) {
  const plugin = inputRules({ rules: extension.inputRules() });
  const pos = testDoc.content.size - 1;
  const state = createEditorStateWithSelection(testDoc, pos, [plugin]);
  const view = new EditorView(document.createElement("div"), { state });
  view.someProp("handleTextInput", (handler) =>
    handler(view, pos, pos, char, () => view.state.tr)
  );
  view.destroy();
}

describe("DocumentLinkHint", () => {
  beforeEach(() => {
    onShowDocumentLinkHint.mockClear();
  });

  it("fires the hint when the second bracket completes '[['", () => {
    type(buildExtension(), doc(p("[")), "[");
    expect(onShowDocumentLinkHint).toHaveBeenCalledTimes(1);
  });

  it("does not fire for a single bracket", () => {
    type(buildExtension(), doc(p("")), "[");
    expect(onShowDocumentLinkHint).not.toHaveBeenCalled();
  });

  it("does not fire inside a code block", () => {
    type(buildExtension(), doc(codeBlock("[")), "[");
    expect(onShowDocumentLinkHint).not.toHaveBeenCalled();
  });

  it("does not fire once the user has already seen the hint", () => {
    type(
      buildExtension({ [UserPreference.SeenDocumentLinkHint]: true }),
      doc(p("[")),
      "["
    );
    expect(onShowDocumentLinkHint).not.toHaveBeenCalled();
  });
});
