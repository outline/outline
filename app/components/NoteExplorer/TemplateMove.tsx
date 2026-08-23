import { observer } from "mobx-react";
import { useState, useMemo } from "react";
import { useTranslation, Trans } from "react-i18next";
import { toast } from "sonner";
import type { NavigationNode } from "@shared/types";
import type Template from "~/models/Template";
import Button from "~/components/Button";
import Text from "~/components/Text";
import useNotebookTrees from "~/hooks/useNotebookTrees";
import useStores from "~/hooks/useStores";
import { FlexContainer, Footer } from "./Components";
import NoteExplorer from "./NoteExplorer";
type Props = {
  template: Template;
};
function TemplateMove({ template }: Props) {
  const { dialogs, policies } = useStores();
  const { t } = useTranslation();
  const notebookTrees = useNotebookTrees();
  const [selectedPath, selectPath] = useState<NavigationNode | null>(null);
  const items = useMemo(
    () =>
      notebookTrees
        .map((node) => ({ ...node, children: [] }))
        .filter((node) =>
          node.notebookId
            ? policies.get(node.notebookId)?.abilities.createNote
            : true
        ),
    [policies, notebookTrees]
  );
  const move = async (path = selectedPath) => {
    if (!path) {
      toast.message(t("Select a location to move"));
      return;
    }
    try {
      const notebookId = (path.notebookId ?? path.id) as string;
      await template.save({ notebookId });
      toast.success(t("Template moved"));
      dialogs.closeAllModals();
    } catch (_err) {
      toast.error(t("Couldn’t move the template, try again?"));
    }
  };
  return (
    <FlexContainer column>
      <NoteExplorer
        items={items}
        onSubmit={move}
        onSelect={selectPath}
        showNotes={false}
      />
      <Footer justify="space-between" align="center" gap={8}>
        <Text ellipsis type="secondary">
          {selectedPath ? (
            <Trans
              defaults="Move to <em>{{ location }}</em>"
              values={{
                location: selectedPath.title,
              }}
              components={{
                em: <strong />,
              }}
            />
          ) : (
            t("Select a location to move")
          )}
        </Text>
        <Button disabled={!selectedPath} onClick={() => move()}>
          {t("Move")}
        </Button>
      </Footer>
    </FlexContainer>
  );
}
export default observer(TemplateMove);
