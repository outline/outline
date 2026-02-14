/* global File Promise */
import type { PluginSimple } from "markdown-it";
import { observable } from "mobx";
import { Observer } from "mobx-react";
import { darken, transparentize } from "polished";
import { baseKeymap } from "prosemirror-commands";
import { dropCursor } from "prosemirror-dropcursor";
import { gapCursor } from "prosemirror-gapcursor";
import type { InputRule } from "prosemirror-inputrules";
import { inputRules } from "prosemirror-inputrules";
import { keymap } from "prosemirror-keymap";
import type { NodeSpec, MarkSpec } from "prosemirror-model";
import { Schema, Node as ProsemirrorNode } from "prosemirror-model";
import type { Plugin, Transaction } from "prosemirror-state";
import { EditorState, Selection, TextSelection } from "prosemirror-state";
import type { MarkdownParser } from "prosemirror-markdown";
import {
  AddMarkStep,
  RemoveMarkStep,
  ReplaceAroundStep,
  ReplaceStep,
} from "prosemirror-transform";
import type { Decoration, NodeViewConstructor } from "prosemirror-view";
import { EditorView } from "prosemirror-view";
import * as React from "react";
import type { DefaultTheme, ThemeProps } from "styled-components";
import styled, { css } from "styled-components";
import insertFiles from "@shared/editor/commands/insertFiles";
import Styles from "@shared/editor/components/Styles";
import type { EmbedDescriptor } from "@shared/editor/embeds";
import type { CommandFactory, WidgetProps } from "@shared/editor/lib/Extension";
import type Extension from "@shared/editor/lib/Extension";
import ExtensionManager from "@shared/editor/lib/ExtensionManager";
import type { MarkdownSerializer } from "@shared/editor/lib/markdown/serializer";
import textBetween from "@shared/editor/lib/textBetween";
import type Mark from "@shared/editor/marks/Mark";
import { basicExtensions as extensions } from "@shared/editor/nodes";
import type Node from "@shared/editor/nodes/Node";
import type ReactNode from "@shared/editor/nodes/ReactNode";
import type { ComponentProps } from "@shared/editor/types";
import type { ProsemirrorData, UserPreferences } from "@shared/types";
import { ProsemirrorHelper } from "@shared/utils/ProsemirrorHelper";
import EventEmitter from "@shared/utils/events";
import type Document from "~/models/Document";
import Flex from "~/components/Flex";
import { PortalContext } from "~/components/Portal";
import type { Dictionary } from "~/hooks/useDictionary";
import type { Properties } from "~/types";
import Logger from "~/utils/Logger";
import ComponentView from "./components/ComponentView";
import EditorContext from "./components/EditorContext";
import type { NodeViewRenderer } from "./components/NodeViewRenderer";

import WithTheme from "./components/WithTheme";
import isNull from "lodash/isNull";
import { isArray, map } from "lodash";
import type { LightboxImage } from "@shared/editor/lib/Lightbox";
import { LightboxImageFactory } from "@shared/editor/lib/Lightbox";
import Lightbox from "~/components/Lightbox";
import { anchorPlugin } from "@shared/editor/plugins/AnchorPlugin";

