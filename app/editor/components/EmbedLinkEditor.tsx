import { OpenIcon, TrashIcon } from "outline-icons";
import { Node } from "prosemirror-model";
import { Selection, TextSelection } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import styled from "styled-components";
import { getMatchingEmbed } from "@shared/editor/lib/embeds";
import Flex from "~/components/Flex";
import Tooltip from "~/components/Tooltip";
import Input from "~/editor/components/Input";
import { Dictionary } from "~/hooks/useDictionary";
import useEmbeds from "~/hooks/useEmbeds";
import ToolbarButton from "./ToolbarButton";

type Props = {
  node: Node;
  view: EditorView;
  dictionary: Dictionary;
};

export function EmbedLinkEditor({ node, view, dictionary }: Props) {
  const { t } = useTranslation();
  const embeds = useEmbeds();

  const url = node.attrs.href as string;
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

  const openEmbed = useCallback(() => {
    window.open(url, "_blank");
  }, [url]);

  const removeEmbed = useCallback(() => {
    const { state, dispatch } = view;
    dispatch(state.tr.deleteSelection());
  }, [view]);

  const updateEmbed = useCallback(() => {
    const matchingEmbed = getMatchingEmbed(embeds, localUrl);

    if (!matchingEmbed) {
      toast.error(t("Sorry, invalid embed link"));
      return;
    }

    const { state, dispatch } = view;
    dispatch(
      state.tr.setNodeMarkup(state.selection.from, undefined, {
        ...node.attrs,
        href: localUrl,
      })
    );

    moveSelectionToEnd();
  }, [t, localUrl, embeds, node, view, moveSelectionToEnd]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.nativeEvent.isComposing) {
        return;
      }

      switch (event.key) {
        case "Enter": {
          event.preventDefault();
          updateEmbed();
          return;
        }

        case "Escape": {
          event.preventDefault();
          moveSelectionToEnd();
          return;
        }
      }
    },
    [updateEmbed, moveSelectionToEnd]
  );

  return (
    <Wrapper>
      <Input
        value={localUrl}
        placeholder={dictionary.pasteLink}
        onChange={(e) => setLocalUrl(e.target.value)}
        onKeyDown={handleKeyDown}
        readOnly={!view.editable}
      />
      <Tooltip content={dictionary.openLink}>
        <ToolbarButton onClick={openEmbed} disabled={!localUrl}>
          <OpenIcon />
        </ToolbarButton>
      </Tooltip>
      {view.editable && (
        <Tooltip content={dictionary.deleteEmbed}>
          <ToolbarButton onClick={removeEmbed}>
            <TrashIcon />
          </ToolbarButton>
        </Tooltip>
      )}
    </Wrapper>
  );
}

const Wrapper = styled(Flex)`
  pointer-events: all;
  gap: 8px;
`;
