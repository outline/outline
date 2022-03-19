/* global File Promise */
import { PluginSimple } from "markdown-it";
import { baseKeymap } from "prosemirror-commands";
import { dropCursor } from "prosemirror-dropcursor";
import { gapCursor } from "prosemirror-gapcursor";
import { inputRules, InputRule } from "prosemirror-inputrules";
import { keymap } from "prosemirror-keymap";
import { MarkdownParser } from "prosemirror-markdown";
import { Schema, NodeSpec, MarkSpec, Node } from "prosemirror-model";
import { EditorState, Selection, Plugin, Transaction } from "prosemirror-state";
import { selectColumn, selectRow, selectTable } from "prosemirror-utils";
import { Decoration, EditorView } from "prosemirror-view";
import * as React from "react";
import { DefaultTheme, ThemeProps } from "styled-components";
import Extension, { CommandFactory } from "@shared/editor/lib/Extension";
import ExtensionManager from "@shared/editor/lib/ExtensionManager";
import headingToSlug from "@shared/editor/lib/headingToSlug";
import { MarkdownSerializer } from "@shared/editor/lib/markdown/serializer";

// marks
import Bold from "@shared/editor/marks/Bold";
import Code from "@shared/editor/marks/Code";
import Comment from "@shared/editor/marks/Comment";
import Highlight from "@shared/editor/marks/Highlight";
import Italic from "@shared/editor/marks/Italic";
import Link from "@shared/editor/marks/Link";
import TemplatePlaceholder from "@shared/editor/marks/Placeholder";
import Strikethrough from "@shared/editor/marks/Strikethrough";
import Underline from "@shared/editor/marks/Underline";

// nodes
import Attachment from "@shared/editor/nodes/Attachment";
import Blockquote from "@shared/editor/nodes/Blockquote";
import BulletList from "@shared/editor/nodes/BulletList";
import CheckboxItem from "@shared/editor/nodes/CheckboxItem";
import CheckboxList from "@shared/editor/nodes/CheckboxList";
import CodeBlock from "@shared/editor/nodes/CodeBlock";
import CodeFence from "@shared/editor/nodes/CodeFence";
import Doc from "@shared/editor/nodes/Doc";
import Embed from "@shared/editor/nodes/Embed";
import Emoji from "@shared/editor/nodes/Emoji";
import HardBreak from "@shared/editor/nodes/HardBreak";
import Heading from "@shared/editor/nodes/Heading";
import HorizontalRule from "@shared/editor/nodes/HorizontalRule";
import Image from "@shared/editor/nodes/Image";
import ListItem from "@shared/editor/nodes/ListItem";
import Notice from "@shared/editor/nodes/Notice";
import OrderedList from "@shared/editor/nodes/OrderedList";
import Paragraph from "@shared/editor/nodes/Paragraph";
import ReactNode from "@shared/editor/nodes/ReactNode";
import Table from "@shared/editor/nodes/Table";
import TableCell from "@shared/editor/nodes/TableCell";
import TableHeadCell from "@shared/editor/nodes/TableHeadCell";
import TableRow from "@shared/editor/nodes/TableRow";
import Text from "@shared/editor/nodes/Text";

