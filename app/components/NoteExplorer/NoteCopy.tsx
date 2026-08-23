import { observer } from "mobx-react";
import * as React from "react";
import { Trans, useTranslation } from "react-i18next";
import { toast } from "sonner";
import styled from "styled-components";
import type { NavigationNode } from "@shared/types";
import type Note from "~/models/Note";
import Button from "~/components/Button";
import Switch from "~/components/Switch";
import Text from "~/components/Text";
import useNotebookTrees from "~/hooks/useNotebookTrees";
import useStores from "~/hooks/useStores";
import { FlexContainer, Footer } from "./Components";
import NoteExplorer from "./NoteExplorer";
type Props = {
  /** The original note to duplicate */
  note: Note;
  onSubmit: (notes: Note[]) => void;
};
function NoteCopy({ note, onSubmit }: Props) {
  const { t } = useTranslation();
  const { policies } = useStores();
  const notebookTrees = useNotebookTrees();
  const [publish, setPublish] = React.useState<boolean>(!!note.publishedAt);
  const [copying, setCopying] = React.useState<boolean>(false);
  const [recursive, setRecursive] = React.useState<boolean>(true);
  const [selectedPath, selectPath] = React.useState<NavigationNode | null>(
    null
  );
  const items = React.useMemo(() => {
    const nodes = notebookTrees.filter((node) =>
      node.notebookId
        ? policies.get(node.notebookId)?.abilities.createNote
        : true
    );
    return nodes;
  }, [policies, notebookTrees]);
  const copy = async (path = selectedPath) => {
    if (!path) {
      toast.message(t("Select a location to copy"));
      return;
    }
    try {
      setCopying(true);
      const result = await note.duplicate({
        publish,
        recursive,
        title: note.title,
        notebookId: path.notebookId,
        ...(path.type === "document" ? { parentNoteId: path.id } : {}),
      });
      toast.success(t("Document copied"));
      onSubmit(result);
    } catch (_err) {
      toast.error(t("Couldn’t copy the document, try again?"));
    } finally {
      setCopying(false);
    }
  };
  return (
    <FlexContainer column>
      <NoteExplorer
        items={items}
        onSubmit={copy}
        onSelect={selectPath}
        defaultValue={note.parentNoteId || note.notebookId || ""}
      />
      <OptionsContainer>
        {note.notebookId && (
          <Text size="small">
            <Switch
              name="publish"
              label={t("Publish")}
              labelPosition="right"
              checked={publish}
              onChange={setPublish}
            />
          </Text>
        )}
        {note.publishedAt && note.childNotes.length > 0 && (
          <Text size="small">
            <Switch
              name="recursive"
              label={t("Include nested documents")}
              labelPosition="right"
              checked={recursive}
              onChange={setRecursive}
            />
          </Text>
        )}
      </OptionsContainer>
      <Footer justify="space-between" align="center" gap={8}>
        <Text ellipsis type="secondary">
          {selectedPath ? (
            <Trans
              defaults="Copy to <em>{{ location }}</em>"
              values={{ location: selectedPath.title }}
              components={{ em: <strong /> }}
            />
          ) : (
            t("Select a location to copy")
          )}
        </Text>
        <Button disabled={!selectedPath || copying} onClick={() => copy()}>
          {copying ? `${t("Copying")}…` : t("Copy")}
        </Button>
      </Footer>
    </FlexContainer>
  );
}
const OptionsContainer = styled.div`
  border-top: 1px solid ${(props) => props.theme.horizontalRule};
  padding: 16px 24px 0;
  margin-bottom: -1px;
  background: ${(props) => props.theme.modalBackground};
  z-index: 1;
`;
export default observer(NoteCopy);
