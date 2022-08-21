/* global File Promise */
import { PluginSimple } from "markdown-it";
import { baseKeymap } from "prosemirror-commands";
import { dropCursor } from "prosemirror-dropcursor";
import { gapCursor } from "prosemirror-gapcursor";
import { inputRules, InputRule } from "prosemirror-inputrules";
import { keymap } from "prosemirror-keymap";
import { MarkdownParser } from "prosemirror-markdown";
import {
  Schema,
  NodeSpec,
  MarkSpec,
  Node as ProsemirrorNode,
} from "prosemirror-model";
import { EditorState, Selection, Plugin, Transaction } from "prosemirror-state";
import { Decoration, EditorView } from "prosemirror-view";
import * as React from "react";
import { DefaultTheme, ThemeProps } from "styled-components";
import { EmbedDescriptor } from "@shared/editor/embeds";
import Extension, { CommandFactory } from "@shared/editor/lib/Extension";
import ExtensionManager from "@shared/editor/lib/ExtensionManager";
import getHeadings from "@shared/editor/lib/getHeadings";
import getTasks from "@shared/editor/lib/getTasks";
import { MarkdownSerializer } from "@shared/editor/lib/markdown/serializer";
import Mark from "@shared/editor/marks/Mark";
import Node from "@shared/editor/nodes/Node";
import ReactNode from "@shared/editor/nodes/ReactNode";
import fullExtensionsPackage from "@shared/editor/packages/full";
import { EventType } from "@shared/editor/types";
import { IntegrationType } from "@shared/types";
import EventEmitter from "@shared/utils/events";
import Integration from "~/models/Integration";
import Flex from "~/components/Flex";
import { Dictionary } from "~/hooks/useDictionary";
import Logger from "~/utils/Logger";
import BlockMenu from "./components/BlockMenu";
import ComponentView from "./components/ComponentView";
import EditorContext from "./components/EditorContext";
import EmojiMenu from "./components/EmojiMenu";
import { SearchResult } from "./components/LinkEditor";
import LinkToolbar from "./components/LinkToolbar";
import SelectionToolbar from "./components/SelectionToolbar";
import EditorContainer from "./components/Styles";
import WithTheme from "./components/WithTheme";

export { default as Extension } from "@shared/editor/lib/Extension";

export type Props = {
  /** An optional identifier for the editor context. It is used to persist local settings */
  id?: string;
  /** The editor content, should only be changed if you wish to reset the content */
  value?: string;
  /** The initial editor content */
  defaultValue: string;
  /** Placeholder displayed when the editor is empty */
  placeholder: string;
  /** Extensions to load into the editor */
  extensions?: (typeof Node | typeof Mark | typeof Extension | Extension)[];
  /** If the editor should be focused on mount */
  autoFocus?: boolean;
  /** If the editor should not allow editing */
  readOnly?: boolean;
  /** If the editor should still allow editing checkboxes when it is readOnly */
  readOnlyWriteCheckboxes?: boolean;
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
  uploadFile?: (file: File) => Promise<string>;
  /** Callback when editor is blurred, as native input */
  onBlur?: () => void;
  /** Callback when editor is focused, as native input */
  onFocus?: () => void;
  /** Callback when user uses save key combo */
  onSave?: (options: { done: boolean }) => void;
  /** Callback when user uses cancel key combo */
  onCancel?: () => void;
  /** Callback when user changes editor content */
  onChange?: (value: () => string | undefined) => void;
  /** Callback when a file upload begins */
  onFileUploadStart?: () => void;
  /** Callback when a file upload ends */
  onFileUploadStop?: () => void;
  /** Callback when a link is created, should return url to created document */
  onCreateLink?: (title: string) => Promise<string>;
  /** Callback when user searches for documents from link insert interface */
  onSearchLink?: (term: string) => Promise<SearchResult[]>;
  /** Callback when user clicks on any link in the document */
  onClickLink: (
    href: string,
    event: MouseEvent | React.MouseEvent<HTMLButtonElement>
  ) => void;
  /** Callback when user hovers on any link in the document */
  onHoverLink?: (event: MouseEvent) => boolean;
  /** Callback when user clicks on any hashtag in the document */
  onClickHashtag?: (tag: string, event: MouseEvent) => void;
  /** Callback when user presses any key with document focused */
  onKeyDown?: (event: React.KeyboardEvent<HTMLDivElement>) => void;
  /** Collection of embed types to render in the document */
  embeds: EmbedDescriptor[];
  /** Whether embeds should be rendered without an iframe */
  embedsDisabled?: boolean;
  /** Callback when a toast message is triggered (eg "link copied") */
  onShowToast: (message: string) => void;
  className?: string;
  style?: React.CSSProperties;

  embedIntegrations?: Integration<IntegrationType.Embed>[];
};

