import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { PersonalCollectionId } from "@shared/constants";
import { type NavigationNode, NavigationNodeType } from "@shared/types";
import useCollectionTrees from "~/hooks/useCollectionTrees";
import { useComputed } from "~/hooks/useComputed";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";

/**
 * React hook that returns the collection trees the current user can create
 * documents in. The personal collection is included before it exists, so
 * that it is created when a document is first placed in it.
 *
 * @returns the root node of each destination collection tree.
 */
export function useDestinationTrees(): NavigationNode[] {
  const { collections, policies } = useStores();
  const { t } = useTranslation();
  const team = useCurrentTeam();
  const can = usePolicy(team);
  const collectionTrees = useCollectionTrees();
  const hasPersonal = useComputed(() => !!collections.personal, [collections]);
  const includeNewPersonal = !hasPersonal && !!can.createPersonalCollection;

  return useMemo(() => {
    const trees = collectionTrees.filter((node) =>
      node.collectionId
        ? policies.get(node.collectionId)?.abilities.createDocument
        : true
    );

    if (includeNewPersonal) {
      trees.push({
        id: PersonalCollectionId,
        title: t("Personal"),
        url: "",
        type: NavigationNodeType.Collection,
        collectionId: PersonalCollectionId,
        depth: 1,
        parent: null,
        children: [],
      });
    }

    return trees;
  }, [policies, collectionTrees, includeNewPersonal, t]);
}
