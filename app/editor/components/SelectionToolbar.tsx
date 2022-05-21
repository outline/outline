import { some } from "lodash";
import { NodeSelection, TextSelection } from "prosemirror-state";
import { CellSelection } from "prosemirror-tables";
import { EditorView } from "prosemirror-view";
import * as React from "react";
import createAndInsertLink from "@shared/editor/commands/createAndInsertLink";
import { CommandFactory } from "@shared/editor/lib/Extension";
import filterExcessSeparators from "@shared/editor/lib/filterExcessSeparators";
import getColumnIndex from "@shared/editor/queries/getColumnIndex";
import getMarkRange from "@shared/editor/queries/getMarkRange";
import getRowIndex from "@shared/editor/queries/getRowIndex";
import isMarkActive from "@shared/editor/queries/isMarkActive";
import isNodeActive from "@shared/editor/queries/isNodeActive";
import { MenuItem } from "@shared/editor/types";
import { Dictionary } from "~/hooks/useDictionary";
import getDividerMenuItems from "../menus/divider";
import getFormattingMenuItems from "../menus/formatting";
import getImageMenuItems from "../menus/image";
import getTableMenuItems from "../menus/table";
import getTableColMenuItems from "../menus/tableCol";
import getTableRowMenuItems from "../menus/tableRow";
import FloatingToolbar from "./FloatingToolbar";
import LinkEditor, { SearchResult } from "./LinkEditor";
import ToolbarMenu from "./ToolbarMenu";

type Props = {
  dictionary: Dictionary;
  rtl: boolean;
  isTemplate: boolean;
  commands: Record<string, CommandFactory>;
  onOpen: () => void;
  onClose: () => void;
  onSearchLink?: (term: string) => Promise<SearchResult[]>;
  onClickLink: (
    href: string,
    event: MouseEvent | React.MouseEvent<HTMLButtonElement>
  ) => void;
  onCreateLink?: (title: string) => Promise<string>;
  onShowToast: (message: string) => void;
  view: EditorView;
};

function isVisible(props: Props) {
  const { view } = props;
  const { selection, doc } = view.state;

  if (isMarkActive(view.state.schema.marks.link)(view.state)) {
    return true;
  }
  if (!selection || selection.empty) {
    return false;
  }
  if (selection instanceof NodeSelection && selection.node.type.name === "hr") {
    return true;
  }
  if (
    selection instanceof NodeSelection &&
    selection.node.type.name === "image"
  ) {
    return true;
  }
  if (selection instanceof NodeSelection) {
    return false;
  }

  const selectionText = doc.cut(selection.from, selection.to).textContent;
  if (selection instanceof TextSelection && !selectionText) {
    return false;
  }

  const slice = selection.content();
  const fragment = slice.content;
  const nodes = (fragment as any).content;

  return some(nodes, (n) => n.content.size);
}

export default class SelectionToolbar extends React.Component<Props> {
  isActive = false;
  menuRef = React.createRef<HTMLDivElement>();

  componentDidUpdate(): void {
    const visible = isVisible(this.props);
    if (this.isActive && !visible) {
      this.isActive = false;
      this.props.onClose();
    }
    if (!this.isActive && visible) {
      this.isActive = true;
      this.props.onOpen();
    }
  }

  componentDidMount(): void {
    window.addEventListener("mouseup", this.handleClickOutside);
  }

  componentWillUnmount(): void {
    window.removeEventListener("mouseup", this.handleClickOutside);
  }

  handleClickOutside = (ev: MouseEvent): void => {
    if (
      ev.target instanceof HTMLElement &&
      this.menuRef.current &&
      this.menuRef.current.contains(ev.target)
    ) {
      return;
    }

    if (!this.isActive) {
      return;
    }

    const { view } = this.props;
    if (view.hasFocus()) {
      return;
    }

    const { dispatch } = view;

    dispatch(
      view.state.tr.setSelection(new TextSelection(view.state.doc.resolve(0)))
    );
  };

  handleOnCreateLink = async (title: string): Promise<void> => {
    const { dictionary, onCreateLink, view, onShowToast } = this.props;

    if (!onCreateLink) {
      return;
    }

    const { dispatch, state } = view;
    const { from, to } = state.selection;
    if (from === to) {
      // selection cannot be collapsed
      return;
    }

    const href = `creating#${title}…`;
    const markType = state.schema.marks.link;

    // Insert a placeholder link
    dispatch(
      view.state.tr
        .removeMark(from, to, markType)
        .addMark(from, to, markType.create({ href }))
    );

    createAndInsertLink(view, title, href, {
      onCreateLink,
      onShowToast,
      dictionary,
    });
  };

  handleOnSelectLink = ({
    href,
    from,
    to,
  }: {
    href: string;
    from: number;
    to: number;
  }): void => {
    const { view } = this.props;
    const { state, dispatch } = view;

    const markType = state.schema.marks.link;

    dispatch(
      state.tr
        .removeMark(from, to, markType)
        .addMark(from, to, markType.create({ href }))
    );
  };

  render() {
    const { dictionary, onCreateLink, isTemplate, rtl, ...rest } = this.props;
    const { view } = rest;
    const { state } = view;
    const { selection }: { selection: any } = state;
    const isCodeSelection = isNodeActive(state.schema.nodes.code_block)(state);
    const isDividerSelection = isNodeActive(state.schema.nodes.hr)(state);

    // toolbar is disabled in code blocks, no bold / italic etc
    if (isCodeSelection) {
      return null;
    }

    const colIndex = getColumnIndex(
      (state.selection as unknown) as CellSelection
    );
    const rowIndex = getRowIndex((state.selection as unknown) as CellSelection);
    const isTableSelection = colIndex !== undefined && rowIndex !== undefined;
    const link = isMarkActive(state.schema.marks.link)(state);
    const range = getMarkRange(selection.$from, state.schema.marks.link);
    const isImageSelection = selection.node?.type?.name === "image";

    let items: MenuItem[] = [];
    if (isTableSelection) {
      items = getTableMenuItems(dictionary);
    } else if (colIndex !== undefined) {
      items = getTableColMenuItems(state, colIndex, rtl, dictionary);
    } else if (rowIndex !== undefined) {
      items = getTableRowMenuItems(state, rowIndex, dictionary);
    } else if (isImageSelection) {
      items = getImageMenuItems(state, dictionary);
    } else if (isDividerSelection) {
      items = getDividerMenuItems(state, dictionary);
    } else {
      items = getFormattingMenuItems(state, isTemplate, dictionary);
    }

    // Some extensions may be disabled, remove corresponding items
    items = items.filter((item) => {
      if (item.name === "separator") {
        return true;
      }
      if (item.name && !this.props.commands[item.name]) {
        return false;
      }
      return true;
    });

    items = filterExcessSeparators(items);
    if (!items.length) {
      return null;
    }

    return (
      <FloatingToolbar
        view={view}
        active={isVisible(this.props)}
        ref={this.menuRef}
      >
        {link && range ? (
          <LinkEditor
            key={`${range.from}-${range.to}`}
            dictionary={dictionary}
            mark={range.mark}
            from={range.from}
            to={range.to}
            onCreateLink={onCreateLink ? this.handleOnCreateLink : undefined}
            onSelectLink={this.handleOnSelectLink}
            {...rest}
          />
        ) : (
          <ToolbarMenu items={items} {...rest} />
        )}
      </FloatingToolbar>
    );
  }
}
