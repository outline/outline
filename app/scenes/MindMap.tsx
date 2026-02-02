import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled, { css } from "styled-components";
import { darken, lighten, transparentize } from "polished";
import { s } from "@shared/styles";
import type { NavigationNode } from "@shared/types";
import { NavigationNodeType } from "@shared/types";
import { Link } from "react-router-dom";
import LoadingIndicator from "~/components/LoadingIndicator";
import Scene from "~/components/Scene";
import Flex from "~/components/Flex";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useRequest from "~/hooks/useRequest";
import useStores from "~/hooks/useStores";
import { client } from "~/utils/ApiClient";

type TreeByCollection = Record<string, NavigationNode[]>;

interface MindMapNode extends NavigationNode {
  children: MindMapNode[];
  isRoot?: boolean;
}

type PositionedNode = {
  node: MindMapNode;
  left: number;
  top: number;
  width: number;
  height: number;
  depth: number;
  parentId?: string;
};

type MindMapLayout = {
  nodes: PositionedNode[];
  connectors: { fromId: string; toId: string }[];
  size: { width: number; height: number };
};

/**
 * Displays a mind map view of collections and documents.
 *
 * @returns Mind map scene.
 */
function MindMap() {
  const { t } = useTranslation();
  const { collections } = useStores();
  const team = useCurrentTeam();
  const [trees, setTrees] = React.useState<TreeByCollection>({});

  const fetchCollections = React.useCallback(
    () => collections.fetchAll({}),
    [collections]
  );
  const { loading: loadingCollections } = useRequest(fetchCollections, true);

  const visibleCollections = React.useMemo(
    () => collections.orderedData,
    [collections]
  );

  const fetchTrees = React.useCallback(async () => {
    const entries = await Promise.all(
      visibleCollections.map(async (collection) => {
        const res = await client.post("/collections.documents", {
          id: collection.id,
        });
        return [collection.id, res.data as NavigationNode[]] as const;
      })
    );

    setTrees(Object.fromEntries(entries));
  }, [visibleCollections]);

  const { loading: loadingTrees, request: requestTrees } = useRequest(
    fetchTrees,
    false
  );

  React.useEffect(() => {
    void requestTrees();
  }, [requestTrees]);

  const collectionNodes = React.useMemo(
    () =>
      visibleCollections.map((collection) => ({
        id: collection.id,
        title: collection.name,
        url: collection.path,
        type: NavigationNodeType.Collection,
        children: trees[collection.id] ?? [],
      })),
    [trees, visibleCollections]
  );

  const normalizedCollections = React.useMemo(
    () => collectionNodes.map((node) => toMindMapNode(node)),
    [collectionNodes]
  );

  const rootNode = React.useMemo<MindMapNode>(
    () => ({
      id: `team-${team.id}`,
      title: team.name,
      url: "",
      type: NavigationNodeType.Collection,
      children: normalizedCollections,
      isRoot: true,
    }),
    [team.id, team.name, normalizedCollections]
  );

  const layout = React.useMemo(() => computeMindMapLayout([rootNode]), [rootNode]);

  const nodeLookup = React.useMemo(() => {
    const map = new Map<string, PositionedNode>();
    layout?.nodes.forEach((value) => {
      map.set(value.node.id, value);
    });
    return map;
  }, [layout]);

  return (
    <Scene title={t("Mind map")} centered={false}>
      {(loadingCollections || loadingTrees) && <LoadingIndicator />}
      {!loadingCollections && !loadingTrees && layout && (
        <MindMapViewport>
          <Canvas $width={layout.size.width} $height={layout.size.height}>
            <ConnectorsLayer
              width={layout.size.width}
              height={layout.size.height}
            >
              {layout.connectors.map((connector) => {
                const from = nodeLookup.get(connector.fromId);
                const to = nodeLookup.get(connector.toId);
                if (!from || !to) {
                  return null;
                }
                return (
                  <ConnectorPath
                    key={`${connector.fromId}-${connector.toId}`}
                    d={buildConnectorPath(from, to)}
                  />
                );
              })}
            </ConnectorsLayer>

            {layout.nodes.map((positioned) => (
              <NodeWrapper
                key={positioned.node.id}
                $left={positioned.left}
                $top={positioned.top}
                $width={positioned.width}
                $height={positioned.height}
              >
                <NodeCard
                  $isRoot={positioned.node.isRoot}
                  $hasParent={!!positioned.parentId}
                  $hasChildren={positioned.node.children?.length > 0}
                >
                  {positioned.node.url ? (
                    <NodeLink to={positioned.node.url}>
                      {truncateTitle(positioned.node.title || t("Untitled"))}
                    </NodeLink>
                  ) : (
                    <NodeLabel>
                      {truncateTitle(positioned.node.title || t("Untitled"))}
                    </NodeLabel>
                  )}
                </NodeCard>
              </NodeWrapper>
            ))}
          </Canvas>
        </MindMapViewport>
      )}
    </Scene>
  );
}

