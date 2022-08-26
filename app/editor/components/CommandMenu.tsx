import { capitalize } from "lodash";
import { findDomRefAtPos, findParentNode } from "prosemirror-utils";
import { EditorView } from "prosemirror-view";
import * as React from "react";
import { Trans } from "react-i18next";
import { Portal } from "react-portal";
import { VisuallyHidden } from "reakit/VisuallyHidden";
import styled from "styled-components";
import insertFiles from "@shared/editor/commands/insertFiles";
import { EmbedDescriptor } from "@shared/editor/embeds";
import { CommandFactory } from "@shared/editor/lib/Extension";
import filterExcessSeparators from "@shared/editor/lib/filterExcessSeparators";
import { MenuItem } from "@shared/editor/types";
import { depths } from "@shared/styles";
import { getEventFiles } from "@shared/utils/files";
import { AttachmentValidation } from "@shared/validations";
import Scrollable from "~/components/Scrollable";
import { Dictionary } from "~/hooks/useDictionary";
import Input from "./Input";

const defaultPosition = {
  left: -1000,
  top: 0,
  bottom: undefined,
  isAbove: false,
};

export type Props<T extends MenuItem = MenuItem> = {
  rtl: boolean;
  isActive: boolean;
  commands: Record<string, CommandFactory>;
  dictionary: Dictionary;
  view: EditorView;
  search: string;
  uploadFile?: (file: File) => Promise<string>;
  onFileUploadStart?: () => void;
  onFileUploadStop?: () => void;
  onShowToast: (message: string) => void;
  onLinkToolbarOpen?: () => void;
  onClose: (insertNewLine?: boolean) => void;
  onClearSearch: () => void;
  embeds?: EmbedDescriptor[];
  renderMenuItem: (
    item: T,
    index: number,
    options: {
      selected: boolean;
      onClick: () => void;
    }
  ) => React.ReactNode;
  filterable?: boolean;
  items: T[];
  id?: string;
};

type State = {
  insertItem?: EmbedDescriptor;
  left?: number;
  top?: number;
  bottom?: number;
  isAbove: boolean;
  selectedIndex: number;
};

class CommandMenu<T = MenuItem> extends React.Component<Props<T>, State> {
  menuRef = React.createRef<HTMLDivElement>();
  inputRef = React.createRef<HTMLInputElement>();

  state: State = {
    left: -1000,
    top: 0,
    bottom: undefined,
    isAbove: false,
    selectedIndex: 0,
    insertItem: undefined,
  };

  componentDidMount() {
    window.addEventListener("keydown", this.handleKeyDown);
  }

  shouldComponentUpdate(nextProps: Props, nextState: State) {
    return (
      nextProps.search !== this.props.search ||
      nextProps.isActive !== this.props.isActive ||
      nextState !== this.state
    );
  }

  componentDidUpdate(prevProps: Props) {
    if (!prevProps.isActive && this.props.isActive) {
      // reset scroll position to top when opening menu as the contents are
      // hidden, not unrendered
      if (this.menuRef.current) {
        this.menuRef.current.scroll({ top: 0 });
      }
      const position = this.calculatePosition(this.props);

      this.setState({
        insertItem: undefined,
        selectedIndex: 0,
        ...position,
      });
    } else if (prevProps.search !== this.props.search) {
      this.setState({ selectedIndex: 0 });
    }
  }

  componentWillUnmount() {
    window.removeEventListener("keydown", this.handleKeyDown);
  }

