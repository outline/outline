import type { Team } from "@server/models";
import type { NavigationNode } from "@shared/types";
import { NavigationNodeType } from "@shared/types";
import { isLinkNode } from "@shared/utils/collections";

export interface PresentedNavigationNode {
  id: string;
  title: string;
  url: string;
  /** Set for links to external locations, which are not documents. */
  type?: NavigationNodeType.Link;
  children: PresentedNavigationNode[];
}

/**
 * Projects a NavigationNode and its descendants to the minimal shape exposed
 * to API clients, resolving relative `url` fields against the team's base URL.
 *
 * @param team - the team whose base URL anchors relative paths.
 * @param node - the navigation node to present.
 * @returns the presented node with an absolute URL and recursively presented children.
 */
export default function presentNavigationNode(
  team: Team,
  node: NavigationNode
): PresentedNavigationNode {
  return {
    id: node.id,
    title: node.title,
    url: /^https?:\/\//.test(node.url)
      ? node.url
      : new URL(node.url, team.url).href,
    type: isLinkNode(node) ? NavigationNodeType.Link : undefined,
    children: (node.children ?? []).map((child) =>
      presentNavigationNode(team, child)
    ),
  };
}