export type Props = {
  /** An optional identifier for the editor context. It is used to persist local settings */
  id?: string;
  /** The user id of the current user */
  userId?: string;
  /** The editor content, should only be changed if you wish to reset the content */
  value?: string | ProsemirrorData | ProsemirrorNode;
  /** The initial editor content as a markdown string, JSON object, or ProsemirrorNode */
  defaultValue: string | ProsemirrorData | ProsemirrorNode;
  /** Placeholder displayed when the editor is empty */
  placeholder: string;
  /** Extensions to load into the editor */
  extensions?: (typeof Node | typeof Mark | typeof Extension | Extension)[];
  /** If the editor should be focused on mount */
  autoFocus?: boolean;
  /** The focused comment, if any */
  focusedCommentId?: string;
  /** If the editor should not allow editing */
  readOnly?: boolean;
  /**
   * Whether we are rendering a cached version of the document while multiplayer loads.
   * This is used to disable some editor functionality
   */
  cacheOnly?: boolean;
  /** If the editor should still allow editing checkboxes when it is readOnly */
  canUpdate?: boolean;
  /** If the editor should still allow commenting when it is readOnly */
  canComment?: boolean;
  /** A dictionary of translated strings used in the editor */
  dictionary: Dictionary;
  /** The reading direction of the text content, if known */
  dir?: "rtl" | "ltr";
  /** If the editor should vertically grow to fill available space */
  grow?: boolean;
  /** If the editor should display template options such as inserting placeholders */
  template?: boolean;
  /** An enforced maximum content length */
  maxLength?: number;
  /** Heading id to scroll to when the editor has loaded */
  scrollTo?: string;
  /** Callback for handling uploaded images, should return the url of uploaded file */
  uploadFile?: (
    file: File | string,
    options?: { id?: string; onProgress?: (fractionComplete: number) => void }
  ) => Promise<string>;
  /** Callback when prosemirror nodes are initialized on document mount. */
  onInit?: () => void;
  /** Callback when prosemirror nodes are destroyed on document unmount. */
  onDestroy?: () => void;
  /** Callback when editor is blurred, as native input */
  onBlur?: () => void;
  /** Callback when editor is focused, as native input */
  onFocus?: () => void;
  /** Callback when user uses save key combo */
  onSave?: (options: { done: boolean }) => void;
  /** Callback when user uses cancel key combo */
  onCancel?: () => void;
  /** Callback when user changes editor content */
  onChange?: (value: () => any) => void;
  /** Callback when a comment mark is clicked */
  onClickCommentMark?: (commentId: string) => void;
  /** Callback when a comment mark is created */
  onCreateCommentMark?: (commentId: string, userId: string) => void;
  /** Callback when a comment mark is removed */
  onDeleteCommentMark?: (commentId: string) => void;
  /** Callback when comments sidebar should be opened */
  onOpenCommentsSidebar?: () => void;
  /** Callback when a file upload begins */
  onFileUploadStart?: () => void;
  /** Callback when a file upload ends */
  onFileUploadStop?: () => void;
  /** Callback when file upload progress changes */
  onFileUploadProgress?: (id: string, fractionComplete: number) => void;
  /** Callback when a link is created, should return url to created document */
  onCreateLink?: (params: Properties<Document>) => Promise<string>;
  /** Callback when user clicks on any link in the document */
  onClickLink: (
    href: string,
    event?: MouseEvent | React.MouseEvent<HTMLButtonElement>
  ) => void;
  /** Callback when user presses any key with document focused */
  onKeyDown?: (event: React.KeyboardEvent<HTMLDivElement>) => void;
  /** Collection of embed types to render in the document */
  embeds: EmbedDescriptor[];
  /** Display preferences for the logged in user, if any. */
  userPreferences?: UserPreferences | null;
  /** Whether embeds should be rendered without an iframe */
  embedsDisabled?: boolean;
  className?: string;
  /** Optional style overrides for the container*/
  style?: React.CSSProperties;
  /** Optional style overrides for the contenteeditable */
  editorStyle?: React.CSSProperties;
  lang?: string;
};

type State = {
  /** If the document text has been detected as using RTL script */
  isRTL: boolean;
  /** If the editor is currently focused */
  isEditorFocused: boolean;
  /** Image that's being currently viewed in Lightbox */
  activeLightboxImage: LightboxImage | null;
};

/**
 * The shared editor at the root of all rich editable text in Outline. Do not
 * use this component directly, it should by lazy loaded. Use
 * ~/components/Editor instead.
 */
export class Editor extends React.PureComponent<
  Props & ThemeProps<DefaultTheme>,
  State
