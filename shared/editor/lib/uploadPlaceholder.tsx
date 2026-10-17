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
  /** Name of the node type that the upload will become. */
  type: string;
  /** Attributes of the node that the upload will become, without its URL. */
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

/** State of the upload placeholder plugin. */
interface UploadPlaceholderState {
  /** Placeholders and uploaded node decorations. */
  decorations: DecorationSet;
  /** Local URLs of files uploaded in this editor, keyed by their URL in storage. */
  localSources: ReadonlyMap<string, string>;
}

/** Node views rendered for placeholder widgets, keyed by their DOM element. */
const placeholderViews = new WeakMap<globalThis.Node, NodeView>();

/**
 * Get the name of the attribute that holds the URL of the file of a node.
 *
 * @param type The node type.
 * @returns the attribute name.
 */
export function getUrlAttr(type: NodeType): "src" | "href" {
  return type.spec.attrs && "src" in type.spec.attrs ? "src" : "href";
}

/**
 * Whether a node displays its file from a local URL while it uploads and after.
 * Attachments link to their file, and the content security policy does not
 * allow PDF previews to embed local URLs.
 *
 * @param node The node to check.
 * @returns true if the node displays its file from a local URL.
 */
function displaysFile(node: ProsemirrorNode): boolean {
  return node.type.name === "image" || node.type.name === "video";
}

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

  element.classList.add(EditorStyleHelper.uploadPlaceholder);
  element.inert = true;
  element.setAttribute("aria-busy", "true");

  if (nodeView) {
    placeholderViews.set(element, nodeView);
  }
  return element;
}

// based on the example at: https://prosemirror.net/examples/upload/
const uploadPlaceholder: Plugin<UploadPlaceholderState> = new Plugin({
  state: {
    init(): UploadPlaceholderState {
      return { decorations: DecorationSet.empty, localSources: new Map() };
    },
    apply(
      this: Plugin,
      tr,
      value: UploadPlaceholderState,
      _oldState,
      newState
    ): UploadPlaceholderState {
      let set = value.decorations;
      let { localSources } = value;
      // See if the transaction adds or removes any placeholders
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
        const type = newState.schema.nodes[add.type];
        if (!type) {
          return { decorations: set, localSources };
        }

        // Render the node that the upload will become, so that the switch to
        // the uploaded node does not change the display. A node that displays
        // its file shows the local file, others show that they are uploading.
        const template = type.create(add.attrs);
        const objectUrl =
          !add.src && add.file && displaysFile(template)
            ? URL.createObjectURL(add.file)
            : undefined;
        const previewUrl = add.src ?? objectUrl;
        const node = previewUrl
          ? type.create({ ...add.attrs, [getUrlAttr(type)]: previewUrl })
          : template;

        const widget = Decoration.widget(
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

        // A replaced node is hidden while the upload displays in its place.
        const nodeAfter = add.replaceExisting
          ? tr.doc.resolve(add.pos).nodeAfter
          : undefined;
        if (nodeAfter) {
          set = set.add(tr.doc, [
            Decoration.node(
              add.pos,
              add.pos + nodeAfter.nodeSize,
              { class: EditorStyleHelper.uploadReplaced },
              { id: add.id }
            ),
            widget,
          ]);
        } else {
          set = set.add(tr.doc, [widget]);
        }
      }

      if (action?.remove) {
        const { id, node } = action.remove;
        const found = set.find(undefined, undefined, (spec) => spec.id === id);

        // An uploaded node continues to display the local file, so that the
        // file does not load again from storage.
        const url: string | undefined = node?.attrs[getUrlAttr(node.type)];
        const localSrc =
          node && url && displaysFile(node)
            ? found.find((deco) => deco.spec.objectUrl)?.spec.objectUrl
            : undefined;
        if (url && localSrc) {
          localSources = new Map(localSources).set(url, localSrc);
        }

        found.forEach((deco) => {
          if (deco.spec.objectUrl && deco.spec.objectUrl !== localSrc) {
            URL.revokeObjectURL(deco.spec.objectUrl);
          }
        });
        set = set.remove(found);

        // Fade in the uploaded node from the opacity of its placeholder.
        if (node && removedFrom !== undefined) {
          const start = tr.mapping.map(removedFrom, -1);
          const end = Math.min(start + node.nodeSize + 1, tr.doc.content.size);
          tr.doc.nodesBetween(start, end, (child, pos) => {
            if (child === node) {
              set = set.add(tr.doc, [
                Decoration.node(
                  pos,
                  pos + node.nodeSize,
                  { class: EditorStyleHelper.uploadComplete },
                  { uploadedUntil: now + uploadedDuration }
                ),
              ]);
            }
            return child !== node;
          });
        }
      }
      return { decorations: set, localSources };
    },
  },
  props: {
    decorations(state) {
      return this.getState(state)?.decorations;
    },
  },
  view(editorView) {
    return {
      destroy() {
        uploadPlaceholder
          .getState(editorView.state)
          ?.localSources.forEach((url) => URL.revokeObjectURL(url));
      },
    };
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
  const decos = uploadPlaceholder.getState(state)?.decorations;
  const found = decos?.find(undefined, undefined, (spec) => spec.id === id);

  // When the upload replaces a node, its range is the placeholder position.
  const deco = found?.find((d) => d.to > d.from) ?? found?.[0];
  return deco ? [deco.from, deco.to] : null;
}

/**
 * Get the URL to display a file with. In the editor that uploaded the file this
 * is a local URL, so that the file does not load again from storage. The
 * document keeps the URL of the file in storage.
 *
 * @param state The editor state
 * @param url The URL of the file in storage
 * @returns The URL to display the file with
 */
export function getDisplayUrl(
  state: EditorState,
  url: string | null | undefined
): string | undefined {
  if (!url) {
    return undefined;
  }
  return uploadPlaceholder.getState(state)?.localSources.get(url) ?? url;
}
