import { observer } from "mobx-react";
import { useState, useMemo } from "react";
import { useTranslation, Trans } from "react-i18next";
import { toast } from "sonner";
import styled from "styled-components";
import { ellipsis } from "@shared/styles";
import type { NavigationNode } from "@shared/types";
import type Note from "~/models/Note";
import Button from "~/components/Button";
import NoteExplorer from "~/components/NoteExplorer";
import Flex from "~/components/Flex";
import Text from "~/components/Text";
import useNotebookTrees from "~/hooks/useNotebookTrees";
import useStores from "~/hooks/useStores";
type Props = {
  /** Document to publish */
  note: Note;
};
function NotePublish({ note }: Props) {
  const { dialogs, policies } = useStores();
  const { t } = useTranslation();
  const notebookTrees = useNotebookTrees();
  const [selectedPath, selectPath] = useState<NavigationNode | null>(null);
  const publishOptions = useMemo(
    () =>
      notebookTrees.filter((node) =>
        node.notebookId
          ? policies.get(node.notebookId)?.abilities.createNote
          : true
      ),
    [policies, notebookTrees]
  );
  const publish = async (path = selectedPath) => {
    if (!path) {
      toast.message(t("Select a location to publish"));
      return;
    }
    try {
      const { type, id: parentNoteId } = path;
      const notebookId = path.notebookId as string;
      // Also move it under if selected path corresponds to another doc
      if (type === "document") {
        await note.move({ notebookId, parentNoteId });
      }
      note.notebookId = notebookId;
      await note.save(undefined, { publish: true });
      toast.success(t("Document published"));
      dialogs.closeAllModals();
    } catch (_err) {
      toast.error(t("Couldn’t publish the document, try again?"));
    }
  };
  return (
    <FlexContainer column>
      <NoteExplorer
        items={publishOptions}
        onSubmit={publish}
        onSelect={selectPath}
      />
      <Footer justify="space-between" align="center" gap={8}>
        <StyledText type="secondary">
          {selectedPath ? (
            <Trans
              defaults="Publish in <em>{{ location }}</em>"
              values={{
                location: selectedPath.title,
              }}
              components={{
                em: <strong />,
              }}
            />
          ) : (
            t("Select a location to publish")
          )}
        </StyledText>
        <Button disabled={!selectedPath} onClick={() => publish()}>
          {t("Publish")}
        </Button>
      </Footer>
    </FlexContainer>
  );
}
const FlexContainer = styled(Flex)`
  margin-left: -24px;
  margin-right: -24px;
  margin-bottom: -24px;
  outline: none;
`;
const Footer = styled(Flex)`
  height: 64px;
  border-top: 1px solid ${(props) => props.theme.horizontalRule};
  padding-left: 24px;
  padding-right: 24px;
`;
const StyledText = styled(Text)`
  ${ellipsis()}
  margin-bottom: 0;
`;
export default observer(NotePublish);