type State = {
  /** If the document text has been detected as using RTL script */
  isRTL: boolean;
  /** If the editor is currently focused */
  isEditorFocused: boolean;
  /** If the toolbar for a text selection is visible */
  selectionMenuOpen: boolean;
  /** If the block insert menu is visible (triggered with /) */
  blockMenuOpen: boolean;
  /** If the insert link toolbar is visible */
  linkMenuOpen: boolean;
  /** The search term currently filtering the block menu */
  blockMenuSearch: string;
  /** If the emoji insert menu is visible */
  emojiMenuOpen: boolean;
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
    onFileUploadStart: () => {
      // no default behavior
    },
    onFileUploadStop: () => {
      // no default behavior
    },
    embeds: [],
    extensions: fullExtensionsPackage,
  };

  state = {
    isRTL: false,
    isEditorFocused: false,
    selectionMenuOpen: false,
    blockMenuOpen: false,
    linkMenuOpen: false,
    blockMenuSearch: "",
    emojiMenuOpen: false,
  };

  isBlurred: boolean;
  extensions: ExtensionManager;
  element = React.createRef<HTMLDivElement>();
  view: EditorView;
  schema: Schema;
  serializer: MarkdownSerializer;
  parser: MarkdownParser;
  pasteParser: MarkdownParser;
  plugins: Plugin[];
  keymaps: Plugin[];
  inputRules: InputRule[];
  nodeViews: {
    [name: string]: (
      node: ProsemirrorNode,
      view: EditorView,
      getPos: () => number,
      decorations: Decoration<{
        [key: string]: any;
      }>[]
    ) => ComponentView;
  };

  nodes: { [name: string]: NodeSpec };
  marks: { [name: string]: MarkSpec };
  commands: Record<string, CommandFactory>;
  rulePlugins: PluginSimple[];
  events = new EventEmitter();

  public constructor(props: Props & ThemeProps<DefaultTheme>) {
    super(props);
    this.events.on(EventType.linkMenuOpen, this.handleOpenLinkMenu);
    this.events.on(EventType.linkMenuClose, this.handleCloseLinkMenu);
    this.events.on(EventType.blockMenuOpen, this.handleOpenBlockMenu);
    this.events.on(EventType.blockMenuClose, this.handleCloseBlockMenu);
    this.events.on(EventType.emojiMenuOpen, this.handleOpenEmojiMenu);
    this.events.on(EventType.emojiMenuClose, this.handleCloseEmojiMenu);
  }

  /**
   * We use componentDidMount instead of constructor as the init method requires
   * that the dom is already mounted.
   */
  public componentDidMount() {
    this.init();

    if (this.props.scrollTo) {
      this.scrollToAnchor(this.props.scrollTo);
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
    }

    if (this.props.scrollTo && this.props.scrollTo !== prevProps.scrollTo) {
      this.scrollToAnchor(this.props.scrollTo);
    }

    // Focus at the end of the document if switching from readOnly and autoFocus
    // is set to true
    if (prevProps.readOnly && !this.props.readOnly && this.props.autoFocus) {
      this.focusAtEnd();
    }

    if (prevProps.dir !== this.props.dir) {
      this.calculateDir();
    }

    if (
      !this.isBlurred &&
      !this.state.isEditorFocused &&
      !this.state.blockMenuOpen &&
      !this.state.linkMenuOpen &&
      !this.state.selectionMenuOpen
    ) {
      this.isBlurred = true;
      this.props.onBlur?.();
    }

    if (
      this.isBlurred &&
      (this.state.isEditorFocused ||
        this.state.blockMenuOpen ||
        this.state.linkMenuOpen ||
        this.state.selectionMenuOpen)
    ) {
      this.isBlurred = false;
      this.props.onFocus?.();
    }
  }

  private init() {
    this.extensions = this.createExtensions();
    this.nodes = this.createNodes();
    this.marks = this.createMarks();
    this.schema = this.createSchema();
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
      .reduce((nodeViews, extension: ReactNode) => {
        const nodeView = (
          node: ProsemirrorNode,
          view: EditorView,
          getPos: () => number,
          decorations: Decoration<{
            [key: string]: any;
          }>[]
        ) => {
          return new ComponentView(extension.component, {
            editor: this,
            extension,
            node,
            view,
            getPos,
            decorations,
          });
        };

        return {
          ...nodeViews,
          [extension.name]: nodeView,
        };
      }, {});
  }

  private createCommands() {
    return this.extensions.commands({
      schema: this.schema,
      view: this.view,
    });
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
      rules: { linkify: true, emoji: false },
      plugins: this.rulePlugins,
    });
  }

  private createState(value?: string) {
    const doc = this.createDocument(value || this.props.defaultValue);

    return EditorState.create({
      schema: this.schema,
      doc,
      plugins: [
        ...this.plugins,
        ...this.keymaps,
        dropCursor({ color: this.props.theme.cursor }),
        gapCursor(),
        inputRules({
          rules: this.inputRules,
        }),
        keymap(baseKeymap),
      ],
    });
  }

  private createDocument(content: string) {
    return this.parser.parse(content);
  }

  private createView() {
    if (!this.element.current) {
      throw new Error("createView called before ref available");
    }

    const isEditingCheckbox = (tr: Transaction) => {
      return tr.steps.some(
        (step: any) =>
          step.slice?.content?.firstChild?.type.name ===
          this.schema.nodes.checkbox_item.name
      );
    };

    const self = this; // eslint-disable-line
    const view = new EditorView(this.element.current, {
      handleDOMEvents: {
        blur: this.handleEditorBlur,
        focus: this.handleEditorFocus,
      },
      state: this.createState(this.props.value),
      editable: () => !this.props.readOnly,
      nodeViews: this.nodeViews,
      dispatchTransaction(transaction) {
        // callback is bound to have the view instance as its this binding
        const { state, transactions } = this.state.applyTransaction(
          transaction
        );

        this.updateState(state);

        // If any of the transactions being dispatched resulted in the doc
        // changing then call our own change handler to let the outside world
        // know
        if (
          transactions.some((tr) => tr.docChanged) &&
          (!self.props.readOnly ||
            (self.props.readOnlyWriteCheckboxes &&
              transactions.some(isEditingCheckbox)))
        ) {
          self.handleChange();
        }

        self.calculateDir();

        // Because Prosemirror and React are not linked we must tell React that
        // a render is needed whenever the Prosemirror state changes.
        self.forceUpdate();
      },
    });

    // Tell third-party libraries and screen-readers that this is an input
    view.dom.setAttribute("role", "textbox");

    return view;
  }

  public scrollToAnchor(hash: string) {
    if (!hash) {
      return;
    }

    try {
      const element = document.querySelector(hash);
      if (element) {
        setTimeout(() => element.scrollIntoView({ behavior: "smooth" }), 0);
      }
    } catch (err) {
      // querySelector will throw an error if the hash begins with a number
      // or contains a period. This is protected against now by safeSlugify
      // however previous links may be in the wild.
      Logger.debug("editor", `Attempted to scroll to invalid hash: ${hash}`);
    }
  }

  private calculateDir = () => {
    if (!this.element.current) {
      return;
    }

    const isRTL =
      this.props.dir === "rtl" ||
      getComputedStyle(this.element.current).direction === "rtl";

    if (this.state.isRTL !== isRTL) {
      this.setState({ isRTL });
    }
  };

  public value = (): string => {
    return this.serializer.serialize(this.view.state.doc);
  };

  private handleChange = () => {
    if (!this.props.onChange) {
      return;
    }

    this.props.onChange(() => {
      return this.view ? this.value() : undefined;
    });
  };

  private handleEditorBlur = () => {
    this.setState({ isEditorFocused: false });
    return false;
  };

  private handleEditorFocus = () => {
    this.setState({ isEditorFocused: true });
    return false;
  };

  private handleOpenSelectionMenu = () => {
    this.setState({ blockMenuOpen: false, selectionMenuOpen: true });
  };

  private handleCloseSelectionMenu = () => {
    if (!this.state.selectionMenuOpen) {
      return;
    }
    this.setState({ selectionMenuOpen: false });
  };

  private handleOpenEmojiMenu = (search: string) => {
    this.setState({ emojiMenuOpen: true, blockMenuSearch: search });
  };

  private handleCloseEmojiMenu = () => {
    if (!this.state.emojiMenuOpen) {
      return;
    }
    this.setState({ emojiMenuOpen: false });
  };

  private handleOpenLinkMenu = () => {
    this.setState({ blockMenuOpen: false, linkMenuOpen: true });
  };

  private handleCloseLinkMenu = () => {
    this.setState({ linkMenuOpen: false });
  };

  private handleOpenBlockMenu = (search: string) => {
    this.setState({ blockMenuOpen: true, blockMenuSearch: search });
  };

  private handleCloseBlockMenu = (insertNewLine?: boolean) => {
    if (insertNewLine) {
      const transaction = this.view.state.tr.split(
        this.view.state.selection.to
      );
      this.view.dispatch(transaction);
      this.view.focus();
    }
    if (!this.state.blockMenuOpen) {
      return;
    }
    this.setState({ blockMenuOpen: false });
  };

  public focusAtStart = () => {
    const selection = Selection.atStart(this.view.state.doc);
    const transaction = this.view.state.tr.setSelection(selection);
    this.view.dispatch(transaction);
    this.view.focus();
  };

  public focusAtEnd = () => {
    const selection = Selection.atEnd(this.view.state.doc);
    const transaction = this.view.state.tr.setSelection(selection);
    this.view.dispatch(transaction);
    this.view.focus();
  };

  public getHeadings = () => {
    return getHeadings(this.view.state.doc);
  };

  public getTasks = () => {
    return getTasks(this.view.state.doc);
  };

  public render() {
    const {
      dir,
      readOnly,
      readOnlyWriteCheckboxes,
      grow,
      style,
      className,
      dictionary,
      onKeyDown,
    } = this.props;
    const { isRTL } = this.state;

    return (
      <EditorContext.Provider value={this}>
        <Flex
          onKeyDown={onKeyDown}
          style={style}
          className={className}
          align="flex-start"
          justify="center"
          dir={dir}
          column
        >
          <EditorContainer
            dir={dir}
            rtl={isRTL}
            grow={grow}
            readOnly={readOnly}
            readOnlyWriteCheckboxes={readOnlyWriteCheckboxes}
            ref={this.element}
          />
          {!readOnly && this.view && (
            <>
              <SelectionToolbar
                view={this.view}
                dictionary={dictionary}
                commands={this.commands}
                rtl={isRTL}
                isTemplate={this.props.template === true}
                onOpen={this.handleOpenSelectionMenu}
                onClose={this.handleCloseSelectionMenu}
                onSearchLink={this.props.onSearchLink}
                onClickLink={this.props.onClickLink}
                onCreateLink={this.props.onCreateLink}
                onShowToast={this.props.onShowToast}
              />
              <LinkToolbar
                view={this.view}
                dictionary={dictionary}
                isActive={this.state.linkMenuOpen}
                onCreateLink={this.props.onCreateLink}
                onSearchLink={this.props.onSearchLink}
                onClickLink={this.props.onClickLink}
                onShowToast={this.props.onShowToast}
                onClose={this.handleCloseLinkMenu}
              />
              <EmojiMenu
                view={this.view}
                commands={this.commands}
                dictionary={dictionary}
                rtl={isRTL}
                onShowToast={this.props.onShowToast}
                isActive={this.state.emojiMenuOpen}
                search={this.state.blockMenuSearch}
                onClose={this.handleCloseEmojiMenu}
              />
              <BlockMenu
                view={this.view}
                commands={this.commands}
                dictionary={dictionary}
                rtl={isRTL}
                isActive={this.state.blockMenuOpen}
                search={this.state.blockMenuSearch}
                onClose={this.handleCloseBlockMenu}
                uploadFile={this.props.uploadFile}
                onLinkToolbarOpen={this.handleOpenLinkMenu}
                onFileUploadStart={this.props.onFileUploadStart}
                onFileUploadStop={this.props.onFileUploadStop}
                onShowToast={this.props.onShowToast}
                embeds={this.props.embeds}
              />
            </>
          )}
        </Flex>
      </EditorContext.Provider>
    );
  }
}

const LazyLoadedEditor = React.forwardRef<Editor, Props>(
  (props: Props, ref) => {
    return (
      <WithTheme>
        {(theme) => <Editor theme={theme} {...props} ref={ref} />}
      </WithTheme>
    );
  }
);

export default LazyLoadedEditor;
