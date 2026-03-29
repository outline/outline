import { observer } from "mobx-react";
import { useState, useMemo } from "react";
import { useTranslation, Trans } from "react-i18next";
import { toast } from "sonner";
import type { NavigationNode } from "@shared/types";
import type Template from "~/models/Template";
import Button from "~/components/Button";
import Text from "~/components/Text";
import useCollectionTrees from "~/hooks/useCollectionTrees";
import useStores from "~/hooks/useStores";
import { FlexContainer, Footer } from "./Components";
import DocumentExplorer from "./DocumentExplorer";

type Props = {
  template: Template;
};

function TemplateMove({ template }: Props) {
  const { dialogs, policies } = useStores();
  const { t } = useTranslation();
  const collectionTrees = useCollectionTrees();
  const [selectedPath, selectPath] = useState<NavigationNode | null>(null);

  const items = useMemo(
    () =>
      collectionTrees
        .map((node) => ({ ...node, children: [] }))
        .filter((node) =>
          node.collectionId
            ? policies.get(node.collectionId)?.abilities.createDocument
            : true
        ),
    [policies, collectionTrees]
  );

  const move = async () => {
    if (!selectedPath) {
      toast.message(t("Select a location to move"));
      return;
    }

    try {
      const collectionId = (selectedPath.collectionId ??
        selectedPath.id) as string;
      await template.save({ collectionId });

      toast.success(t("Template moved"));

      dialogs.closeAllModals();
    } catch (_err) {
      toast.error(t("Couldn’t move the template, try again?"));
    }
  };

  return (
    <FlexContainer column>
      <DocumentExplorer
        items={items}
        onSubmit={move}
        onSelect={selectPath}
        showDocuments={false}
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
        <Button disabled={!selectedPath} onClick={move}>
          {t("Move")}
        </Button>
      </Footer>
    </FlexContainer>
  );
}

export default observer(TemplateMove);
