import { InputRule } from "prosemirror-inputrules";
import type { EditorState } from "prosemirror-state";
import Extension from "@shared/editor/lib/Extension";
import { isInCode } from "@shared/editor/queries/isInCode";
import { UserPreference } from "@shared/types";

/**
 * Detects when the user types "[[" – a document linking syntax used by some
 * other tools – and nudges them towards using the "@" mention menu to link
 * documents instead. The hint is surfaced at most once per user, tracked via
 * a user preference.
 */
export default class DocumentLinkHint extends Extension {
  get name() {
    return "document-link-hint";
  }

  inputRules() {
    return [
      new InputRule(/\[\[$/, (state: EditorState) => {
        if (isInCode(state)) {
          return null;
        }

        // Skip firing entirely once the user has already seen the hint.
        if (
          this.editor.props.userPreferences?.[
            UserPreference.SeenDocumentLinkHint
          ]
        ) {
          return null;
        }

        this.editor.props.onShowDocumentLinkHint?.();

        // Return null to leave the typed characters untouched.
        return null;
      }),
    ];
  }
}