const MindMapViewport = styled.div`
  width: 100%;
  min-height: calc(100vh - 120px);
  padding: 24px;
  background: ${s("background")};
  overflow: auto;
  display: flex;
  justify-content: center;
`;

const Canvas = styled.div<{ $width: number; $height: number }>`
  position: relative;
  width: ${({ $width }) => `${$width}px`};
  height: ${({ $height }) => `${$height}px`};
  min-width: 960px;
  min-height: 600px;
  border-radius: 32px;
  background: ${({ theme }) =>
    theme.isDark
      ? `linear-gradient(180deg, ${darken(0.08, theme.backgroundSecondary)} 0%, ${darken(0.18, theme.background)} 100%)`
      : `linear-gradient(180deg, ${lighten(0.04, theme.backgroundSecondary)} 0%, ${theme.backgroundSecondary} 100%)`};
  box-shadow: ${({ theme }) =>
    theme.isDark
      ? `0 24px 80px ${transparentize(0.35, theme.shadow)}`
      : `0 24px 80px rgba(20, 23, 31, 0.18)`};
`;

const ConnectorsLayer = styled.svg<{ width: number; height: number }>`
  position: absolute;
  inset: 0;
  width: ${({ width }) => `${width}px`};
  height: ${({ height }) => `${height}px`};
  overflow: visible;
  pointer-events: none;
`;

const ConnectorPath = styled.path`
  fill: none;
  stroke: ${({ theme }) =>
    theme.isDark
      ? transparentize(0.25, lighten(0.2, theme.textSecondary))
      : "rgba(157, 160, 172, 0.9)"};
  stroke-width: 3;
  stroke-linecap: round;
`;

const NodeWrapper = styled.div<{
  $left: number;
  $top: number;
  $width: number;
  $height: number;
}>`
  position: absolute;
  left: ${({ $left }) => `${$left}px`};
  top: ${({ $top }) => `${$top}px`};
  width: ${({ $width }) => `${$width}px`};
  height: ${({ $height }) => `${$height}px`};
  display: flex;
  align-items: center;
  justify-content: center;
`;

const knobStyles = css`
  content: "";
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 13px;
  height: 13px;
  border-radius: 999px;
  border: 2px solid rgba(140, 143, 155, 0.6);
  background: #fff;
  box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.08);
  transition: opacity 120ms ease;
`;

const NodeCard = styled(Flex) <{
  $isRoot?: boolean;
  $hasParent: boolean;
  $hasChildren: boolean;
}>`
  position: relative;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-width: 140px;
  padding: 12px 18px;
  border-radius: 16px;
  background: ${({ $isRoot, theme }) =>
    $isRoot ? theme.backgroundSecondary : theme.white};
  color: ${({ theme }) => theme.text};
  font-size: 15px;
  font-weight: 600;
  text-align: center;
  box-shadow: 0 18px 40px rgba(15, 17, 25, 0.18);

  &::before {
    ${knobStyles}
    left: -9px;
    opacity: ${({ $hasParent, $isRoot }) => ($hasParent || $isRoot ? 1 : 0)};
  }

  &::after {
    ${knobStyles}
    right: -9px;
    opacity: ${({ $hasChildren }) => ($hasChildren ? 1 : 0)};
  }
`;

