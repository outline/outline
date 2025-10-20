import { OpenIcon, TrashIcon } from "outline-icons";
import { Node } from "prosemirror-model";
import { Selection, TextSelection } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { useCallback, useState } from "react";
import styled from "styled-components";
import Flex from "~/components/Flex";
import Tooltip from "~/components/Tooltip";
import Input from "~/editor/components/Input";
import { Dictionary } from "~/hooks/useDictionary";
import ToolbarButton from "./ToolbarButton";

type Props = {
  node: Node;
  view: EditorView;
  dictionary: Dictionary;
};

export function MediaLinkEditor({ node, view, dictionary }: Props) {
  const url = (node.attrs.href ?? node.attrs.src) as string;
  const [localUrl, setLocalUrl] = useState(url);

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
  }, [view]);

  const update = useCallback(() => {
    const { state } = view;
    const hrefType = node.type.name === "image" ? "src" : "href";
    const tr = state.tr.setNodeMarkup(state.selection.from, undefined, {
      ...node.attrs,
      [hrefType]: localUrl,
    });

    view.dispatch(tr);
    moveSelectionToEnd();
  }, [localUrl, node, view, moveSelectionToEnd]);

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
          return;
        }
      }
    },
    [update, moveSelectionToEnd]
  );

  return (
    <Wrapper>
      <Input
        autoFocus
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
