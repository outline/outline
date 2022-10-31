import { EditorView } from "prosemirror-view";
import * as React from "react";
import { isInternalUrl } from "@shared/utils/urls";
import { Dictionary } from "~/hooks/useDictionary";
import FloatingToolbar from "./FloatingToolbar";
import LinkEditor, { SearchResult } from "./LinkEditor";

type Props = {
  isActive: boolean;
  view: EditorView;
  dictionary: Dictionary;
  onCreateLink?: (title: string) => Promise<string>;
  onSearchLink?: (term: string) => Promise<SearchResult[]>;
  onClickLink: (
    href: string,
    event: React.MouseEvent<HTMLButtonElement>
  ) => void;
  onShowToast: (message: string) => void;
  onClose: () => void;
};

function isActive(props: Props) {
  const { view } = props;
  const { selection } = view.state;

  try {
    const paragraph = view.domAtPos(selection.from);
    return props.isActive && !!paragraph.node;
  } catch (err) {
    return false;
  }
}

export default class PageLinkToolbar extends React.Component<Props> {
  menuRef = React.createRef<HTMLDivElement>();

  state = {
    left: -1000,
    top: undefined,
  };

  componentDidMount() {
    window.addEventListener("mousedown", this.handleClickOutside);
  }

  componentWillUnmount() {
    window.removeEventListener("mousedown", this.handleClickOutside);
  }

  handleClickOutside = (event: Event) => {
    if (
      event.target instanceof HTMLElement &&
      this.menuRef.current &&
      this.menuRef.current.contains(event.target)
    ) {
      return;
    }

    this.props.onClose();
  };

  handleOnCreateLink = async (title: string) => {
    const { onCreateLink, view, onClose } = this.props;

    onClose();
    this.props.view.focus();

    if (!onCreateLink) {
      return;
    }

    const { dispatch, state } = view;
    const { from, to } = state.selection;
    if (from !== to) {
      // selection must be collapsed
      return;
    }

    try {
      const url = await onCreateLink(title);

      if (!isInternalUrl(url)) {
        return;
      }

      dispatch(
        view.state.tr.insert(
          view.state.selection.from,
          view.state.schema.nodes.page_link.create({ title, href: url })
        )
      );
    } catch (err) {
      console.log(err);
    }
  };

  handleOnSelectLink = ({
    href,
    title,
  }: {
    href: string;
    title: string;
    from: number;
    to: number;
  }) => {
    const { view, onClose } = this.props;

    onClose();
    this.props.view.focus();

    const { dispatch, state } = view;
    const { from, to } = state.selection;
    if (from !== to) {
      // selection must be collapsed
      return;
    }

    if (!isInternalUrl(href)) {
      return;
    }

    dispatch(
      view.state.tr.insert(
        view.state.selection.from,
        view.state.schema.nodes.page_link.create({ title, href })
      )
    );
  };

  render() {
    const { onCreateLink, onClose, ...rest } = this.props;
    const { selection } = this.props.view.state;
    const active = isActive(this.props);

    return (
      <FloatingToolbar ref={this.menuRef} active={active} {...rest}>
        {active && (
          <LinkEditor
            key={`${selection.from}-${selection.to}`}
            from={selection.from}
            to={selection.to}
            onCreateLink={onCreateLink ? this.handleOnCreateLink : undefined}
            onSelectLink={this.handleOnSelectLink}
            onRemoveLink={onClose}
            hideOpenLink={true}
            disablePaste={true}
            disableExternalLinks={true}
            defaultPlaceholder={this.props.dictionary.searchDoc}
            {...rest}
          />
        )}
      </FloatingToolbar>
    );
  }
}
