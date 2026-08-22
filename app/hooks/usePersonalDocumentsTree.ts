import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { NavigationNode } from "@shared/types";
import { NavigationNodeType } from "@shared/types";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";

/**
 * React hook that builds a navigation tree of the user's own personal
 * documents, for use as a destination in document pickers.
 *
 * @returns the root nodes of the personal tree, empty when the user cannot
 * create personal documents.
 */
export default function usePersonalDocumentsTree(): NavigationNode[] {
  const { documents, userMemberships } = useStores();
  const { t } = useTranslation();
  const team = useCurrentTeam();
  const can = usePolicy(team);
  const personal = documents.personal;

  return useMemo(() => {
    if (!can.createPersonalDocument) {
      return [];
    }

    // Collection trees are rooted at depth 1, see useCollectionTrees.
    const root: NavigationNode = {
      id: NavigationNodeType.Personal,
      type: NavigationNodeType.Personal,
      title: t("Personal"),
      icon: "padlock",
      url: "",
      children: [],
      depth: 1,
      parent: null,
    };

    // Prefers the document from the store, falling back to the node the server
    // sent, and takes the children from the tree being walked either way.
    const buildNode = (
      node: NavigationNode,
      parent: NavigationNode,
      depth: number
    ): NavigationNode => {
      const built: NavigationNode = {
        ...node,
        ...documents.get(node.id)?.asNavigationNode,
        type: NavigationNodeType.Document,
        depth,
        parent,
        children: [],
      };
      built.children = (node.children ?? []).map((child) =>
        buildNode(child, built, depth + 1)
      );
      return built;
    };

    root.children = personal.map((document) =>
      buildNode(
        {
          ...document.asNavigationNode,
          children:
            userMemberships.getByDocumentId(document.id)?.documents ?? [],
        },
        root,
        2
      )
    );

    return [root];
  }, [can.createPersonalDocument, personal, documents, userMemberships, t]);
}
