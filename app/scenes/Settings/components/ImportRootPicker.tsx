import { observer } from "mobx-react";
import { useCallback, useMemo, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import styled from "styled-components";
import { s } from "@shared/styles";
import type { NavigationNode } from "@shared/types";
import { NavigationNodeType } from "@shared/types";
import DocumentExplorer from "~/components/DocumentExplorer";
import Flex from "~/components/Flex";
import Text from "~/components/Text";
import useCollectionTrees from "~/hooks/useCollectionTrees";
import useStores from "~/hooks/useStores";

/** The chosen import destination — a collection or a document, never both. */
export type ImportDestination =
  | { collectionId: string; documentId?: undefined }
  | { documentId: string; collectionId?: undefined };

type Props = {
  /**
   * Called whenever the destination changes. `null` means no destination is
   * selected and new collections will be created for the import.
   */
  onChange: (destination: ImportDestination | null) => void;
};

/**
 * Lets the user pick an existing collection or document as the destination for
 * a workspace import. With no selection the import creates new collections
 * (the default). Shared by every import dialog.
 */
function ImportRootPicker({ onChange }: Props) {
  const { t } = useTranslation();
  const { policies } = useStores();
  const collectionTrees = useCollectionTrees();
  const [selectedPath, setSelectedPath] = useState<NavigationNode | null>(null);

  // Only offer collections the user can create documents in; documents nested
  // within them inherit selectability and the server enforces the rest.
  const options = useMemo(
    () =>
      collectionTrees.filter((node) =>
        node.collectionId
          ? policies.get(node.collectionId)?.abilities.createDocument
          : true
      ),
    [policies, collectionTrees]
  );

  const handleSelect = useCallback(
    (node: NavigationNode | null) => {
      setSelectedPath(node);
      if (!node) {
        onChange(null);
        return;
      }
      onChange(
        node.type === NavigationNodeType.Collection
          ? { collectionId: node.id }
          : { documentId: node.id }
      );
    },
    [onChange]
  );

  return (
    <Flex column gap={8}>
      <ExplorerContainer>
        <DocumentExplorer
          items={options}
          onSelect={handleSelect}
          onSubmit={handleSelect}
        />
      </ExplorerContainer>
      <Text as="span" type="secondary">
        {selectedPath ? (
          <Trans
            defaults="Documents will be imported into <em>{{ location }}</em>"
            values={{ location: selectedPath.title }}
            components={{ em: <strong /> }}
          />
        ) : (
          t("New collections will be created for the imported content")
        )}
      </Text>
    </Flex>
  );
}

const ExplorerContainer = styled.div`
  height: 300px;
  border: 1px solid ${s("divider")};
  border-radius: 8px;
  overflow: hidden;
`;

export default observer(ImportRootPicker);