  handleKeyDown = (event: KeyboardEvent) => {
    if (!this.props.isActive) {
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();

      const item = this.filtered[this.state.selectedIndex];

      if (item) {
        this.insertItem(item);
      } else {
        this.props.onClose(true);
      }
    }

    if (
      event.key === "ArrowUp" ||
      (event.key === "Tab" && event.shiftKey) ||
      (event.ctrlKey && event.key === "p")
    ) {
      event.preventDefault();
      event.stopPropagation();

      if (this.filtered.length) {
        const prevIndex = this.state.selectedIndex - 1;
        const prev = this.filtered[prevIndex];

        this.setState({
          selectedIndex: Math.max(
            0,
            prev?.name === "separator" ? prevIndex - 1 : prevIndex
          ),
        });
      } else {
        this.close();
      }
    }

    if (
      event.key === "ArrowDown" ||
      (event.key === "Tab" && !event.shiftKey) ||
      (event.ctrlKey && event.key === "n")
    ) {
      event.preventDefault();
      event.stopPropagation();

      if (this.filtered.length) {
        const total = this.filtered.length - 1;
        const nextIndex = this.state.selectedIndex + 1;
        const next = this.filtered[nextIndex];

        this.setState({
          selectedIndex: Math.min(
            next?.name === "separator" ? nextIndex + 1 : nextIndex,
            total
          ),
        });
      } else {
        this.close();
      }
    }

    if (event.key === "Escape") {
      this.close();
    }
  };

  insertItem = (item: any) => {
    switch (item.name) {
      case "image":
        return this.triggerFilePick(
          AttachmentValidation.imageContentTypes.join(", ")
        );
      case "attachment":
        return this.triggerFilePick("*");
      case "embed":
        return this.triggerLinkInput(item);
      case "link": {
        this.clearSearch();
        this.props.onClose();
        this.props.onLinkToolbarOpen?.();
        return;
      }
      default:
        this.insertBlock(item);
    }
  };

  close = () => {
    this.props.onClose();
    this.props.view.focus();
  };

