import { EditorView } from "prosemirror-view";
import * as React from "react";
import createAndInsertLink from "@shared/editor/commands/createAndInsertLink";
import { creatingUrlPrefix } from "@shared/utils/urls";
import useDictionary from "~/hooks/useDictionary";
import useEventListener from "~/hooks/useEventListener";
import { useEditor } from "./EditorContext";
import FloatingToolbar from "./FloatingToolbar";
import LinkEditor, { SearchResult } from "./LinkEditor";

type Props = {
  isActive: boolean;
  onCreateLink?: (title: string) => Promise<string>;
  onSearchLink?: (term: string) => Promise<SearchResult[]>;
  onClickLink: (
    href: string,
    event: React.MouseEvent<HTMLButtonElement>
  ) => void;
  onClose: () => void;
};

function isActive(view: EditorView, active: boolean): boolean {
  try {
    const { selection } = view.state;
    const paragraph = view.domAtPos(selection.from);
    return active && !!paragraph.node;
  } catch (err) {
    return false;
  }
}

export default function LinkToolbar({
  onCreateLink,
  onSearchLink,
  onClickLink,
  onClose,
  ...rest
}: Props) {
  const dictionary = useDictionary();
  const { view } = useEditor();
  const menuRef = React.useRef<HTMLDivElement>(null);

  useEventListener("mousedown", (event: Event) => {
    if (
      event.target instanceof HTMLElement &&
      menuRef.current &&
      menuRef.current.contains(event.target)
    ) {
      return;
    }
    onClose();
  });

  const handleOnCreateLink = React.useCallback(
    async (title: string) => {
      onClose();
      view.focus();

      if (!onCreateLink) {
        return;
      }

      const { dispatch, state } = view;
      const { from, to } = state.selection;
      if (from !== to) {
        // selection must be collapsed
        return;
      }

      const href = `${creatingUrlPrefix}#${title}…`;

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

      return createAndInsertLink(view, title, href, {
        onCreateLink,
        dictionary,
      });
    },
    [onCreateLink, onClose, view, dictionary]
  );

  const handleOnSelectLink = React.useCallback(
    ({
      href,
      title,
    }: {
      href: string;
      title: string;
      from: number;
      to: number;
    }) => {
      onClose();
      view.focus();

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
    },
    [onClose, view]
  );

  const { selection } = view.state;
  const active = isActive(view, rest.isActive);

  return (
    <FloatingToolbar ref={menuRef} active={active} width={336}>
      {active && (
        <LinkEditor
          key={`${selection.from}-${selection.to}`}
          from={selection.from}
          to={selection.to}
          onCreateLink={onCreateLink ? handleOnCreateLink : undefined}
          onSelectLink={handleOnSelectLink}
          onRemoveLink={onClose}
          onClickLink={onClickLink}
          onSearchLink={onSearchLink}
          dictionary={dictionary}
          view={view}
        />
      )}
    </FloatingToolbar>
  );
}
