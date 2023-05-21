import { EditorState, Plugin } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import * as React from "react";
import ReactDOM from "react-dom";
import FileExtension from "../components/FileExtension";

// based on the example at: https://prosemirror.net/examples/upload/
const uploadPlaceholder = new Plugin({
  state: {
    init() {
      return DecorationSet.empty;
    },
    apply(tr, set: DecorationSet) {
      // Adjust decoration positions to changes made by the transaction
      set = set.map(tr.mapping, tr.doc);

      // See if the transaction adds or removes any placeholders
      const action = tr.getMeta(this);

      if (action?.add) {
        if (action.add.replaceExisting) {
          const $pos = tr.doc.resolve(action.add.pos);

          if ($pos.nodeAfter?.type.name === "image") {
            const deco = Decoration.node(
              $pos.pos,
              $pos.pos + $pos.nodeAfter.nodeSize,
              {
                class: "image-replacement-uploading",
              },
              {
                id: action.add.id,
              }
            );
            set = set.add(tr.doc, [deco]);
          }
        } else if (action.add.isImage) {
          const element = document.createElement("div");
          element.className = "image placeholder";

          const img = document.createElement("img");
          img.src = URL.createObjectURL(action.add.file);

          element.appendChild(img);

          const deco = Decoration.widget(action.add.pos, element, {
            id: action.add.id,
          });
          set = set.add(tr.doc, [deco]);
        } else {
          const element = document.createElement("div");
          element.className = "attachment placeholder";

          const icon = document.createElement("div");
          icon.className = "icon";

          const component = <FileExtension title={action.add.file.name} />;
          ReactDOM.render(component, icon);
          element.appendChild(icon);

          const text = document.createElement("span");
          text.innerText = action.add.file.name;
          element.appendChild(text);

          const status = document.createElement("span");
          status.innerText = "Uploading…";
          status.className = "status";
          element.appendChild(status);

          const deco = Decoration.widget(action.add.pos, element, {
            id: action.add.id,
          });
          set = set.add(tr.doc, [deco]);
        }
      }

      if (action?.remove) {
        set = set.remove(
          set.find(undefined, undefined, (spec) => spec.id === action.remove.id)
        );
      }
      return set;
    },
  },
  props: {
    decorations(state) {
      return this.getState(state);
    },
  },
});

export default uploadPlaceholder;

export function findPlaceholder(
  state: EditorState,
  id: string
): [number, number] | null {
  const decos = uploadPlaceholder.getState(state);
  const found = decos?.find(undefined, undefined, (spec) => spec.id === id);
  return found?.length ? [found[0].from, found[0].to] : null;
}
