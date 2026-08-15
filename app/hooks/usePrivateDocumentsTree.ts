import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { NavigationNode } from "@shared/types";
import { NavigationNodeType } from "@shared/types";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useCurrentUser from "~/hooks/useCurrentUser";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";

/** Sentinel id used for the private section root in document pickers. */
export const PRIVATE_TREE_ID = "$private";

/**
 * React hook that builds a synthetic navigation tree of the user's private
 * documents, for use as a destination in document pickers.
 *
 * @returns the root node of the private tree, or null when the user cannot
 * create private documents.
 */
export default function usePrivateDocumentsTree(): NavigationNode | null {
  const { documents } = useStores();
  const { t } = useTranslation();
  const team = useCurrentTeam();
  const user = useCurrentUser();
  const can = usePolicy(team);
  const memberships = user.privateDocumentMemberships;

  return useMemo(() => {
    if (!can.createPrivateDocument) {
      return null;
    }

    // Collection trees are rooted at depth 1, see useCollectionTrees.
    const root: NavigationNode = {
      id: PRIVATE_TREE_ID,
      title: t("Private"),
      icon: "padlock",
      url: "",
      children: [],
      depth: 1,
      parent: null,
    };

    const buildNode = (
      node: NavigationNode,
      parent: NavigationNode,
      depth: number
    ): NavigationNode => {
      const doc = documents.get(node.id);
      const built: NavigationNode = {
        id: node.id,
        title: doc?.title ?? node.title,
        url: doc?.url ?? node.url,
        icon: doc?.icon ?? node.icon,
        color: doc?.color ?? node.color,
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

    root.children = memberships.flatMap((membership) => {
      const doc = membership.documentId
        ? documents.get(membership.documentId)
        : undefined;
      if (!doc) {
        return [];
      }

      return [
        buildNode(
          {
            id: doc.id,
            title: doc.title,
            url: doc.url,
            icon: doc.icon ?? undefined,
            color: doc.color ?? undefined,
            children: membership.documents ?? [],
          },
          root,
          2
        ),
      ];
    });

    return root;
  }, [can.createPrivateDocument, memberships, documents, t]);
}
