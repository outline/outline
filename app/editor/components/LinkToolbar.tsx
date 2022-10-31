import { EditorView } from "prosemirror-view";
import * as React from "react";
import createAndInsertLink from "@shared/editor/commands/createAndInsertLink";
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

export default function LinkToolbar(props: Props) {
  const menuRef = React.createRef<HTMLDivElement>();

  const handleClickOutside = React.useCallback(
    (event: Event) => {
      if (
        event.target instanceof HTMLElement &&
        menuRef.current &&
        menuRef.current.contains(event.target)
      ) {
        return;
      }

      props.onClose();
    },
    [menuRef, props]
  );

  React.useEffect(() => {
    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, [handleClickOutside]);

  const handleOnCreateLink = async (title: string) => {
    const { dictionary, onCreateLink, view, onClose, onShowToast } = props;

    onClose();
    props.view.focus();

    if (!onCreateLink) {
      return;
    }

    const { dispatch, state } = view;
    const { from, to } = state.selection;
    if (from !== to) {
      // selection must be collapsed
      return;
    }

    const href = `creating#${title}…`;

    // Insert a placeholder link
    dispatch(
      view.state.tr
        .insertText(title, from, to)
        .addMark(
          from,
          to + title.length,
          state.schema.marks.link.create({ href })
        )
    );

    createAndInsertLink(view, title, href, {
      onCreateLink,
      onShowToast,
      dictionary,
    });
  };

  const handleOnSelectLink = ({
    href,
    title,
  }: {
    href: string;
    title: string;
    from: number;
    to: number;
  }) => {
    const { view, onClose } = props;

    onClose();
    props.view.focus();

    const { dispatch, state } = view;
    const { from, to } = state.selection;
    if (from !== to) {
      // selection must be collapsed
      return;
    }

    dispatch(
      view.state.tr
        .insertText(title, from, to)
        .addMark(
          from,
          to + title.length,
          state.schema.marks.link.create({ href })
        )
    );
  };

  const { onCreateLink, onClose, ...rest } = props;
  const { selection } = props.view.state;
  const active = isActive(props);

  return (
    <FloatingToolbar ref={menuRef} active={active} {...rest}>
      {active && (
        <LinkEditor
          key={`${selection.from}-${selection.to}`}
          from={selection.from}
          to={selection.to}
          onCreateLink={onCreateLink ? handleOnCreateLink : undefined}
          onSelectLink={handleOnSelectLink}
          onRemoveLink={onClose}
          {...rest}
        />
      )}
    </FloatingToolbar>
  );
}
