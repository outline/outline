import { EditorState, Plugin } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import * as React from "react";
import ReactDOM from "react-dom";
import FileExtension from "../components/FileExtension";
import { isRemoteTransaction } from "./multiplayer";
import { recreateTransform } from "./prosemirror-recreate-transform";

// based on the example at: https://prosemirror.net/examples/upload/
const uploadPlaceholder = new Plugin({
  state: {
    init() {
      return DecorationSet.empty;
    },
    apply(tr, set: DecorationSet) {
      let mapping = tr.mapping;

      // See if the transaction adds or removes any placeholders – the placeholder display is
      // different depending on if we're uploading an image, video or plain file
      const action = tr.getMeta(this);
      const hasDecorations = set.find().length;

      // Note: We always rebuild the mapping if the transaction comes from this plugin as otherwise
      // with the default mapping decorations are wiped out when you upload multiple files at a time.
      if (hasDecorations && (isRemoteTransaction(tr) || action)) {
        try {
          mapping = recreateTransform(tr.before, tr.doc, {
            complexSteps: true,
            wordDiffs: false,
            simplifyDiff: true,
          }).mapping;
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn("Failed to recreate transform: ", err);
        }
      }

      set = set.map(mapping, tr.doc);

      if (action?.add) {
        if (action.add.replaceExisting) {
          const $pos = tr.doc.resolve(action.add.pos);
          const nodeAfter = $pos.nodeAfter;
          if (!nodeAfter) {
            return;
          }

          const deco = Decoration.node(
            $pos.pos,
            $pos.pos + nodeAfter.nodeSize,
            {
              class: `${nodeAfter.type.name}-replacement-uploading`,
            },
            {
              id: action.add.id,
            }
          );
          set = set.add(tr.doc, [deco]);
        } else if (action.add.isImage) {
          const element = document.createElement("div");
          element.className = "image placeholder";

          const img = document.createElement("img");
          img.src = URL.createObjectURL(action.add.file);
          img.style.width = `${action.add.dimensions?.width}px`;

          element.appendChild(img);

          const deco = Decoration.widget(action.add.pos, element, {
            id: action.add.id,
          });
          set = set.add(tr.doc, [deco]);
        } else if (action.add.isVideo) {
          const element = document.createElement("div");
          element.className = "video placeholder";

          const video = document.createElement("video");
          video.src = URL.createObjectURL(action.add.file);
          video.autoplay = false;
          video.controls = false;
          video.width = action.add.dimensions?.width;
          video.height = action.add.dimensions?.height;

          element.appendChild(video);

          const deco = Decoration.widget(action.add.pos, element, {
            id: action.add.id,
          });
          set = set.add(tr.doc, [deco]);
        } else {
          const element = document.createElement("div");
          element.className = "file placeholder";

          const icon = document.createElement("div");
          const title = document.createElement("div");
          title.className = "title";
          title.innerText = action.add.file.name;

          const subtitle = document.createElement("div");
          subtitle.className = "subtitle";
          subtitle.innerText = "Uploading…";

          ReactDOM.render(<FileExtension title={action.add.file.name} />, icon);

          element.appendChild(icon);
          element.appendChild(title);
          element.appendChild(subtitle);

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

/**
 * Find the position of a placeholder by its ID
 *
 * @param state The editor state
 * @param id The placeholder ID
 * @returns The placeholder position as a tuple of [from, to] or null if not found
 */
export function findPlaceholder(
  state: EditorState,
  id: string
): [number, number] | null {
  const decos = uploadPlaceholder.getState(state);
  const found = decos?.find(undefined, undefined, (spec) => spec.id === id);
  return found?.length ? [found[0].from, found[0].to] : null;
}