const nodeTextStyles = css`
  text-decoration: none;
  color: inherit;
  width: 100%;
  display: block;
`;

const NodeLink = styled(Link)`
  ${nodeTextStyles}
`;

const NodeLabel = styled.span`
  ${nodeTextStyles}
`;

const NODE_WIDTH = 156;
const NODE_HEIGHT = 48;
const HORIZONTAL_GAP = 140;
const VERTICAL_GAP = 48;
const CANVAS_PADDING = 120;
const MAX_TITLE_LENGTH = 32;

function truncateTitle(title: string) {
  if (title.length <= MAX_TITLE_LENGTH) {
    return title;
  }

  return `${title.slice(0, MAX_TITLE_LENGTH - 1)}…`;
}

function toMindMapNode(node: NavigationNode): MindMapNode {
  return {
    ...node,
    children: (node.children ?? []).map((child) => toMindMapNode(child)),
  };
}

function computeMindMapLayout(nodes: MindMapNode[]): MindMapLayout {
  const positioned: PositionedNode[] = [];
  const connectors: { fromId: string; toId: string }[] = [];
  let currentY = CANVAS_PADDING;
  let maxRight = 0;
  let maxBottom = 0;

  const placeNode = (
    node: MindMapNode,
    depth: number,
    parentId?: string
  ): { top: number; height: number } => {
    const left = CANVAS_PADDING + depth * (NODE_WIDTH + HORIZONTAL_GAP);
    let top: number;
    let spanTop = Number.POSITIVE_INFINITY;
    let spanBottom = Number.NEGATIVE_INFINITY;

    if (node.children?.length) {
      node.children.forEach((child) => {
        const childPlacement = placeNode(child, depth + 1, node.id);
        spanTop = Math.min(spanTop, childPlacement.top);
        spanBottom = Math.max(
          spanBottom,
          childPlacement.top + childPlacement.height
        );
        connectors.push({ fromId: node.id, toId: child.id });
      });

      const childSpan = spanBottom - spanTop;
      const center = spanTop + childSpan / 2;
      top = center - NODE_HEIGHT / 2;
      if (!Number.isFinite(top)) {
        top = currentY;
        currentY += NODE_HEIGHT + VERTICAL_GAP;
      }
    } else {
      top = currentY;
      currentY += NODE_HEIGHT + VERTICAL_GAP;
      spanTop = top;
      spanBottom = top + NODE_HEIGHT;
    }

    const positionedNode: PositionedNode = {
      node,
      left,
      top,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
      depth,
      parentId,
    };

    positioned.push(positionedNode);
    maxRight = Math.max(maxRight, left + NODE_WIDTH + CANVAS_PADDING);
    maxBottom = Math.max(maxBottom, top + NODE_HEIGHT + CANVAS_PADDING);

    const spanHeight = Math.max(spanBottom - spanTop, NODE_HEIGHT);
    return { top, height: spanHeight };
  };

  nodes.forEach((node) => {
    placeNode(node, 0);
  });

  return {
    nodes: positioned,
    connectors,
    size: {
      width: Math.max(maxRight, 960),
      height: Math.max(maxBottom, 640),
    },
  };
}

function buildConnectorPath(from: PositionedNode, to: PositionedNode) {
  const startX = from.left + from.width;
  const startY = from.top + from.height / 2;
  const endX = to.left;
  const endY = to.top + to.height / 2;
  const deltaX = Math.max((endX - startX) * 0.5, 80);

  return `M ${startX} ${startY} C ${startX + deltaX} ${startY}, ${endX - deltaX} ${endY}, ${endX} ${endY}`;
}

export default observer(MindMap);