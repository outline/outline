import flatten from "lodash/flatten";
import { observer } from "mobx-react";
import { useState, useMemo } from "react";
import { useTranslation, Trans } from "react-i18next";
import { toast } from "sonner";
import { NavigationNode } from "@shared/types";
import Template from "~/models/Template";
import Button from "~/components/Button";
import Text from "~/components/Text";
import useStores from "~/hooks/useStores";
import { FlexContainer, Footer } from "./Components";
import DocumentExplorer from "./DocumentExplorer";

type Props = {
  template: Template;
};

function TemplateMove({ template }: Props) {
  const { dialogs, collections, policies } = useStores();
  const { t } = useTranslation();
  const [selectedPath, selectPath] = useState<NavigationNode | null>(null);

  const items = useMemo(
    () =>
      flatten(
        collections.orderedData.map((collection) => ({
          ...collection.asNavigationNode,
          children: [],
        }))
      )
        // Filter out collections that we don't have permission to create documents in.
        .filter((node) =>
          node.collectionId
            ? policies.get(node.collectionId)?.abilities.createDocument
            : true
        ),
    [policies, collections.orderedData]
  );

  const move = async () => {
    if (!selectedPath) {
      toast.message(t("Select a location to move"));
      return;
    }

    try {
      const collectionId = selectedPath.collectionId as string;
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
