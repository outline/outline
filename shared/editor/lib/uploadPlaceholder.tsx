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

/** Placeholder elements, keyed by the identifier of their upload. */
const placeholderElements = new Map<string, Set<HTMLElement>>();

/** Fraction of each upload that is complete, keyed by its identifier. */
const uploadProgress = new Map<string, number>();

/** CSS property that holds the fraction of an upload that is complete. */
const progressProperty = "--upload-progress";

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
 * @param id The identifier of the upload.
 * @returns the DOM element to display.
 */
function renderUploadingNode(
  view: EditorView,
  node: ProsemirrorNode,
  id: string
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

  const progress = uploadProgress.get(id);
  if (progress !== undefined) {
    element.style.setProperty(progressProperty, String(progress));
  }

  const elements = placeholderElements.get(id) ?? new Set<HTMLElement>();
  placeholderElements.set(id, elements.add(element));

  if (nodeView) {
    placeholderViews.set(element, nodeView);
  }
  return element;
}

/**
 * Remove a placeholder element that is no longer displayed.
 *
 * @param dom The placeholder element.
 * @param id The identifier of the upload.
 */
function destroyUploadingNode(dom: globalThis.Node, id: string) {
  placeholderViews.get(dom)?.destroy?.();
  placeholderViews.delete(dom);

  const elements = placeholderElements.get(id);
  if (dom instanceof HTMLElement) {
    elements?.delete(dom);
  }
  if (elements?.size === 0) {
    placeholderElements.delete(id);
  }
}

/**
 * Find the local URLs of the files that placeholders display.
 *
 * @param set The decorations of the plugin.
 * @returns the local URLs.
 */
function findObjectUrls(set: DecorationSet): string[] {
  return set
    .find(undefined, undefined, (spec) => !!spec.objectUrl)
    .map((deco) => deco.spec.objectUrl);
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

      // Read the placeholders before mapping, as the transaction that replaces
      // a placeholder can also delete its decorations.
      const removing = action?.remove
        ? set.find(
            undefined,
            undefined,
            (spec) => spec.id === action.remove?.id
          )
        : [];
      const objectUrlsBefore = findObjectUrls(set);
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
          (view) => renderUploadingNode(view, node, add.id),
          {
            id: add.id,
            key: `upload-${add.id}`,
            objectUrl,
            destroy: (dom: globalThis.Node) =>
              destroyUploadingNode(dom, add.id),
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
        uploadProgress.delete(id);
        set = set.remove(
          set.find(undefined, undefined, (spec) => spec.id === id)
        );

        // An uploaded node continues to display the local file, so that the
        // file does not load again from storage.
        const url: string | undefined = node?.attrs[getUrlAttr(node.type)];
        const localSrc =
          node && url && displaysFile(node)
            ? removing.find((deco) => deco.spec.objectUrl)?.spec.objectUrl
            : undefined;
        if (url && localSrc) {
          localSources = new Map(localSources).set(url, localSrc);
        }

        // Fade in the uploaded node from the opacity of its placeholder.
        const removedFrom = removing[0]?.from;
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
      // Free the local files of placeholders that are no longer displayed,
      // unless an uploaded node continues to display them.
      if (objectUrlsBefore.length) {
        const remaining = new Set(findObjectUrls(set));
        const kept = new Set(localSources.values());
        objectUrlsBefore.forEach((objectUrl) => {
          if (!remaining.has(objectUrl) && !kept.has(objectUrl)) {
            URL.revokeObjectURL(objectUrl);
          }
        });
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

/**
 * Display the progress of an upload on its placeholder. The progress is set on
 * the placeholder element directly, so that it does not change the editor state.
 *
 * @param id The identifier of the upload
 * @param fraction The fraction of the upload that is complete, from 0 to 1
 */
export function setUploadProgress(id: string, fraction: number) {
  uploadProgress.set(id, fraction);
  placeholderElements
    .get(id)
    ?.forEach((element) =>
      element.style.setProperty(progressProperty, String(fraction))
    );
}
