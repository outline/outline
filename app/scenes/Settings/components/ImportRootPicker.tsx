import { observer } from "mobx-react";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import type { NavigationNode } from "@shared/types";
import { NavigationNodeType } from "@shared/types";
import { AvatarSize } from "~/components/Avatar";
import DocumentExplorer from "~/components/DocumentExplorer";
import Text from "~/components/Text";
import Flex from "~/components/Flex";
import TeamLogo from "~/components/TeamLogo";
import useCollectionTrees from "~/hooks/useCollectionTrees";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useStores from "~/hooks/useStores";

/** The chosen import destination — a collection or a document, never both. */
export type ImportDestination =
  | { collectionId: string; documentId?: undefined }
  | { documentId: string; collectionId?: undefined };

/** The location that creates new collections for the import. */
export const NewCollections = "new-collections";

/** The chosen import location. */
export type ImportLocation = typeof NewCollections | ImportDestination;

type Props = {
  /** The location that is initially selected. */
  defaultValue: ImportLocation | null;
  /** Called whenever the location changes, `null` means nothing is selected. */
  onChange: (location: ImportLocation | null) => void;
};

/**
 * Lets the user pick the location for a workspace import: the workspace itself,
 * which creates new collections, or an existing collection or document. Shared
 * by every import dialog.
 */
function ImportRootPicker({ defaultValue, onChange }: Props) {
  const { t } = useTranslation();
  const { policies } = useStores();
  const team = useCurrentTeam();
  const collectionTrees = useCollectionTrees();
  // The explorer scrolls to its default value whenever it changes, so it is
  // only read on mount.
  const [initialId] = useState(() =>
    defaultValue === NewCollections
      ? NewCollections
      : (defaultValue?.collectionId ?? defaultValue?.documentId)
  );

  // Only offer collections the user can create documents in; documents nested
  // within them inherit selectability and the server enforces the rest.
  const options = useMemo(() => {
    const newCollections: NavigationNode = {
      id: NewCollections,
      title: team.name,
      url: "",
      type: NavigationNodeType.Document,
      // A depth of zero places this row one level left of the collections.
      depth: 0,
      parent: null,
      children: [],
    };

    return [
      newCollections,
      ...collectionTrees.filter((node) =>
        node.collectionId
          ? policies.get(node.collectionId)?.abilities.createDocument
          : true
      ),
    ];
  }, [team.name, policies, collectionTrees]);

  const handleSelect = useCallback(
    (node: NavigationNode | null) => {
      if (!node) {
        onChange(null);
        return;
      }
      if (node.id === NewCollections) {
        onChange(NewCollections);
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

  const renderIcon = useCallback(
    (node: NavigationNode) =>
      node.id === NewCollections ? (
        <LogoContainer align="center" justify="center">
          <TeamLogo model={team} size={AvatarSize.Toast} />
        </LogoContainer>
      ) : undefined,
    [team]
  );

  return (
    <Container column>
      <Text as="p">
        {t(
          "Choose an existing location to import into, or new collections will be created."
        )}
      </Text>
      <ExplorerContainer>
        <DocumentExplorer
          items={options}
          defaultValue={initialId}
          onSelect={handleSelect}
          onSubmit={handleSelect}
          renderIcon={renderIcon}
        />
      </ExplorerContainer>
    </Container>
  );
}

// Matches the size of the other icons in the explorer.
const LogoContainer = styled(Flex)`
  width: 24px;
  height: 24px;
  flex-shrink: 0;
`;

const Container = styled(Flex)`
  flex: 1;
  min-height: 0;
`;

const ExplorerContainer = styled.div`
  display: flex;
  flex: 1;
  min-height: 0;
  margin-left: -24px;
  margin-right: -24px;

  // The explorer sizes its list to the viewport, here it fills the space left.
  > div {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
  }

  > div > :first-child {
    flex: none;
  }

  > div > div:last-child {
    flex: 1;
    height: auto;
    min-height: 0;
  }
`;

export default observer(ImportRootPicker);