> {
  static defaultProps = {
    defaultValue: "",
    dir: "auto",
    placeholder: "Write something nice…",
    readOnly: false,
    onFileUploadStart: () => {
      // no default behavior
    },
    onFileUploadStop: () => {
      // no default behavior
    },
    embeds: [],
    extensions,
  };

  state: State = {
    isRTL: false,
    isEditorFocused: false,
    activeLightboxImage: null,
  };

  isInitialized = false;
  isBlurred = true;
  extensions: ExtensionManager;
  elementRef = React.createRef<HTMLDivElement>();
  wrapperRef = React.createRef<HTMLDivElement>();
  view: EditorView;
  schema: Schema;
  serializer: MarkdownSerializer;
  parser: MarkdownParser;
  pasteParser: MarkdownParser;
  plugins: Plugin[];
  keymaps: Plugin[];
  inputRules: InputRule[];
  nodeViews: {
    [name: string]: NodeViewConstructor;
  };

  widgets: { [name: string]: (props: WidgetProps) => React.ReactElement };
  renderers = observable.set<NodeViewRenderer<ComponentProps>>();
  nodes: { [name: string]: NodeSpec };
  marks: { [name: string]: MarkSpec };
  commands: Record<string, CommandFactory>;
  rulePlugins: PluginSimple[];
  events = new EventEmitter();
  mutationObserver?: MutationObserver;

  /**
   * We use componentDidMount instead of constructor as the init method requires
   * that the dom is already mounted.
   */
  public componentDidMount() {
    this.init();
    window.addEventListener("theme-changed", this.dispatchThemeChanged);

    if (this.props.scrollTo) {
      void this.scrollToAnchor(this.props.scrollTo);
    }

    this.calculateDir();

    if (this.props.readOnly) {
      return;
    }

    if (this.props.autoFocus) {
      this.focusAtEnd();
    }
  }

  public componentDidUpdate(prevProps: Props) {
    // Allow changes to the 'value' prop to update the editor from outside
    if (this.props.value && prevProps.value !== this.props.value) {
      const newState = this.createState(this.props.value);
      this.view.updateState(newState);
    }

    // pass readOnly changes through to underlying editor instance
    if (prevProps.readOnly !== this.props.readOnly) {
      this.view.update({
        ...this.view.props,
        editable: () => !this.props.readOnly,
      });

      // NodeView will not automatically render when editable changes so we must trigger an update
      // manually, see: https://discuss.prosemirror.net/t/re-render-custom-nodeview-when-view-editable-changes/6441
      Array.from(this.renderers).forEach((view) =>
        view.setProp("isEditable", !this.props.readOnly)
      );
    }

    if (this.props.scrollTo && this.props.scrollTo !== prevProps.scrollTo) {
      void this.scrollToAnchor(this.props.scrollTo);
    }

    // Focus at the end of the document if switching from readOnly and autoFocus
    // is set to true
    if (prevProps.readOnly && !this.props.readOnly && this.props.autoFocus) {
      this.focusAtEnd();
    }

    if (prevProps.dir !== this.props.dir) {
      this.calculateDir();
    }

    if (!this.isBlurred && !this.state.isEditorFocused) {
      this.isBlurred = true;
      this.props.onBlur?.();
    }

    if (this.isBlurred && this.state.isEditorFocused) {
      this.isBlurred = false;
      this.props.onFocus?.();
    }
  }

  public componentWillUnmount(): void {
    window.removeEventListener("theme-changed", this.dispatchThemeChanged);
    this.view?.destroy();
    this.mutationObserver?.disconnect();
    this.handleEditorDestroy();
  }

  private init() {
    this.extensions = this.createExtensions();
    this.nodes = this.createNodes();
    this.marks = this.createMarks();
    this.schema = this.createSchema();
    this.widgets = this.createWidgets();
    this.plugins = this.createPlugins();
    this.rulePlugins = this.createRulePlugins();
    this.keymaps = this.createKeymaps();
    this.serializer = this.createSerializer();
    this.parser = this.createParser();
    this.pasteParser = this.createPasteParser();
    this.inputRules = this.createInputRules();
    this.nodeViews = this.createNodeViews();
    this.view = this.createView();
    this.commands = this.createCommands();
  }

  private createExtensions() {
    return new ExtensionManager(this.props.extensions, this);
  }

  private createPlugins() {
    return this.extensions.plugins;
  }

  private createRulePlugins() {
    return this.extensions.rulePlugins;
  }

  private createKeymaps() {
    return this.extensions.keymaps({
      schema: this.schema,
    });
  }

  private createInputRules() {
    return this.extensions.inputRules({
      schema: this.schema,
    });
  }

  private createNodeViews() {
    return this.extensions.extensions
      .filter((extension: ReactNode) => extension.component)
      .reduce(
        (nodeViews, extension: ReactNode) => ({
          ...nodeViews,
          [extension.name]: (
            node: ProsemirrorNode,
            view: EditorView,
            getPos: () => number,
            decorations: Decoration[]
          ) =>
            new ComponentView(extension.component, {
              editor: this,
              extension,
              node,
              view,
              getPos,
              decorations,
            }),
        }),
        {}
      );
  }

  private createCommands() {
    return this.extensions.commands({
      schema: this.schema,
      view: this.view,
    });
  }

  private createWidgets() {
    return this.extensions.widgets;
  }

  private createNodes() {
    return this.extensions.nodes;
  }

  private createMarks() {
    return this.extensions.marks;
  }

  private createSchema() {
    return new Schema({
      nodes: this.nodes,
      marks: this.marks,
    });
  }

  private createSerializer() {
    return this.extensions.serializer();
  }

  private createParser() {
    return this.extensions.parser({
      schema: this.schema,
      plugins: this.rulePlugins,
    });
  }

  private createPasteParser() {
    return this.extensions.parser({
      schema: this.schema,
      rules: { linkify: true },
      plugins: this.rulePlugins,
    });
  }

  private createState(value?: string | ProsemirrorData | ProsemirrorNode) {
    const doc = this.createDocument(value || this.props.defaultValue);

    return EditorState.create({
      schema: this.schema,
      doc,
      plugins: [
        ...this.keymaps,
        ...this.plugins,
        anchorPlugin(),
        dropCursor({
          color: this.props.theme.cursor,
        }),
        gapCursor(),
        inputRules({
          rules: this.inputRules,
        }),
        keymap(baseKeymap),
      ],
    });
  }

  private createDocument(content: string | object | ProsemirrorNode) {
    // Already a ProsemirrorNode
    if (content instanceof ProsemirrorNode) {
      return content;
    }

    // Looks like Markdown
    if (typeof content === "string") {
      return this.parser.parse(content) || undefined;
    }

    return ProsemirrorNode.fromJSON(this.schema, content);
  }

  private createView() {
    if (!this.elementRef.current) {
      throw new Error("createView called before ref available");
    }

    const isEditingCheckbox = (tr: Transaction) =>
      tr.steps.some(
        (step) =>
          (step instanceof ReplaceAroundStep || step instanceof ReplaceStep) &&
          step.slice.content?.firstChild?.type.name ===
            this.schema.nodes.checkbox_item.name
      );

    const isEditingComment = (tr: Transaction) =>
      tr.steps.some(
        (step) =>
          (step instanceof AddMarkStep || step instanceof RemoveMarkStep) &&
          step.mark.type.name === this.schema.marks.comment.name
      );

    const self = this; // oxlint-disable-line
    const view = new EditorView(this.elementRef.current, {
      handleDOMEvents: {
        blur: this.handleEditorBlur,
        focus: this.handleEditorFocus,
      },
      attributes: {
        translate: this.props.readOnly ? "yes" : "no",
      },
      state: this.createState(this.props.value),
      editable: () => !this.props.readOnly,
      nodeViews: this.nodeViews,
      dispatchTransaction(this: EditorView, transaction) {
        if (this.isDestroyed) {
          return;
        }

        // callback is bound to have the view instance as its this binding
        const { state, transactions } =
          this.state.applyTransaction(transaction);

        this.updateState(state);

        // If any of the transactions being dispatched resulted in the doc
        // changing then call our own change handler to let the outside world
        // know
        if (
          transactions.some((tr) => tr.docChanged) &&
          (!self.props.readOnly ||
            (self.props.canUpdate && transactions.some(isEditingCheckbox)) ||
            (self.props.canComment && transactions.some(isEditingComment)))
        ) {
          self.handleChange();
        }

        self.handleEditorInit();

        self.calculateDir();

        // Because Prosemirror and React are not linked we must tell React that
        // a render is needed whenever the Prosemirror state changes.
        self.forceUpdate();
      },
    });

    // Tell third-party libraries and screen-readers that this is an input
    view.dom.setAttribute("role", "textbox");
    view.dom.setAttribute("aria-label", "Editor content");

    return view;
  }

  public async scrollToAnchor(hash: string) {
    if (!hash) {
      return;
    }

    function isVisible(element: HTMLElement | null) {
      for (let e = element; e; e = e.parentElement) {
        const s = getComputedStyle(e);
        if (s.display === "none" || s.opacity === "0") {
          return false;
        }
      }
      return true;
    }

    try {
      this.mutationObserver?.disconnect();
      this.mutationObserver = observe(
        hash,
        (element) => {
          const pos = this.view.posAtDOM(element, 0, 1);
          this.view.dispatch(
            this.view.state.tr.setSelection(
              TextSelection.near(this.view.state.doc.resolve(pos), 1)
            )
          );

          if (isVisible(element)) {
            element.scrollIntoView();
          }
        },
        this.elementRef.current || undefined
      );
    } catch (_err) {
      // querySelector will throw an error if the hash begins with a number
      // or contains a period. This is protected against now by safeSlugify
      // however previous links may be in the wild.
      Logger.debug("editor", `Attempted to scroll to invalid hash: ${hash}`);
    }
  }

  public value = (asString = true, trim?: boolean) => {
    if (asString) {
      const content = this.serializer.serialize(this.view.state.doc);
      return trim ? content.trim() : content;
    }

    return (
      trim ? ProsemirrorHelper.trim(this.view.state.doc) : this.view.state.doc
    ).toJSON();
  };

  private calculateDir = () => {
    if (!this.elementRef.current) {
      return;
    }

    const isRTL =
      this.props.dir === "rtl" ||
      getComputedStyle(this.elementRef.current).direction === "rtl";

    if (this.state.isRTL !== isRTL) {
      this.setState({ isRTL });
    }
  };

  /**
   * Focus the editor at the start of the content.
   */
  public focusAtStart = () => {
    const selection = Selection.atStart(this.view.state.doc);
    const transaction = this.view.state.tr.setSelection(selection);
    this.view.dispatch(transaction);
    this.view.focus();
  };

  /**
   * Focus the editor at the end of the content.
   */
  public focusAtEnd = () => {
    const selection = Selection.atEnd(this.view.state.doc);
    const transaction = this.view.state.tr.setSelection(selection);
    this.view.dispatch(transaction);
    this.view.focus();
  };

  /**
   * Focus the editor and scroll to the current selection.
   */
  public focus = () => {
    this.view.focus();
    this.view.dispatch(this.view.state.tr.scrollIntoView());
  };

  /**
   * Blur the editor.
   */
  public blur = () => {
    (this.view.dom as HTMLElement).blur();

    // Have Safari remove the caret.
    window?.getSelection()?.removeAllRanges();
  };

  /**
   * Insert files at the current selection.
   * =
   * @param event The source event
   * @param files The files to insert
   * @returns True if the files were inserted
   */
  public insertFiles = (
    event: React.ChangeEvent<HTMLInputElement>,
    files: File[]
  ) =>
    insertFiles(
      this.view,
      event,
      this.view.state.selection.to,
      files,
      this.props
    );

  /**
   * Returns true if the trimmed content of the editor is an empty string.
   *
   * @returns True if the editor is empty
   */
  public isEmpty = () => ProsemirrorHelper.isEmpty(this.view.state.doc);

  /**
   * Return the headings in the current editor.
   *
   * @returns A list of headings in the document
   */
  public getHeadings = () => ProsemirrorHelper.getHeadings(this.view.state.doc);

  /**
   * Return the images in the current editor.
   *
   * @returns A list of images in the document
   */
  public getImages = () => ProsemirrorHelper.getImages(this.view.state.doc);

  public getLightboxImages = (): LightboxImage[] => {
    const lightboxNodes = ProsemirrorHelper.getLightboxNodes(
      this.view.state.doc
    );

    return map(lightboxNodes, (node) =>
      LightboxImageFactory.createLightboxImage(this.view, node.pos)
    );
  };

  /**
   * Return the tasks/checkmarks in the current editor.
   *
   * @returns A list of tasks in the document
   */
  public getTasks = () => ProsemirrorHelper.getTasks(this.view.state.doc);

  /**
   * Return the comments in the current editor.
   *
   * @returns A list of comments in the document
   */
  public getComments = () => ProsemirrorHelper.getComments(this.view.state.doc);

  /**
   * Remove all marks related to a specific comment from the document.
   *
   * @param commentId The id of the comment to remove
   */
  public removeComment = (commentId: string) => {
    const { state, dispatch } = this.view;
    const tr = state.tr;
    let markRemoved = false;

    state.doc.descendants((node, pos) => {
      if (markRemoved) {
        return false;
      }
      const mark = node.marks.find(
        (m) => m.type === state.schema.marks.comment && m.attrs.id === commentId
      );

      if (mark) {
        tr.removeMark(pos, pos + node.nodeSize, mark);
        markRemoved = true;
        return;
      }

      if (isArray(node.attrs?.marks)) {
        const existingMarks = node.attrs.marks;
        const updatedMarks = existingMarks.filter(
          (mark: any) => mark.attrs.id !== commentId
        );
        const attrs = {
          ...node.attrs,
          marks: updatedMarks,
        };
        tr.setNodeMarkup(pos, undefined, attrs);
        markRemoved = true;
      }

      return;
    });

    dispatch(tr);
  };

  /**
   * Update all marks related to a specific comment in the document.
   *
   * @param commentId The id of the comment to update
   * @param attrs The attributes to update
   */
  public updateComment = (
    commentId: string,
    attrs: { resolved?: boolean; draft?: boolean }
  ) => {
    const { state, dispatch } = this.view;
    const tr = state.tr;
    let markUpdated = false;

    state.doc.descendants((node, pos) => {
      if (markUpdated) {
        return false;
      }

      const mark = node.marks.find(
        (m) => m.type === state.schema.marks.comment && m.attrs.id === commentId
      );

      if (mark) {
        const from = pos;
        const to = pos + node.nodeSize;
        const newMark = state.schema.marks.comment.create({
          ...mark.attrs,
          ...attrs,
        });
        tr.removeMark(from, to, mark).addMark(from, to, newMark);
        markUpdated = true;
        return;
      }

      if (isArray(node.attrs?.marks)) {
        const existingMarks = node.attrs.marks;
        const updatedMarks = existingMarks.map((mark: any) =>
          mark.type === "comment" && mark.attrs.id === commentId
            ? { ...mark, attrs: { ...mark.attrs, ...attrs } }
            : mark
        );
        const newAttrs = {
          ...node.attrs,
          marks: updatedMarks,
        };
        tr.setNodeMarkup(pos, undefined, newAttrs);
        markUpdated = true;
      }

      return;
    });

    dispatch(tr);
  };

  public updateActiveLightboxImage = (activeImage: LightboxImage | null) => {
    this.setState((state) => ({
      ...state,
      activeLightboxImage: activeImage,
    }));
  };

  /**
   * Return the plain text content of the current editor.
   *
   * @returns A string of text
   */
  public getPlainText = () => {
    const { doc } = this.view.state;

    return textBetween(doc, 0, doc.content.size);
  };

  private dispatchThemeChanged = (event: CustomEvent) => {
    this.view.dispatch(this.view.state.tr.setMeta("theme", event.detail));
  };

  private handleChange = () => {
    if (!this.props.onChange) {
      return;
    }

    this.props.onChange((asString = true, trim = false) =>
      this.view ? this.value(asString, trim) : undefined
    );
  };

  private handleEditorInit = () => {
    if (!this.props.onInit || this.isInitialized) {
      return;
    }

    this.props.onInit();
    this.isInitialized = true;
  };

  private handleEditorDestroy = () => {
    if (!this.props.onDestroy) {
      return;
    }
    this.props.onDestroy();
  };

  private handleEditorBlur = () => {
    this.setState({ isEditorFocused: false });
    return false;
  };

  private handleEditorFocus = () => {
    this.setState({ isEditorFocused: true });
    return false;
  };

  public render() {
    const { readOnly, canUpdate, grow, style, className, onKeyDown } =
      this.props;
    const { isRTL } = this.state;

    return (
      <PortalContext.Provider value={this.wrapperRef.current}>
        <EditorContext.Provider value={this}>
          <Flex
            ref={this.wrapperRef}
            onKeyDown={onKeyDown}
            style={style}
            className={className}
            align="flex-start"
            justify="center"
            column
          >
            <EditorContainer
              $rtl={isRTL}
              grow={grow}
              readOnly={readOnly}
              readOnlyWriteCheckboxes={canUpdate}
              focusedCommentId={this.props.focusedCommentId}
              userId={this.props.userId}
              editorStyle={this.props.editorStyle}
              commenting={!!this.props.onClickCommentMark}
              ref={this.elementRef}
              lang={this.props.lang ?? ""}
            />

            {this.widgets &&
              !this.props.cacheOnly &&
              Object.values(this.widgets).map((Widget, index) => (
                <Widget
                  key={String(index)}
                  rtl={isRTL}
                  readOnly={readOnly}
                  selection={this.view.state.selection}
                />
              ))}
            <Observer>
              {() => (
                <>{Array.from(this.renderers).map((view) => view.content)}</>
              )}
            </Observer>
          </Flex>
          {!isNull(this.state.activeLightboxImage) && (
            <Lightbox
              readOnly={readOnly}
              images={this.getLightboxImages()}
              activeImage={this.state.activeLightboxImage}
              onUpdate={this.updateActiveLightboxImage}
              onClose={this.view.focus.bind(this.view)}
            />
          )}
        </EditorContext.Provider>
      </PortalContext.Provider>
    );
  }
}

