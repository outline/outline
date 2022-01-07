import { EditorState, Plugin } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";

// based on the example at: https://prosemirror.net/examples/upload/
const uploadPlaceholder = new Plugin({
  state: {
    init() {
      return DecorationSet.empty;
    },
    apply(tr, set) {
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
        } else {
          const element = document.createElement("div");
          element.className = "image placeholder";

          const img = document.createElement("img");
          img.src = URL.createObjectURL(action.add.file);

          element.appendChild(img);

          const deco = Decoration.widget(action.add.pos, element, {
            id: action.add.id,
          });
          set = set.add(tr.doc, [deco]);
        }
      }

      if (action?.remove) {
        set = set.remove(
          set.find(null, null, spec => spec.id === action.remove.id)
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
  const found = decos.find(null, null, spec => spec.id === id);
  return found.length ? [found[0].from, found[0].to] : null;
}