  handleLinkInputKeydown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!this.props.isActive) {
      return;
    }
    if (!this.state.insertItem) {
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();

      const href = event.currentTarget.value;
      const matches = this.state.insertItem.matcher(href);

      if (!matches) {
        this.props.onShowToast(this.props.dictionary.embedInvalidLink);
        return;
      }

      this.insertBlock({
        name: "embed",
        attrs: {
          href,
        },
      });
    }

    if (event.key === "Escape") {
      this.props.onClose();
      this.props.view.focus();
    }
  };

  handleLinkInputPaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    if (!this.props.isActive) {
      return;
    }
    if (!this.state.insertItem) {
      return;
    }

    const href = event.clipboardData.getData("text/plain");
    const matches = this.state.insertItem.matcher(href);

    if (matches) {
      event.preventDefault();
      event.stopPropagation();

      this.insertBlock({
        name: "embed",
        attrs: {
          href,
        },
      });
    }
  };

  triggerFilePick = (accept: string) => {
    if (this.inputRef.current) {
      if (accept) {
        this.inputRef.current.accept = accept;
      }
      this.inputRef.current.click();
    }
  };

  triggerLinkInput = (item: EmbedDescriptor) => {
    this.setState({ insertItem: item });
  };

  handleFilePicked = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = getEventFiles(event);

    const {
      view,
      uploadFile,
      onFileUploadStart,
      onFileUploadStop,
      onShowToast,
    } = this.props;
    const { state } = view;
    const parent = findParentNode((node) => !!node)(state.selection);

    this.clearSearch();

    if (!uploadFile) {
      throw new Error("uploadFile prop is required to replace files");
    }

    if (parent) {
      insertFiles(view, event, parent.pos, files, {
        uploadFile,
        onFileUploadStart,
        onFileUploadStop,
        onShowToast,
        dictionary: this.props.dictionary,
        isAttachment: this.inputRef.current?.accept === "*",
      });
    }

    if (this.inputRef.current) {
      this.inputRef.current.value = "";
    }

    this.props.onClose();
  };

  clearSearch = () => {
    this.props.onClearSearch();
  };

  insertBlock(item: MenuItem) {
    this.clearSearch();

    const command = item.name ? this.props.commands[item.name] : undefined;

    if (command) {
      command(item.attrs);
    } else {
      this.props.commands[`create${capitalize(item.name)}`](item.attrs);
    }

    this.props.onClose();
  }

  get caretPosition(): { top: number; left: number } {
    const selection = window.document.getSelection();
    if (!selection || !selection.anchorNode || !selection.focusNode) {
      return {
        top: 0,
        left: 0,
      };
    }

    const range = window.document.createRange();
    range.setStart(selection.anchorNode, selection.anchorOffset);
    range.setEnd(selection.focusNode, selection.focusOffset);

    // This is a workaround for an edgecase where getBoundingClientRect will
    // return zero values if the selection is collapsed at the start of a newline
    // see reference here: https://stackoverflow.com/a/59780954
    const rects = range.getClientRects();
    if (rects.length === 0) {
      // probably buggy newline behavior, explicitly select the node contents
      if (range.startContainer && range.collapsed) {
        range.selectNodeContents(range.startContainer);
      }
    }

    const rect = range.getBoundingClientRect();
    return {
      top: rect.top,
      left: rect.left,
    };
  }

  calculatePosition(props: Props) {
    const { view } = props;
    const { selection } = view.state;
    let startPos;
    try {
      startPos = view.coordsAtPos(selection.from);
    } catch (err) {
      console.warn(err);
      return defaultPosition;
    }

    const domAtPos = view.domAtPos.bind(view);

    const ref = this.menuRef.current;
    const offsetHeight = ref ? ref.offsetHeight : 0;
    const node = findDomRefAtPos(selection.from, domAtPos);
    const paragraph: any = { node };

    if (
      !props.isActive ||
      !paragraph.node ||
      !paragraph.node.getBoundingClientRect
    ) {
      return defaultPosition;
    }

    const { left } = this.caretPosition;
    const { top, bottom, right } = paragraph.node.getBoundingClientRect();
    const margin = 24;

    let leftPos = left + window.scrollX;
    if (props.rtl && ref) {
      leftPos = right - ref.scrollWidth;
    }

    if (startPos.top - offsetHeight > margin) {
      return {
        left: leftPos,
        top: undefined,
        bottom: window.innerHeight - top - window.scrollY,
        isAbove: false,
      };
    } else {
      return {
        left: leftPos,
        top: bottom + window.scrollY,
        bottom: undefined,
        isAbove: true,
      };
    }
  }

  get filtered() {
    const {
      embeds = [],
      search = "",
      uploadFile,
      commands,
      filterable = true,
    } = this.props;
    let items: (EmbedDescriptor | MenuItem)[] = [...this.props.items];
    const embedItems: EmbedDescriptor[] = [];

    for (const embed of embeds) {
      if (embed.title) {
        embedItems.push(
          new EmbedDescriptor({
            ...embed,
            name: "embed",
          })
        );
      }
    }

    if (embedItems.length) {
      items = items.concat(
        {
          name: "separator",
        },
        embedItems
      );
    }

    const filtered = items.filter((item) => {
      if (item.name === "separator") {
        return true;
      }

      // Some extensions may be disabled, remove corresponding menu items
      if (
        item.name &&
        !commands[item.name] &&
        !commands[`create${capitalize(item.name)}`]
      ) {
        return false;
      }

      // If no image upload callback has been passed, filter the image block out
      if (!uploadFile && item.name === "image") {
        return false;
      }

      // some items (defaultHidden) are not visible until a search query exists
      if (!search) {
        return !item.defaultHidden;
      }

      const n = search.toLowerCase();
      if (!filterable) {
        return item;
      }
      return (
        (item.title || "").toLowerCase().includes(n) ||
        (item.keywords || "").toLowerCase().includes(n)
      );
    });

    return filterExcessSeparators(filtered);
  }

  render() {
    const { dictionary, isActive, uploadFile } = this.props;
    const items = this.filtered;
    const { insertItem, ...positioning } = this.state;

    return (
      <Portal>
        <Wrapper
          id={this.props.id || "block-menu-container"}
          active={isActive}
          ref={this.menuRef}
          hiddenScrollbars
          {...positioning}
        >
          {insertItem ? (
            <LinkInputWrapper>
              <LinkInput
                type="text"
                placeholder={
                  insertItem.title
                    ? dictionary.pasteLinkWithTitle(insertItem.title)
                    : dictionary.pasteLink
                }
                onKeyDown={this.handleLinkInputKeydown}
                onPaste={this.handleLinkInputPaste}
                autoFocus
              />
            </LinkInputWrapper>
          ) : (
            <List>
              {items.map((item, index) => {
                if (item.name === "separator") {
                  return (
                    <ListItem key={index}>
                      <hr />
                    </ListItem>
                  );
                }

                if (!item.title) {
                  return null;
                }

                const handlePointer = () => {
                  if (this.state.selectedIndex !== index) {
                    this.setState({ selectedIndex: index });
                  }
                };

                return (
                  <ListItem
                    key={index}
                    onPointerMove={handlePointer}
                    onPointerDown={handlePointer}
                  >
                    {this.props.renderMenuItem(item as any, index, {
                      selected: index === this.state.selectedIndex,
                      onClick: () => this.insertItem(item),
                    })}
                  </ListItem>
                );
              })}
              {items.length === 0 && (
                <ListItem>
                  <Empty>{dictionary.noResults}</Empty>
                </ListItem>
              )}
            </List>
          )}
          {uploadFile && (
            <VisuallyHidden>
              <label>
                <Trans>Import document</Trans>
                <input
                  type="file"
                  ref={this.inputRef}
                  onChange={this.handleFilePicked}
                />
              </label>
            </VisuallyHidden>
          )}
        </Wrapper>
      </Portal>
    );
  }
}