const EditorContainer = styled(Styles)<{
  userId?: string;
  focusedCommentId?: string;
}>`
  ${(props) =>
    props.focusedCommentId &&
    css`
      span#comment-${props.focusedCommentId} {
        background: ${transparentize(0.5, props.theme.brand.marine)};
        border-bottom: 2px solid ${props.theme.commentMarkBackground};
      }
      a#comment-${props.focusedCommentId}
        ~ span.component-image
        div.image-wrapper {
        outline: ${props.theme.commentMarkBackground} solid 2px;
      }
    `}

  ${(props) =>
    props.userId &&
    css`
      .mention[data-id="${props.userId}"] {
        color: ${props.theme.textHighlightForeground};
        background: ${props.theme.textHighlight};

        &.ProseMirror-selectednode {
          outline-color: ${props.readOnly
            ? "transparent"
            : darken(0.2, props.theme.textHighlight)};
        }
      }
    `}
`;

const LazyLoadedEditor = React.forwardRef<Editor, Props>(
  function LazyLoadedEditor_(props: Props, ref) {
    return (
      <WithTheme>
        {(theme) => <Editor theme={theme} {...props} ref={ref} />}
      </WithTheme>
    );
  }
);

const observe = (
  selector: string,
  callback: (element: HTMLElement) => void,
  targetNode = document.body
) => {
  const observer = new MutationObserver((mutations) => {
    const match = [...mutations]
      .flatMap((mutation) => [...mutation.addedNodes])
      .find((node: HTMLElement) => node.matches?.(selector));
    if (match) {
      callback(match as HTMLElement);
    }
  });

  if (targetNode.querySelector(selector)) {
    callback(targetNode.querySelector(selector) as HTMLElement);
  } else {
    observer.observe(targetNode, { childList: true, subtree: true });
  }

  return observer;
};

export default LazyLoadedEditor;
