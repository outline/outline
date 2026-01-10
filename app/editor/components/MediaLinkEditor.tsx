import { OpenIcon, TrashIcon } from "outline-icons";
import type { Node } from "prosemirror-model";
import { Selection, TextSelection } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import { useCallback, useRef, useState } from "react";
import styled from "styled-components";
import Flex from "~/components/Flex";
import Tooltip from "~/components/Tooltip";
import Input from "~/editor/components/Input";
import type { Dictionary } from "~/hooks/useDictionary";
import ToolbarButton from "./ToolbarButton";
import useOnClickOutside from "~/hooks/useOnClickOutside";

type Props = {
  node?: Node;
  view: EditorView;
  dictionary: Dictionary;
  autoFocus?: boolean;
  onLinkUpdate: () => void;
  onLinkRemove: () => void;
  onEscape: () => void;
  onClickOutside: (ev: MouseEvent | TouchEvent) => void;
};

export function MediaLinkEditor({
  node,
  view,
  dictionary,
  onLinkUpdate,
  onLinkRemove,
  onEscape,
  onClickOutside,
}: Props) {
  const url = (node?.attrs.href ?? node?.attrs.src) as string;
  const [localUrl, setLocalUrl] = useState(url);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // If we're attempting to edit an image, autofocus the input
  // Not doing for embed type because it made the editor scroll to top
  // unexpectedly–leaving that out for now
  const isEditingImgUrl = node?.type.name === "image";

  const moveSelectionToEnd = useCallback(() => {
    const { state, dispatch } = view;
    const nextSelection = Selection.findFrom(
      state.tr.doc.resolve(state.selection.from),
      1,
      true
    );

    const selection = nextSelection ?? TextSelection.create(state.tr.doc, 0);
    dispatch(state.tr.setSelection(selection));
    view.focus();
  }, [view]);

  const openLink = useCallback(() => {
    window.open(url, "_blank");
  }, [url]);

  const remove = useCallback(() => {
    const { state, dispatch } = view;
    dispatch(state.tr.deleteSelection());
    onLinkRemove();
  }, [view]);

  const update = useCallback(() => {
    const { state } = view;
    const hrefType = node?.type.name === "image" ? "src" : "href";
    const tr = state.tr.setNodeMarkup(state.selection.from, undefined, {
      ...node?.attrs,
      [hrefType]: localUrl,
    });

    view.dispatch(tr);
    moveSelectionToEnd();
    onLinkUpdate();
  }, [localUrl, node, view, moveSelectionToEnd]);

  useOnClickOutside(wrapperRef, onClickOutside);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.nativeEvent.isComposing) {
        return;
      }

      switch (event.key) {
        case "Enter": {
          event.preventDefault();
          update();
          return;
        }

        case "Escape": {
          event.preventDefault();
          moveSelectionToEnd();
          onEscape();
          return;
        }
      }
    },
    [update, moveSelectionToEnd]
  );

  if (!node) {
    return null;
  }

  return (
    <Wrapper ref={wrapperRef}>
      <Input
        autoFocus={isEditingImgUrl}
        value={localUrl}
        placeholder={dictionary.pasteLink}
        onChange={(e) => setLocalUrl(e.target.value)}
        onKeyDown={handleKeyDown}
        readOnly={!view.editable}
      />
      <Tooltip content={dictionary.openLink}>
        <ToolbarButton onClick={openLink} disabled={!localUrl}>
          <OpenIcon />
        </ToolbarButton>
      </Tooltip>
      {view.editable && (
        <Tooltip
          content={
            node.type.name === "embed"
              ? dictionary.deleteEmbed
              : dictionary.deleteImage
          }
        >
          <ToolbarButton onClick={remove}>
            <TrashIcon />
          </ToolbarButton>
        </Tooltip>
      )}
    </Wrapper>
  );
}

const Wrapper = styled(Flex)`
  pointer-events: all;
  gap: 6px;
  padding: 6px;
  min-width: 350px;
`;
