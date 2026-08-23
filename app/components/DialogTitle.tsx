import { observer } from "mobx-react";
import { DocumentIcon } from "outline-icons";
import type * as React from "react";
import styled from "styled-components";
import Icon from "@shared/components/Icon";
import type Notebook from "~/models/Notebook";
import Note from "~/models/Note";
import CollectionIcon from "~/components/Icons/NotebookIcon";
import Text from "~/components/Text";
import useStores from "~/hooks/useStores";
type Props = {
  /** The title of the dialog. */
  title: React.ReactNode;
  /** The note or collection that the dialog acts upon. */
  model?: Note | Notebook;
};
/**
 * Renders a dialog title, additionally showing the name and icon of the model
 * being acted upon when it is not the one currently being viewed.
 *
 * @returns the dialog title, optionally subtitled with the model.
 */
export const DialogTitle = observer(function DialogTitle_({
  title,
  model,
}: Props) {
  const { ui } = useStores();
  if (!model) {
    return <>{title}</>;
  }
  const isNote = model instanceof Note;
  if (
    isNote ? ui.activeNoteId === model.id : ui.activeNotebookId === model.id
  ) {
    return <>{title}</>;
  }
  const icon = !isNote ? (
    <CollectionIcon notebook={model} />
  ) : model.icon ? (
    <Icon
      value={model.icon}
      initial={model.initial}
      color={model.color ?? undefined}
    />
  ) : (
    <DocumentIcon outline={model.isDraft} />
  );
  return (
    <Wrapper>
      {title}
      <Subject type="secondary" size="small">
        {icon}
        <Text type="secondary" ellipsis>
          {isNote ? model.titleWithDefault : model.name}
        </Text>
      </Subject>
    </Wrapper>
  );
});
const Wrapper = styled.span`
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
  margin-top: -4px;
  gap: 4px;
`;
const Subject = styled(Text)`
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  margin-left: -4px;

  > :first-child {
    flex-shrink: 0;
  }

  // Allows the truncated text to shrink rather than widen its ancestors
  > :last-child {
    min-width: 0;
  }
`;