// plugins
import BlockMenuTrigger from "@shared/editor/plugins/BlockMenuTrigger";
import EmojiTrigger from "@shared/editor/plugins/EmojiTrigger";
import Folding from "@shared/editor/plugins/Folding";
import History from "@shared/editor/plugins/History";
import Keys from "@shared/editor/plugins/Keys";
import MaxLength from "@shared/editor/plugins/MaxLength";
import PasteHandler from "@shared/editor/plugins/PasteHandler";
import Placeholder from "@shared/editor/plugins/Placeholder";
import SmartText from "@shared/editor/plugins/SmartText";
import TrailingNode from "@shared/editor/plugins/TrailingNode";
import { EmbedDescriptor, ToastType } from "@shared/editor/types";
import Flex from "~/components/Flex";
import { Dictionary } from "~/hooks/useDictionary";
import BlockMenu from "./components/BlockMenu";
import ComponentView from "./components/ComponentView";
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
  /** Additional extensions to load into the editor */
  extensions?: Extension[];
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
  /** Callback when a comment mark is clicked */
  onClickComment?: (commentId: string) => void;
  /** Callback when a comment mark is created */
  onDraftComment?: (commentId: string) => void;
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
  onShowToast: (message: string, code: ToastType) => void;
  className?: string;
  style?: React.CSSProperties;
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
    extensions: [],
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
  element?: HTMLElement | null;
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
      node: Node,
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

  componentDidMount() {
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

  componentDidUpdate(prevProps: Props) {
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
      if (this.props.onBlur) {
        this.props.onBlur();
      }
    }

    if (
      this.isBlurred &&
      (this.state.isEditorFocused ||
        this.state.blockMenuOpen ||
        this.state.linkMenuOpen ||
        this.state.selectionMenuOpen)
    ) {
      this.isBlurred = false;
      if (this.props.onFocus) {
        this.props.onFocus();
      }
    }
  }

  init() {
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

  createExtensions() {
    const { dictionary } = this.props;

    // adding nodes here? Update server/editor/renderToHtml.ts for serialization
    // on the server
    return new ExtensionManager(
      [
        ...[
          new Doc(),
          new HardBreak(),
          new Paragraph(),
          new Blockquote(),
          new CodeBlock({
            dictionary,
            onShowToast: this.props.onShowToast,
          }),
          new CodeFence({
            dictionary,
            onShowToast: this.props.onShowToast,
          }),
          new Emoji(),
          new Text(),
          new CheckboxList(),
          new CheckboxItem(),
          new BulletList(),
          new Embed({ embeds: this.props.embeds }),
          new ListItem(),
          new Attachment({
            dictionary,
          }),
          new Notice({
            dictionary,
          }),
          new Heading({
            dictionary,
            onShowToast: this.props.onShowToast,
          }),
          new HorizontalRule(),
          new Image({
            dictionary,
            uploadFile: this.props.uploadFile,
            onFileUploadStart: this.props.onFileUploadStart,
            onFileUploadStop: this.props.onFileUploadStop,
            onShowToast: this.props.onShowToast,
          }),
          new Table(),
          new TableCell({
            onSelectTable: this.handleSelectTable,
            onSelectRow: this.handleSelectRow,
          }),
          new TableHeadCell({
            onSelectColumn: this.handleSelectColumn,
          }),
          new TableRow(),
          new Bold(),
          new Comment({
            onDraftComment: this.props.onDraftComment,
            onClickComment: this.props.onClickComment,
          }),
          new Code(),
          new Highlight(),
          new Italic(),
          new TemplatePlaceholder(),
          new Underline(),
          new Link({
            onKeyboardShortcut: this.handleOpenLinkMenu,
            onClickLink: this.props.onClickLink,
            onClickHashtag: this.props.onClickHashtag,
            onHoverLink: this.props.onHoverLink,
          }),
          new Strikethrough(),
          new OrderedList(),
          new History(),
          new Folding(),
          new SmartText(),
          new TrailingNode(),
          new PasteHandler(),
          new Keys({
            onBlur: this.handleEditorBlur,
            onFocus: this.handleEditorFocus,
            onSave: this.handleSave,
            onSaveAndExit: this.handleSaveAndExit,
            onCancel: this.props.onCancel,
          }),
          new BlockMenuTrigger({
            dictionary,
            onOpen: this.handleOpenBlockMenu,
            onClose: this.handleCloseBlockMenu,
          }),
          new EmojiTrigger({
            onOpen: (search: string) => {
              this.setState({ emojiMenuOpen: true, blockMenuSearch: search });
            },
            onClose: () => {
              this.setState({ emojiMenuOpen: false });
            },
          }),
          new Placeholder({
            placeholder: this.props.placeholder,
          }),
          new MaxLength({
            maxLength: this.props.maxLength,
          }),
        ],
        ...(this.props.extensions || []),
      ],
      this
    );
  }

  createPlugins() {
    return this.extensions.plugins;
  }

  createRulePlugins() {
    return this.extensions.rulePlugins;
  }

  createKeymaps() {
    return this.extensions.keymaps({
      schema: this.schema,
    });
  }

  createInputRules() {
    return this.extensions.inputRules({
      schema: this.schema,
    });
  }

  createNodeViews() {
    return this.extensions.extensions
      .filter((extension: ReactNode) => extension.component)
      .reduce((nodeViews, extension: ReactNode) => {
        const nodeView = (
          node: Node,
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

  createCommands() {
    return this.extensions.commands({
      schema: this.schema,
      view: this.view,
    });
  }

  createNodes() {
    return this.extensions.nodes;
  }

  createMarks() {
    return this.extensions.marks;
  }

  createSchema() {
    return new Schema({
      nodes: this.nodes,
      marks: this.marks,
    });
  }

  createSerializer() {
    return this.extensions.serializer();
  }

  createParser() {
    return this.extensions.parser({
      schema: this.schema,
      plugins: this.rulePlugins,
    });
  }

  createPasteParser() {
    return this.extensions.parser({
      schema: this.schema,
      rules: { linkify: true, emoji: false },
      plugins: this.rulePlugins,
    });
  }

  createState(value?: string) {
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

  createDocument(content: string) {
    return this.parser.parse(content);
  }

  createView() {
    if (!this.element) {
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
    const view = new EditorView(this.element, {
      state: this.createState(this.props.value),
      editable: () => !this.props.readOnly,
      nodeViews: this.nodeViews,
      dispatchTransaction: function (transaction) {
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

  scrollToAnchor(hash: string) {
    if (!hash) {
      return;
    }

    try {
      const element = document.querySelector(hash);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    } catch (err) {
      // querySelector will throw an error if the hash begins with a number
      // or contains a period. This is protected against now by safeSlugify
      // however previous links may be in the wild.
      console.warn(`Attempted to scroll to invalid hash: ${hash}`, err);
    }
  }

  calculateDir = () => {
    if (!this.element) {
      return;
    }

    const isRTL =
      this.props.dir === "rtl" ||
      getComputedStyle(this.element).direction === "rtl";

    if (this.state.isRTL !== isRTL) {
      this.setState({ isRTL });
    }
  };

  value = (): string => {
    return this.serializer.serialize(this.view.state.doc);
  };

  handleChange = () => {
    if (!this.props.onChange) {
      return;
    }

    this.props.onChange(() => {
      return this.view ? this.value() : undefined;
    });
  };

  handleSave = () => {
    const { onSave } = this.props;
    if (onSave) {
      onSave({ done: false });
    }
  };

  handleSaveAndExit = () => {
    const { onSave } = this.props;
    if (onSave) {
      onSave({ done: true });
    }
  };

  handleEditorBlur = () => {
    this.setState({ isEditorFocused: false });
  };

  handleEditorFocus = () => {
    this.setState({ isEditorFocused: true });
  };

  handleOpenSelectionMenu = () => {
    this.setState({ blockMenuOpen: false, selectionMenuOpen: true });
  };

  handleCloseSelectionMenu = () => {
    this.setState({ selectionMenuOpen: false });
  };

  handleOpenLinkMenu = () => {
    this.setState({ blockMenuOpen: false, linkMenuOpen: true });
  };

  handleCloseLinkMenu = () => {
    this.setState({ linkMenuOpen: false });
  };

  handleOpenBlockMenu = (search: string) => {
    this.setState({ blockMenuOpen: true, blockMenuSearch: search });
  };

  handleCloseBlockMenu = () => {
    if (!this.state.blockMenuOpen) {
      return;
    }
    this.setState({ blockMenuOpen: false });
  };

  handleSelectRow = (index: number, state: EditorState) => {
    this.view.dispatch(selectRow(index)(state.tr));
  };

  handleSelectColumn = (index: number, state: EditorState) => {
    this.view.dispatch(selectColumn(index)(state.tr));
  };

  handleSelectTable = (state: EditorState) => {
    this.view.dispatch(selectTable(state.tr));
  };

  // 'public' methods
  focusAtStart = () => {
    const selection = Selection.atStart(this.view.state.doc);
    const transaction = this.view.state.tr.setSelection(selection);
    this.view.dispatch(transaction);
    this.view.focus();
  };

  focusAtEnd = () => {
    const selection = Selection.atEnd(this.view.state.doc);
    const transaction = this.view.state.tr.setSelection(selection);
    this.view.dispatch(transaction);
    this.view.focus();
  };

  getHeadings = () => {
    const headings: { title: string; level: number; id: string }[] = [];
    const previouslySeen = {};

    this.view.state.doc.forEach((node) => {
      if (node.type.name === "heading") {
        // calculate the optimal slug
        const slug = headingToSlug(node);
        let id = slug;

        // check if we've already used it, and if so how many times?
        // Make the new id based on that number ensuring that we have
        // unique ID's even when headings are identical
        if (previouslySeen[slug] > 0) {
          id = headingToSlug(node, previouslySeen[slug]);
        }

        // record that we've seen this slug for the next loop
        previouslySeen[slug] =
          previouslySeen[slug] !== undefined ? previouslySeen[slug] + 1 : 1;

        headings.push({
          title: node.textContent,
          level: node.attrs.level,
          id,
        });
      }
    });
    return headings;
  };

  render() {
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
          ref={(ref) => (this.element = ref)}
        />
        {!readOnly && this.view && (
          <React.Fragment>
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
              onClose={() => this.setState({ emojiMenuOpen: false })}
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
          </React.Fragment>
        )}
      </Flex>
    );
  }
}

const EditorWithTheme = React.forwardRef<Editor, Props>((props: Props, ref) => {
  return (
    <WithTheme>
      {(theme) => <Editor theme={theme} {...props} ref={ref} />}
    </WithTheme>
  );
});

export default EditorWithTheme;