const LinkInputWrapper = styled.div`
  margin: 8px;
`;

const LinkInput = styled(Input)`
  height: 36px;
  width: 100%;
  color: ${(props) => props.theme.textSecondary};
`;

const List = styled.ol`
  list-style: none;
  text-align: left;
  height: 100%;
  padding: 8px 0;
  margin: 0;
`;

const ListItem = styled.li`
  padding: 0;
  margin: 0;
`;

const Empty = styled.div`
  display: flex;
  align-items: center;
  color: ${(props) => props.theme.textSecondary};
  font-weight: 500;
  font-size: 14px;
  height: 36px;
  padding: 0 16px;
`;

export const Wrapper = styled(Scrollable)<{
  active: boolean;
  top?: number;
  bottom?: number;
  left?: number;
  isAbove: boolean;
}>`
  color: ${(props) => props.theme.textSecondary};
  font-family: ${(props) => props.theme.fontFamily};
  position: absolute;
  z-index: ${depths.editorToolbar};
  ${(props) => props.top !== undefined && `top: ${props.top}px`};
  ${(props) => props.bottom !== undefined && `bottom: ${props.bottom}px`};
  left: ${(props) => props.left}px;
  background: ${(props) => props.theme.menuBackground};
  border-radius: 6px;
  box-shadow: rgba(0, 0, 0, 0.05) 0px 0px 0px 1px,
    rgba(0, 0, 0, 0.08) 0px 4px 8px, rgba(0, 0, 0, 0.08) 0px 2px 4px;
  opacity: 0;
  transform: scale(0.95);
  transition: opacity 150ms cubic-bezier(0.175, 0.885, 0.32, 1.275),
    transform 150ms cubic-bezier(0.175, 0.885, 0.32, 1.275);
  transition-delay: 150ms;
  line-height: 0;
  box-sizing: border-box;
  pointer-events: none;
  white-space: nowrap;
  width: 300px;
  height: auto;
  max-height: 324px;

  * {
    box-sizing: border-box;
  }

  hr {
    border: 0;
    height: 0;
    border-top: 1px solid ${(props) => props.theme.divider};
  }

  ${({ active, isAbove }) =>
    active &&
    `
    transform: translateY(${isAbove ? "6px" : "-6px"}) scale(1);
    pointer-events: all;
    opacity: 1;
  `};

  @media print {
    display: none;
  }
`;

export default CommandMenu;
