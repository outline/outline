import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import styled, { css } from "styled-components";
import { CloseIcon, CollectionIcon, DocumentIcon } from "outline-icons";
import { NavigationNode, NavigationNodeType } from "@shared/types";
import { sortNavigationNodes } from "@shared/utils/collections";
import { client } from "~/utils/ApiClient";
import useStores from "~/hooks/useStores";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import type Collection from "~/models/Collection";
import type { DefaultTheme } from "styled-components";

interface TreeNode {
  node: NavigationNode;
  children: TreeNode[];
  isExpanded: boolean;
  level: number;
}

interface CollectionTreeProps {
  collections?: Array<{ id: string; name: string }>;
  onHide?: () => void;
}

const CollectionTree = observer(({ collections, onHide }: CollectionTreeProps) => {
  const { t } = useTranslation();
  const { collections: collectionsStore } = useStores();
  const team = useCurrentTeam();
  const [treeData, setTreeData] = React.useState<TreeNode[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [expandedNodes, setExpandedNodes] = React.useState<Set<string>>(new Set());
  const [isVisible, setIsVisible] = React.useState(true);

  React.useEffect(() => {
    const loadTreeData = async () => {
      try {
        setLoading(true);
        const visibleCollections = collectionsStore.orderedData;

        const treeNodes: TreeNode[] = await Promise.all(
          visibleCollections.map(async (collection: Collection) => {
            const res = await client.post("/collections.documents", {
              id: collection.id,
            });
            const documents = res.data as NavigationNode[];

            const rootNode: NavigationNode = {
              id: collection.id,
              title: collection.name,
              url: collection.path,
              type: NavigationNodeType.Collection,
              children: documents,
            };

            return buildTreeNode(rootNode, 0);
          })
        );

        // Add team root
        const teamRoot: TreeNode = {
          node: {
            id: `team-${team.id}`,
            title: team.name,
            url: "",
            type: NavigationNodeType.Collection,
            children: [],
          },
          children: treeNodes,
          isExpanded: true,
          level: 0,
        };

        setTreeData([teamRoot]);
      } catch (error) {
        console.error("Failed to load tree data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (collectionsStore.orderedData.length > 0) {
      void loadTreeData();
    }
  }, [collectionsStore.orderedData, team.id, team.name]);

  const buildTreeNode = (node: NavigationNode, level: number): TreeNode => {
    const sortedChildren = node.children ? sortNavigationNodes(node.children, { field: "title", direction: "asc" }, true) : [];
    return {
      node,
      children: sortedChildren.map(child => buildTreeNode(child, level + 1)),
      isExpanded: level < 2, // Expand first two levels by default
      level,
    };
  };

  const toggleExpanded = (nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  const renderTreeNode = (treeNode: TreeNode): React.ReactNode => {
    const { node, children, level } = treeNode;
    const isExpanded = expandedNodes.has(node.id) || treeNode.isExpanded;
    const hasChildren = children.length > 0;
    const isCollection = node.type === NavigationNodeType.Collection;

    return (
      <TreeItemContainer key={node.id} $level={level}>
        <TreeNodeContent>
          {hasChildren && (
            <ExpandButton
              onClick={() => toggleExpanded(node.id)}
              $isExpanded={isExpanded}
            >
              {isExpanded ? "▼" : "▶"}
            </ExpandButton>
          )}
          {!hasChildren && <Spacer />}
          <NodeIcon>
            {isCollection ? <CollectionIcon /> : <DocumentIcon />}
          </NodeIcon>
          {node.url ? (
            <NodeLink to={node.url}>
              {node.title || t("Untitled")}
            </NodeLink>
          ) : (
            <NodeLabel>
              {node.title || t("Untitled")}
            </NodeLabel>
          )}
        </TreeNodeContent>
        {hasChildren && isExpanded && (
          <TreeChildren>
            {children.map(child => renderTreeNode(child))}
          </TreeChildren>
        )}
      </TreeItemContainer>
    );
  };

  if (loading) {
    return <LoadingMessage>{t("Loading tree structure...")}</LoadingMessage>;
  }

  if (treeData.length === 0) {
    return <EmptyMessage>{t("No collections found")}</EmptyMessage>;
  }

  return (
    <TreeContainer>
      <TreeHeader>
        <TreeTitle>{t("Knowledge Tree")}</TreeTitle>
        <CloseButton onClick={onHide} title={t("Hide tree")}>
          <CloseIcon />
        </CloseButton>
      </TreeHeader>
      <TreeContent>
        {treeData.map(node => renderTreeNode(node))}
      </TreeContent>
    </TreeContainer>
  );
});

const TreeContainer = styled.div`
  background: ${({ theme }) => theme.white};
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
`;

const TreeHeader = styled.div`
  padding: 16px 20px;
  border-bottom: 1px solid ${({ theme }) => theme.divider};
  background: ${({ theme }) => theme.backgroundSecondary};
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const TreeTitle = styled.h3`
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: ${({ theme }) => theme.text};
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.textSecondary};
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: ${({ theme }) => theme.divider};
    color: ${({ theme }) => theme.text};
  }

  svg {
    width: 16px;
    height: 16px;
  }
`;

const TreeContent = styled.div`
  max-height: 600px;
  overflow-y: auto;
`;

const TreeItemContainer = styled.div<{ $level: number }>`
  border-bottom: 1px solid ${({ theme }) => theme.divider};
  &:last-child {
    border-bottom: none;
  }
`;

const TreeNodeContent = styled.div`
  display: flex;
  align-items: center;
  padding: 8px 20px;
  cursor: pointer;
  transition: background-color 0.15s ease;

  &:hover {
    background: ${({ theme }) => theme.backgroundSecondary};
  }
`;

const ExpandButton = styled.button<{ $isExpanded: boolean }>`
  background: none;
  border: none;
  color: ${({ theme }) => theme.textSecondary};
  cursor: pointer;
  font-size: 12px;
  margin-right: 8px;
  padding: 2px;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 2px;

  &:hover {
    background: ${({ theme }) => theme.divider};
  }

  transform: ${({ $isExpanded }) => $isExpanded ? 'rotate(0deg)' : 'rotate(0deg)'};
`;

const Spacer = styled.div`
  width: 24px;
  height: 16px;
`;

const NodeIcon = styled.div`
  margin-right: 8px;
  color: ${({ theme }) => theme.textSecondary};
  flex-shrink: 0;

  svg {
    width: 16px;
    height: 16px;
  }
`;

const nodeTextStyles = css<{ theme: DefaultTheme }>`
  font-size: 14px;
  font-weight: 500;
  color: ${({ theme }) => theme.text};
  text-decoration: none;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  &:hover {
    color: ${({ theme }) => theme.accent};
  }
`;

const NodeLink = styled(Link)`
  ${nodeTextStyles}
`;

const NodeLabel = styled.span`
  ${nodeTextStyles}
`;

const TreeChildren = styled.div`
  border-left: 1px solid ${({ theme }) => theme.divider};
  margin-left: 20px;
`;

const LoadingMessage = styled.div`
  padding: 40px;
  text-align: center;
  color: ${({ theme }) => theme.textSecondary};
`;

const EmptyMessage = styled.div`
  padding: 40px;
  text-align: center;
  color: ${({ theme }) => theme.textSecondary};
`;

export default CollectionTree;
