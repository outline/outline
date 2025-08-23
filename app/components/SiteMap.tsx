import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { NavigationNode } from "@shared/types";
import { s } from "@shared/styles";
import { NavigationNodeType } from "@shared/types";
import { ArrowIcon, CollectionIcon, DocumentIcon } from "outline-icons";

import useCollectionTrees from "~/hooks/useCollectionTrees";
import useStores from "~/hooks/useStores";

type Props = {
  className?: string;
};

function SiteMap({ className }: Props) {
  const { t } = useTranslation();
  const { collections } = useStores();
  const collectionTrees = useCollectionTrees();

  // Simple state for expanded nodes
  const [expandedNodes, setExpandedNodes] = React.useState<Set<string>>(
    new Set()
  );
  const [loadingNodes, setLoadingNodes] = React.useState<Set<string>>(
    new Set()
  );
  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<any[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);

  // Simple expand function
  const expandNode = async (nodeId: string) => {
    const collection = collections.get(nodeId);

    // Set loading state
    setLoadingNodes((prev) => new Set(prev).add(nodeId));

    // Expand node
    setExpandedNodes((prev) => new Set(prev).add(nodeId));

    // Fetch documents if it's a collection
    if (collection) {
      try {
        await collection.fetchDocuments();
      } catch (_error) {
        // Handle error silently
      }
    }

    // Remove loading state
    setLoadingNodes((prev) => {
      const newSet = new Set(prev);
      newSet.delete(nodeId);
      return newSet;
    });
  };

  // Simple collapse function
  const collapseNode = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const newSet = new Set(prev);
      newSet.delete(nodeId);
      return newSet;
    });
  };

  // Simple toggle function
  const toggleNode = async (nodeId: string) => {
    const isExpanded = expandedNodes.has(nodeId);

    if (isExpanded) {
      collapseNode(nodeId);
    } else {
      await expandNode(nodeId);
    }
  };

  // Toggle all function
  const toggleAll = async () => {
    const hasExpandedNodes = expandedNodes.size > 0;

    if (hasExpandedNodes) {
      // Collapse all
      setExpandedNodes(new Set());
      setLoadingNodes(new Set());
    } else {
      // Expand all
      const allNodeIds = new Set<string>();

      const collectIds = (nodes: NavigationNode[]) => {
        nodes.forEach((node) => {
          allNodeIds.add(node.id);
          if (node.children && node.children.length > 0) {
            collectIds(node.children);
          }
        });
      };

      collectIds(collectionTrees);

      // Set loading for all collections
      const collectionIds = collections.orderedData.map((c) => c.id);
      setLoadingNodes(new Set(collectionIds));

      // Expand all nodes
      setExpandedNodes(allNodeIds);

      // Fetch documents for all collections
      try {
        await Promise.all(
          collections.orderedData.map((collection) =>
            collection.fetchDocuments()
          )
        );
      } catch (_error) {
        // Handle error silently
      }

      // Remove loading state
      setLoadingNodes(new Set());
    }
  };

  // Filter nodes based on search query
  const filterNodes = (nodes: NavigationNode[]): NavigationNode[] => {
    if (!searchQuery.trim()) {
      return nodes;
    }

    const query = searchQuery.toLowerCase();

    const filterNode = (node: NavigationNode): NavigationNode | null => {
      const matchesQuery = node.title.toLowerCase().includes(query);

      // Filter children recursively
      const filteredChildren = node.children
        ? (node.children.map(filterNode).filter(Boolean) as NavigationNode[])
        : [];

      // Return node if it matches or has matching children
      if (matchesQuery || filteredChildren.length > 0) {
        return {
          ...node,
          children: filteredChildren,
        };
      }

      return null;
    };

    return nodes.map(filterNode).filter(Boolean) as NavigationNode[];
  };

  // Search documents using API
  const searchDocuments = React.useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    try {
      const response = await fetch("/api/documents.search_titles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-API-Version": "3",
        },
        body: JSON.stringify({
          query: query,
          statusFilter: ["published", "draft"],
          titleFilter: true,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.data || []);
      } else {
        setSearchResults([]);
      }
    } catch (_error) {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced search effect
  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchDocuments(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, searchDocuments]);

  // Get document path for tooltip
  const getDocumentPath = (documentId: string): string => {
    // Find the document in collections
    for (const collection of collections.orderedData) {
      if (collection.documents) {
        const doc = collection.documents.find((d) => d.id === documentId);
        if (doc) {
          return `${collection.name} / ${doc.title}`;
        }
      }
    }
    return "";
  };

  // Get filtered collection trees
  const filteredCollectionTrees = React.useMemo(() => {
    if (searchQuery.trim() && searchResults.length > 0) {
      // Convert search results to NavigationNode format
      return searchResults.map((doc) => ({
        id: doc.id,
        title: doc.title,
        url: doc.url,
        type: NavigationNodeType.Document,
        children: [],
        parent: null,
        depth: 0,
        collectionId: doc.collectionId,
      }));
    }
    return filterNodes(collectionTrees);
  }, [collectionTrees, searchQuery, searchResults]);

  // Render a single node
  const renderNode = (node: NavigationNode, depth: number = 0) => {
    const isCollection = node.type === NavigationNodeType.Collection;
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes.has(node.id);
    const isLoading = loadingNodes.has(node.id);

    return (
      <NodeContainer key={node.id} depth={depth}>
        <NodeRow>
          <ExpandButton
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();

              if (isLoading) {
                return;
              }

              if (isCollection || hasChildren) {
                toggleNode(node.id);
              }
            }}
            $isExpanded={isExpanded}
            $hasChildren={isCollection || hasChildren}
            $isLoading={isLoading}
            title={isExpanded ? t("Collapse") : t("Expand")}
          >
            <ArrowIcon size={18} />
          </ExpandButton>

          <NodeLink
            to={node.url}
            title={isCollection ? node.title : getDocumentPath(node.id)}
          >
            <NodeIcon>
              {isCollection ? (
                <CollectionIcon size={16} />
              ) : (
                <DocumentIcon size={16} />
              )}
            </NodeIcon>
            <NodeTitle>{node.title}</NodeTitle>
          </NodeLink>
        </NodeRow>

        {isExpanded && (
          <ChildrenContainer>
            {isLoading ? (
              <LoadingText>{t("Loading...")}</LoadingText>
            ) : hasChildren ? (
              node.children.map((child) => renderNode(child, depth + 1))
            ) : null}
          </ChildrenContainer>
        )}
      </NodeContainer>
    );
  };

  if (collectionTrees.length === 0) {
    return (
      <EmptyContainer>
        <EmptyText>{t("No collections found")}</EmptyText>
      </EmptyContainer>
    );
  }

  return (
    <Container className={className}>
      <Header>
        <SearchContainer>
          <SearchInput
            type="text"
            placeholder={
              isSearching
                ? t("Searching...")
                : t("Search collections and documents...")
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={isSearching}
          />
        </SearchContainer>
        <ButtonGroup>
          <Button onClick={toggleAll}>
            {expandedNodes.size > 0 ? (
              <>
                <ArrowIcon size={16} />
                {t("Collapse All")}
              </>
            ) : (
              <>
                <ExpandIcon size={16} />
                {t("Expand All")}
              </>
            )}
          </Button>
        </ButtonGroup>
      </Header>

      <TreeContainer>
        {filteredCollectionTrees.map((node) => renderNode(node))}
      </TreeContainer>
    </Container>
  );
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  background: ${s("background")};
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid ${s("divider")};
  gap: 16px;
`;

const SearchContainer = styled.div`
  flex: 1;
  max-width: 300px;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 8px 12px;
  border: 1px solid ${s("divider")};
  border-radius: 6px;
  background: ${s("background")};
  color: ${s("text")};
  font-size: 14px;
  transition: all 0.15s ease;

  &::placeholder {
    color: ${s("textTertiary")};
  }

  &:focus {
    outline: none;
    border-color: ${s("accent")};
    box-shadow: 0 0 0 2px ${s("accent")}20;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    background: ${s("backgroundSecondary")};
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 8px;
`;

const Button = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid ${s("divider")};
  border-radius: 4px;
  background: ${s("background")};
  color: ${s("textSecondary")};
  font-size: 12px;
  cursor: pointer;
  transition: all 0.1s ease;

  &:hover {
    background: ${s("backgroundSecondary")};
    color: ${s("text")};
  }
`;

const TreeContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
`;

const NodeContainer = styled.div<{ depth: number }>`
  margin-left: ${(props) => props.depth * 16}px;
`;

const NodeRow = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 4px;
  transition: background-color 0.1s ease;

  &:hover {
    background: ${s("backgroundSecondary")};
  }
`;

const ExpandButton = styled.button<{
  $isExpanded: boolean;
  $hasChildren: boolean;
  $isLoading: boolean;
}>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: ${s("textTertiary")};
  cursor: ${(props) =>
    props.$isLoading
      ? "not-allowed"
      : props.$hasChildren
        ? "pointer"
        : "default"};
  opacity: ${(props) => (props.$hasChildren ? 1 : 0.3)};
  transition: all 0.15s ease;
  border-radius: 4px;
  z-index: 1;
  position: relative;

  &:hover {
    background: ${(props) =>
      props.$isLoading
        ? s("backgroundSecondary")
        : props.$hasChildren
          ? s("backgroundTertiary")
          : "transparent"};
    color: ${s("text")};
    transform: ${(props) =>
      props.$isLoading ? "none" : props.$hasChildren ? "scale(1.1)" : "none"};
  }

  &:active {
    transform: ${(props) =>
      props.$isLoading ? "none" : props.$hasChildren ? "scale(0.95)" : "none"};
  }

  &:focus {
    outline: 2px solid ${s("accent")};
    outline-offset: 2px;
  }

  svg {
    width: 18px;
    height: 18px;
    transform: ${(props) =>
      props.$isExpanded ? "rotate(90deg)" : "rotate(0deg)"};
    transition: transform 0.15s ease;
    pointer-events: none;
  }
`;

const NodeLink = styled(Link)`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  text-decoration: none;
  color: ${s("textSecondary")};
  transition: all 0.1s ease;
  flex: 1;
  border-radius: 4px;

  &:hover {
    color: ${s("textSecondary")};
  }
`;

const ExpandIcon = styled(ArrowIcon)`
  transform: rotate(-90deg);
`;

const NodeIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  color: ${s("textTertiary")};
`;

const NodeTitle = styled.span`
  font-size: 14px;
  font-weight: 400;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ChildrenContainer = styled.div`
  margin-top: 2px;
  animation: slideDown 0.2s ease-out;

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const LoadingText = styled.div`
  color: ${s("textTertiary")};
  font-size: 12px;
  margin: 8px 0 8px 24px;
  font-style: italic;
`;

const EmptyContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
`;

const EmptyText = styled.p`
  color: ${s("textTertiary")};
  font-size: 14px;
  margin: 0;
`;

export default observer(SiteMap);
