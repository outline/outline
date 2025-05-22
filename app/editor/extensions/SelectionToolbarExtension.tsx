import { action, observable } from "mobx";
import { Plugin, EditorState, TextSelection, NodeSelection } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import Extension from "@shared/editor/lib/Extension";
import SelectionToolbar from "~/app/editor/components/SelectionToolbar"; // Adjust path as needed
import { isMarkActive } from "@shared/editor/queries/isMarkActive"; // If needed for isActive logic
import { isNodeActive } from "@shared/editor/queries/isNodeActive"; // If needed for isActive logic

export default class SelectionToolbarExtension extends Extension {
  @observable
  state = {
    isActive: false,
    // Add other relevant state properties here if needed later
  };

  get name() {
    return "selection-toolbar";
  }

  get plugins() {
    return [
      new Plugin({
        view: (editorView) => {
          // The plugin's view method can be used to store the editorView instance
          // if needed, or to set up initial event listeners if not using handleDOMEvents.
          this.updateSelectionToolbarVisibility(editorView);
          return {
            update: (view, prevState) => {
              this.updateSelectionToolbarVisibility(view, prevState);
            },
            destroy: () => {
              // Cleanup if necessary
            },
          };
        },
        // Alternatively, use props for more specific event handling if preferred later
        // props: {
        //   handleDOMEvents: {
        //     // mousedown, mouseup, etc.
        //   }
        // }
      }),
    ];
  }

  // Logic adapted from the existing useIsActive hook in SelectionToolbar.tsx
  // This will likely need further refinement.
  private isSelectionActive(state: EditorState): boolean {
    const { selection, doc, schema } = state;

    if (isMarkActive(schema.marks.link)(state)) {
      return true;
    }
    if (
      (isNodeActive(schema.nodes.code_block)(state) ||
        isNodeActive(schema.nodes.code_fence)(state)) &&
      selection.from > 0
    ) {
      return true;
    }
    // Add isInNotice check if that node type exists and is relevant
    // if (isInNotice(state) && selection.from > 0) {
    //   return true;
    // }

    if (!selection || selection.empty) {
      return false;
    }
    if (selection instanceof NodeSelection && selection.node.type.name === "hr") {
      return true;
    }
    if (
      selection instanceof NodeSelection &&
      ["image", "attachment"].includes(selection.node.type.name)
    ) {
      return true;
    }
    if (selection instanceof NodeSelection) {
      // For other node selections, you might want to return false or true
      // depending on whether the toolbar should appear.
      return false;
    }

    // Check for non-empty text selection
    const selectionText = doc.cut(selection.from, selection.to).textContent;
    if (selection instanceof TextSelection && !selectionText) {
      return false;
    }

    // Original logic: const slice = selection.content(); const fragment = slice.content;
    // This part seems to check if there's actual content in the selection,
    // not just an empty range.
    const slice = selection.content();
    if (slice.content.childCount > 0) {
      let hasContent = false;
      slice.content.forEach(node => {
        if (node.content.size > 0 || node.isText || node.type.name !== 'paragraph' || (node.textContent && node.textContent.length > 0)) {
          hasContent = true;
        }
      });
      // Fallback for cases where a paragraph might seem empty but still has meaning for selection
      if (!hasContent && slice.content.childCount === 1 && slice.content.firstChild?.type.name === 'paragraph' && selectionText.length > 0) {
        return true;
      }
      return hasContent;
    }
    
    return false; // Default to false if no other condition met
  }

  @action
  private updateSelectionToolbarVisibility(view: EditorView, prevState?: EditorState) {
    const { state } = view;
    if (prevState && prevState.doc.eq(state.doc) && prevState.selection.eq(state.selection)) {
      return;
    }

    const isActive = this.isSelectionActive(state);
    if (this.state.isActive !== isActive) {
      this.state.isActive = isActive;
    }
  }

  widget = () => {
    // The actual SelectionToolbar component will be passed props from this extension's state
    // and methods from the editor instance.
    // For now, just render it if active.
    // We'll need to pass editor properties and command functions later.
    if (!this.state.isActive) {
      return null;
    }

    // Ensure this.editor and this.editor.props are available.
    // Extensions are typically initialized with the editor instance.
    if (!this.editor || !this.editor.props) {
      // This case should ideally not happen if the extension is correctly initialized.
      // console.warn("SelectionToolbarExtension: editor or editor.props not available");
      return null;
    }

    const {
      dir,
      isTemplate,
      readOnly,
      canComment,
      canUpdate,
      onClickLink,
    } = this.editor.props as any; // Use 'as any' for now to bypass strict type checking on editor.props if its type isn't fully known here.
                                // Or, ideally, ensure EditorProps is available and used.

    return (
      <SelectionToolbar
        active={this.state.isActive}
        rtl={dir === "rtl"}
        isTemplate={isTemplate}
        readOnly={readOnly}
        canComment={canComment}
        canUpdate={canUpdate}
        onClickLink={onClickLink}
        // Props like dictionary, view, commands for ToolbarMenu will be handled by SelectionToolbar's useEditor()
      />
    );
  };
}
