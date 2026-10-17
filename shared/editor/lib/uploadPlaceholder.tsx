import type {
  Attrs,
  Node as ProsemirrorNode,
  NodeType,
} from "prosemirror-model";
import { DOMSerializer } from "prosemirror-model";
import type { EditorState } from "prosemirror-state";
import { Plugin } from "prosemirror-state";
import type { EditorView, NodeView } from "prosemirror-view";
import { Decoration, DecorationSet } from "prosemirror-view";
import { createRoot } from "react-dom/client";
import FileExtension from "../components/FileExtension";
import { EditorStyleHelper } from "../styles/EditorStyleHelper";
import { mapDecorations } from "./multiplayer";

/** Describes a placeholder to display while a file uploads. */
interface UploadPlaceholderAdd {
  /** Unique identifier of the upload. */
  id: string;
  /** Document position to display the placeholder at. */
  pos: number;
  /** The file that is uploading. */
  file?: File;
  /** URL to preview the upload with, a local URL for the file is used if not provided. */
  src?: string;
  /** Whether the upload will become an image node. */
  isImage?: boolean;
  /** Whether the upload will become a video node. */
  isVideo?: boolean;
  /** Attributes of the node that the upload will become. */
  attrs?: Attrs;
  /** Whether the upload replaces the node at the position. */
  replaceExisting?: boolean;
}

/** Describes a placeholder to remove when its upload completes or fails. */
interface UploadPlaceholderRemove {
  /** Unique identifier of the upload. */
  id: string;
  /** The node inserted by the same transaction in place of the placeholder. */
  node?: ProsemirrorNode;
}

/** Meta attached to a transaction to add or remove placeholders. */
interface UploadPlaceholderAction {
  add?: UploadPlaceholderAdd;
  remove?: UploadPlaceholderRemove;
}

/** How long an uploaded node keeps the class that fades it in, in milliseconds. */
const uploadedDuration = 1000;

/** Node views rendered for placeholder widgets, keyed by their DOM element. */
const placeholderViews = new WeakMap<globalThis.Node, NodeView>();

/**
 * Render a node in the same way as the editor renders it in the document, with
 * the node view when there is one, and mark it as uploading.
 *
 * @param view The editor view.
 * @param node The node to render.
 * @returns the DOM element to display.
 */
function renderUploadingNode(
  view: EditorView,
  node: ProsemirrorNode
): HTMLElement {
  const createNodeView = view.someProp(
    "nodeViews",
    (nodeViews) => nodeViews[node.type.name]
  );
  const nodeView = createNodeView?.(
    node,
    view,
    () => undefined,
    [],
    DecorationSet.empty
  );
  const dom =
    nodeView?.dom ??
    DOMSerializer.fromSchema(view.state.schema).serializeNode(node);

  const element =
    dom instanceof HTMLElement ? dom : document.createElement("div");
  if (element !== dom) {
    element.appendChild(dom);
  }

  element.classList.add(EditorStyleHelper.mediaUploading);
  element.inert = true;
  element.setAttribute("aria-busy", "true");

  if (nodeView) {
    placeholderViews.set(element, nodeView);
  }
  return element;
}

// based on the example at: https://prosemirror.net/examples/upload/
const uploadPlaceholder = new Plugin({
  state: {
    init() {
      return DecorationSet.empty;
    },
    apply(this: Plugin, tr, set: DecorationSet, _oldState, newState) {
      // See if the transaction adds or removes any placeholders – the placeholder display is
      // different depending on if we're uploading an image, video or plain file
      const action: UploadPlaceholderAction | undefined = tr.getMeta(this);
      const removedFrom = action?.remove
        ? set.find(
            undefined,
            undefined,
            (spec) => spec.id === action.remove?.id
          )[0]?.from
        : undefined;
      set = mapDecorations(set, tr, newState, !!action);

      const now = Date.now();
      const expired = set.find(
        undefined,
        undefined,
        (spec) => spec.uploadedUntil !== undefined && spec.uploadedUntil < now
      );
      if (expired.length) {
        set = set.remove(expired);
      }

      if (action?.add) {
        const { add } = action;
        const { schema } = newState;
        const mediaType = add.isImage
          ? schema.nodes.image
          : add.isVideo
            ? schema.nodes.video
            : undefined;

        // Render the node that the upload will become, so that the switch to
        // the uploaded node does not change the display.
        const createWidget = (type: NodeType) => {
          const objectUrl =
            !add.src && add.file ? URL.createObjectURL(add.file) : undefined;
          const node = type.create({
            ...add.attrs,
            src: add.src ?? objectUrl,
          });

          return Decoration.widget(
            add.pos,
            (view) => renderUploadingNode(view, node),
            {
              id: add.id,
              key: `upload-${add.id}`,
              objectUrl,
              destroy: (dom: globalThis.Node) => {
                placeholderViews.get(dom)?.destroy?.();
                placeholderViews.delete(dom);
              },
            }
          );
        };

        if (add.replaceExisting) {
          const $pos = tr.doc.resolve(add.pos);
          const nodeAfter = $pos.nodeAfter;
          if (!nodeAfter) {
            return set;
          }

          // Media is hidden and replaced by a preview of the upload.
          const deco = Decoration.node(
            $pos.pos,
            $pos.pos + nodeAfter.nodeSize,
            {
              class: mediaType
                ? EditorStyleHelper.mediaReplaced
                : `${nodeAfter.type.name}-replacement-uploading`,
            },
            {
              id: add.id,
            }
          );
          set = set.add(
            tr.doc,
            mediaType ? [deco, createWidget(mediaType)] : [deco]
          );
        } else if (mediaType) {
          set = set.add(tr.doc, [createWidget(mediaType)]);
        } else if (add.file) {
          const element = document.createElement("div");
          element.className = "file placeholder";

          const icon = document.createElement("div");
          const title = document.createElement("div");
          title.className = "title";
          title.innerText = add.file.name;

          const subtitle = document.createElement("div");
          subtitle.className = "subtitle";
          subtitle.innerText = "Uploading…";

          createRoot(icon).render(<FileExtension title={add.file.name} />);

          element.appendChild(icon);
          element.appendChild(title);
          element.appendChild(subtitle);

          const deco = Decoration.widget(add.pos, element, {
            id: add.id,
          });
          set = set.add(tr.doc, [deco]);
        }
      }

      if (action?.remove) {
        const { id } = action.remove;
        const found = set.find(undefined, undefined, (spec) => spec.id === id);
        found.forEach((deco) => {
          if (deco.spec.objectUrl) {
            URL.revokeObjectURL(deco.spec.objectUrl);
          }
        });
        set = set.remove(found);

        // Fade in the uploaded node from the opacity of its placeholder.
        const { node } = action.remove;
        if (node && removedFrom !== undefined) {
          const start = tr.mapping.map(removedFrom, -1);
          const end = Math.min(start + node.nodeSize + 1, tr.doc.content.size);
          tr.doc.nodesBetween(start, end, (child, pos) => {
            if (child === node) {
              set = set.add(tr.doc, [
                Decoration.node(
                  pos,
                  pos + node.nodeSize,
                  { class: EditorStyleHelper.mediaUploaded },
                  { uploadedUntil: now + uploadedDuration }
                ),
              ]);
            }
            return child !== node;
          });
        }
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

  // When the upload replaces a node, its range is the placeholder position.
  const deco = found?.find((d) => d.to > d.from) ?? found?.[0];
  return deco ? [deco.from, deco.to] : null;
}
