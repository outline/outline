import { observer } from "mobx-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import ForceGraph2D from "react-force-graph-2d";
import styled from "styled-components";
import { transparentize } from "polished";
import { client } from "~/utils/ApiClient";
import Button from "../Button";
import InputSearch from "../InputSearch";
import { InputSelect, type Option } from "../InputSelect";
import Text from "../Text";
import Heading from "../Heading";
import Switch from "../Switch";
import { HStack } from "../primitives/HStack";
import { VStack } from "../primitives/VStack";
import { useTheme } from "styled-components";
import { useHistory } from "react-router-dom";
import download from "~/utils/download";
import usePersistedState from "~/hooks/usePersistedState";
import Tooltip from "../Tooltip";

export type Node = {
  id: string;
  type: "group" | "collection" | "document" | "hashtag" | "owner" | "user";
  label: string;
  size: number;
  data: {
    id: string;
    name?: string;
    title?: string;
    documentCount?: number;
    memberCount?: number;
    createdById?: string;
    ownerName?: string;
    email?: string;
    color?: string;
    icon?: string;
    path?: string;
    description?: string | null;
    createdAt?: string;
    collectionId?: string;
  };
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
};

type Link = {
  source: string | Node;
  target: string | Node;
  type: string;
};

type GraphData = {
  nodes: Node[];
  links: Link[];
};

type Props = {
  collections?: Array<{ id: string; name: string }>;
  onNodeClick?: (node: Node) => void;
};

const NetworkGraph = observer(({ collections, onNodeClick }: Props) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const history = useHistory();
  const [data, setData] = useState<GraphData>({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [hoveredNode, setHoveredNode] = useState<Node | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [highlightedNodes, setHighlightedNodes] = useState<Set<string>>(
    new Set()
  );
  const [highlightedLinks, setHighlightedLinks] = useState<Set<string>>(
    new Set()
  );
  const [focusedNode, setFocusedNode] = useState<Node | null>(null);
  const [showLabels, setShowLabels] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [minNodeSize, setMinNodeSize] = useState(0);
  const [repulsionStrength, setRepulsionStrength] = usePersistedState<number>(
    "networkGraph.repulsionStrength",
    2.5
  );
  const [useCaseFilter, setUseCaseFilter] = useState<string | undefined>();
  const [linkTypesFilter, setLinkTypesFilter] = useState<Set<string>>(
    new Set(["editor", "viewer", "admin", "contains", "reference", "tagged", "owned"])
  );
  const [selectedHashtag, setSelectedHashtag] = useState<string | undefined>();
  const [selectedOwnerId, setSelectedOwnerId] = useState<string | undefined>();
  const [selectedCollectionId, setSelectedCollectionId] = useState<
    string | undefined
  >();
  const [searchedNode, setSearchedNode] = useState<Node | null>(null);
  // Состояние для отслеживания раскрытых узлов (иерархическое раскрытие)
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [sidebarVisible, setSidebarVisible] = usePersistedState<boolean>(
    "networkGraph.sidebarVisible",
    true
  );
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFullGraph, setShowFullGraph] = usePersistedState<boolean>(
    "networkGraph.showFullGraph",
    true
  );
  const graphRef = useRef<any>();
  const graphWrapperRef = useRef<HTMLDivElement>(null);
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounce для поиска
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await client.post("/collections.networkGraph", {
        groupId: selectedGroupId,
        search: debouncedSearch || undefined,
      });
      setData(response.data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("Failed to load graph data")
      );
    } finally {
      setLoading(false);
    }
  }, [selectedGroupId, debouncedSearch, t]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // Поиск узла после загрузки данных
  useEffect(() => {
    if (debouncedSearch && graphRef.current && data.nodes.length > 0) {
      const foundNode = data.nodes.find(
        (node) =>
          node.label.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          node.id.toLowerCase().includes(debouncedSearch.toLowerCase())
      );

      if (foundNode && foundNode.x !== undefined && foundNode.y !== undefined) {
        setSearchedNode(foundNode);
        // Центрируем на найденном узле
        setTimeout(() => {
          if (graphRef.current && foundNode.x !== undefined && foundNode.y !== undefined) {
            graphRef.current.centerAt(foundNode.x, foundNode.y, 1000);
            graphRef.current.zoom(2, 1000);
          }
        }, 100);

        // Выделяем найденный узел
        setHighlightedNodes(new Set([foundNode.id]));
        setSelectedNode(foundNode);
      } else {
        setSearchedNode(null);
        if (!focusedNode) {
          setHighlightedNodes(new Set());
        }
      }
    } else if (!debouncedSearch) {
      setSearchedNode(null);
      if (!focusedNode) {
        setHighlightedNodes(new Set());
      }
    }
  }, [debouncedSearch, data.nodes, focusedNode]);

  // Перезапускаем симуляцию при изменении данных
  useEffect(() => {
    if (data.nodes.length > 0 && graphRef.current) {
      setTimeout(() => {
        if (graphRef.current) {
          graphRef.current.zoomToFit(400, 20);
        }
      }, 500);
    }
  }, [data]);

  // Debounce для resize окна
  useEffect(() => {
    const handleResize = () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      resizeTimeoutRef.current = setTimeout(() => {
        if (graphRef.current && data.nodes.length > 0) {
          // Пересчитываем layout при изменении размера
          graphRef.current.zoomToFit(400, 20);
        }
      }, 250);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, [data.nodes.length]);

  // Определяем цвета в зависимости от темы
  const isDark = theme.background === theme.almostBlack || theme.background === theme.lightBlack;

  const colorPalette = useMemo(() => {
    // Улучшенные контрастные цвета
    return {
      work: isDark ? "#A569BD" : "#7D3C98", // Более насыщенный фиолетовый
      old: isDark ? "#5DADE2" : "#2874A6", // Более насыщенный синий
      personal: isDark ? "#F7DC6F" : "#D68910", // Более яркий оранжевый
      project: isDark ? "#EC7063" : "#A93226", // Более насыщенный красный
      diary: isDark ? "#52BE80" : "#1E8449", // Более насыщенный бирюзовый
      default: isDark ? "#85929E" : "#566573", // Более контрастный серый
      user: isDark ? "#5DADE2" : "#2874A6",
      group: isDark ? "#A569BD" : "#7D3C98",
      link: {
        creator: isDark
          ? transparentize(0.3, "#E74C3C")
          : transparentize(0.4, "#C0392B"),
        member: isDark
          ? transparentize(0.3, "#3498DB")
          : transparentize(0.4, "#2980B9"),
        access: isDark
          ? transparentize(0.3, "#9B59B6")
          : transparentize(0.4, "#8E44AD"),
        default: isDark
          ? transparentize(0.5, "#95A5A6")
          : transparentize(0.6, "#7F8C8D"),
      },
    };
  }, [isDark]);

  // Определяем цвет коллекции
  const getCollectionColor = useCallback(
    (node: Node): string => {
      if (node.data.color) {
        return node.data.color;
      }

      const name = node.data.name?.toLowerCase() || "";
      const path = node.data.path?.toLowerCase() || "";
      const description = node.data.description?.toLowerCase() || "";
      const combined = `${name} ${path} ${description}`;

      if (combined.match(/\b(работа|work|job|office|команда|team)\b/i)) {
        return colorPalette.work;
      }
      if (
        combined.match(
          /\b(проект|project|разработка|development|задача|task)\b/i
        )
      ) {
        return colorPalette.project;
      }
      if (combined.match(/\b(дневник|diary|journal|заметки|notes)\b/i)) {
        return colorPalette.diary;
      }
      if (combined.match(/\b(старый|old|архив|archive|история)\b/i)) {
        return colorPalette.old;
      }
      if (
        combined.match(
          /\b(личный|personal|база знаний|knowledge base|знания)\b/i
        )
      ) {
        return colorPalette.personal;
      }

      const docCount = node.data.documentCount || 0;
      if (docCount > 50) return colorPalette.personal;
      if (docCount > 20) return colorPalette.work;

      return colorPalette.default;
    },
    [colorPalette]
  );

  // Определяем тип документа по названию, тегам и содержимому
  const getDocumentType = useCallback((node: Node): string => {
    if (node.type !== "document") return "default";

    const label = (node.label || "").toLowerCase();
    const title = (node.data.title || "").toLowerCase();
    const description = (node.data.description || "").toLowerCase();
    const combined = `${label} ${title} ${description}`;

    // Проверяем префиксы доменов
    if (label.match(/^(data|data-)/i)) return "data";
    if (label.match(/^(devops|devops-)/i)) return "devops";
    if (label.match(/^(prod|prod-|production)/i)) return "production";
    if (label.match(/^(test|test-)/i)) return "test";

    // Проверяем типы документов
    if (combined.match(/\b(runbook|run-book|операционное руководство)\b/i)) return "runbook";
    if (combined.match(/\b(adr|architecture decision|архитектурное решение)\b/i)) return "adr";
    if (combined.match(/\b(service|сервис|микросервис)\b/i)) return "service";
    if (combined.match(/\b(api|endpoint|эндпоинт)\b/i)) return "api";
    if (combined.match(/\b(incident|инцидент|проблема)\b/i)) return "incident";
    if (combined.match(/\b(onboarding|онбординг|введение|getting started|начало работы)\b/i)) return "onboarding";
    if (combined.match(/\b(glossary|глоссарий|термины)\b/i)) return "glossary";
    if (combined.match(/\b(reference|справочник|reference)\b/i)) return "reference";
    if (combined.match(/\b(diagram|диаграмма|схема)\b/i)) return "diagram";

    return "default";
  }, []);

  const nodeColor = useCallback(
    (node: Node) => {
      switch (node.type) {
        case "group":
          return colorPalette.group;
        case "collection":
          return getCollectionColor(node);
        case "document": {
          const docType = getDocumentType(node);
          // Цвета для разных типов документов
          switch (docType) {
            case "runbook":
              return isDark ? "#E67E22" : "#D35400"; // Оранжевый для runbook
            case "adr":
              return isDark ? "#8E44AD" : "#7D3C98"; // Фиолетовый для ADR
            case "service":
              return isDark ? "#3498DB" : "#2874A6"; // Синий для сервисов
            case "api":
              return isDark ? "#1ABC9C" : "#16A085"; // Бирюзовый для API
            case "incident":
              return isDark ? "#E74C3C" : "#C0392B"; // Красный для инцидентов
            case "onboarding":
              return isDark ? "#F39C12" : "#D68910"; // Желтый для онбординга
            case "glossary":
              return isDark ? "#52BE80" : "#1E8449"; // Зеленый для глоссариев
            case "reference":
              return isDark ? "#F7DC6F" : "#D68910"; // Желтый для справочников
            case "diagram":
              return isDark ? "#5DADE2" : "#2874A6"; // Голубой для диаграмм
            case "data":
              return isDark ? "#9B59B6" : "#8E44AD"; // Фиолетовый для DATA-
            case "devops":
              return isDark ? "#E67E22" : "#D35400"; // Оранжевый для DEVOPS-
            case "production":
              return isDark ? "#E74C3C" : "#C0392B"; // Красный для PROD-
            case "test":
              return isDark ? "#95A5A6" : "#7F8C8D"; // Серый для TEST-
            default:
              return isDark ? "#6C757D" : "#868E96"; // Серый для обычных документов
          }
        }
        case "hashtag":
          return isDark ? "#9B59B6" : "#8E44AD"; // Фиолетовый для хештегов
        case "owner":
          return isDark ? "#3498DB" : "#2980B9"; // Синий для владельцев
        case "user":
          return isDark ? "#16A085" : "#138D75"; // Зеленый для пользователей
        default:
          return colorPalette.default;
      }
    },
    [getCollectionColor, colorPalette, isDark, getDocumentType]
  );

  const linkColor = useCallback(
    (link: Link) => {
      const sourceId =
        typeof link.source === "string" ? link.source : link.source.id;
      const targetId =
        typeof link.target === "string" ? link.target : link.target.id;
      const linkId = `${sourceId}-${targetId}`;
      const isHighlighted = highlightedLinks.has(linkId);

      // Определяем, находится ли связь в фокусе
      const isInFocus = focusedNode
        ? highlightedLinks.has(linkId) ||
        highlightedNodes.has(sourceId) ||
        highlightedNodes.has(targetId)
        : true;

      const baseOpacity = isHighlighted ? 0.8 : 0.4;
      const finalOpacity = isInFocus ? baseOpacity : baseOpacity * 0.3;

      // Улучшенные контрастные цвета для связей
      switch (link.type) {
        case "editor":
          return isDark
            ? transparentize(1 - finalOpacity, "#52BE80")
            : transparentize(1 - finalOpacity, "#1E8449"); // Более насыщенный зеленый
        case "viewer":
          return isDark
            ? transparentize(1 - finalOpacity, "#5DADE2")
            : transparentize(1 - finalOpacity, "#2874A6"); // Более насыщенный синий
        case "admin":
          return isDark
            ? transparentize(1 - finalOpacity, "#EC7063")
            : transparentize(1 - finalOpacity, "#A93226"); // Более насыщенный красный
        case "contains":
          return isDark
            ? transparentize(1 - finalOpacity, "#85929E")
            : transparentize(1 - finalOpacity, "#566573"); // Более контрастный серый
        case "reference":
          return isDark
            ? transparentize(1 - finalOpacity, "#F7DC6F")
            : transparentize(1 - finalOpacity, "#D68910"); // Более яркий оранжевый
        case "tagged":
          return isDark
            ? transparentize(1 - finalOpacity, "#9B59B6")
            : transparentize(1 - finalOpacity, "#8E44AD"); // Фиолетовый для хештегов
        case "owned":
          return isDark
            ? transparentize(1 - finalOpacity, "#3498DB")
            : transparentize(1 - finalOpacity, "#2980B9"); // Синий для владельцев
        default:
          return isDark
            ? transparentize(1 - finalOpacity, "#85929E")
            : transparentize(1 - finalOpacity, "#566573");
      }
    },
    [highlightedLinks, highlightedNodes, focusedNode, isDark]
  );

  // Обработка hover узла
  const handleNodeHover = useCallback(
    (node: Node | null) => {
      setHoveredNode(node);
      if (node) {
        // Находим связанные узлы и связи
        const connectedNodeIds = new Set<string>([node.id]);
        const connectedLinkIds = new Set<string>();

        data.links.forEach((link) => {
          const sourceId =
            typeof link.source === "string" ? link.source : link.source.id;
          const targetId =
            typeof link.target === "string" ? link.target : link.target.id;

          if (sourceId === node.id || targetId === node.id) {
            connectedLinkIds.add(`${sourceId}-${targetId}`);
            if (sourceId === node.id) connectedNodeIds.add(targetId);
            if (targetId === node.id) connectedNodeIds.add(sourceId);
          }
        });

        setHighlightedNodes(connectedNodeIds);
        setHighlightedLinks(connectedLinkIds);
      } else {
        if (!focusedNode) {
          setHighlightedNodes(new Set());
          setHighlightedLinks(new Set());
        }
      }
    },
    [data.links, focusedNode]
  );

  // Функция для получения всех дочерних узлов (рекурсивно)
  const getChildNodes = useCallback(
    (nodeId: string, visited = new Set<string>()): Set<string> => {
      if (visited.has(nodeId)) {
        return new Set();
      }
      visited.add(nodeId);

      const childNodes = new Set<string>();
      data.links.forEach((link) => {
        const sourceId =
          typeof link.source === "string" ? link.source : link.source.id;
        const targetId =
          typeof link.target === "string" ? link.target : link.target.id;

        if (sourceId === nodeId) {
          childNodes.add(targetId);
          // Если узел раскрыт, рекурсивно получаем его дочерние узлы
          if (expandedNodes.has(targetId)) {
            const grandchildren = getChildNodes(targetId, visited);
            grandchildren.forEach((id) => childNodes.add(id));
          }
        }
      });

      return childNodes;
    },
    [data.links, expandedNodes]
  );

  // Обработка клика по узлу - иерархическое раскрытие
  const handleNodeClick = useCallback(
    (node: Node) => {
      if (
        node.type === "collection" ||
        node.type === "document" ||
        node.type === "group" ||
        node.type === "hashtag" ||
        node.type === "owner" ||
        node.type === "user"
      ) {
        setSelectedNode(node);

        // Иерархическое раскрытие/сворачивание
        const newExpanded = new Set(expandedNodes);

        if (newExpanded.has(node.id)) {
          // Если узел уже раскрыт - сворачиваем его
          newExpanded.delete(node.id);
          // Также сворачиваем все дочерние узлы
          const childNodes = getChildNodes(node.id);
          childNodes.forEach((childId) => {
            newExpanded.delete(childId);
          });
        } else {
          // Раскрываем узел
          newExpanded.add(node.id);
        }

        setExpandedNodes(newExpanded);

        // Подсветка связанных узлов при hover (оставляем для визуальной обратной связи)
        const connectedNodeIds = new Set<string>([node.id]);
        const connectedLinkIds = new Set<string>();

        data.links.forEach((link) => {
          const sourceId =
            typeof link.source === "string" ? link.source : link.source.id;
          const targetId =
            typeof link.target === "string" ? link.target : link.target.id;

          if (sourceId === node.id || targetId === node.id) {
            connectedLinkIds.add(`${sourceId}-${targetId}`);
            if (sourceId === node.id) connectedNodeIds.add(targetId);
            if (targetId === node.id) connectedNodeIds.add(sourceId);
          }
        });

        setHighlightedNodes(connectedNodeIds);
        setHighlightedLinks(connectedLinkIds);
      }
      if (onNodeClick) {
        onNodeClick(node);
      }
    },
    [onNodeClick, expandedNodes, data.links, getChildNodes]
  );

  // Двойной клик - переход к документу или коллекции
  const handleNodeDoubleClick = useCallback(
    (node: Node) => {
      if (node.type === "collection" && node.data.path) {
        history.push(node.data.path);
      } else if (node.type === "document" && node.data.id) {
        // Переход к документу через его ID
        const docPath = `/doc/${node.data.id}`;
        history.push(docPath);
      }
    },
    [history]
  );

  // Открыть документ из боковой панели
  const handleOpenDocument = useCallback(() => {
    if (selectedNode?.type === "collection" && selectedNode.data.path) {
      history.push(selectedNode.data.path);
    }
  }, [selectedNode, history]);

  // Фильтруем данные для отображения с учетом иерархического раскрытия
  const filteredData = useMemo(() => {
    if (!data || data.nodes.length === 0) {
      return { nodes: [], links: [] };
    }

    const applyPostFilters = (nodes: Node[], links: Link[]): GraphData => {
      let filteredNodes = nodes.slice();
      let filteredLinks = links.slice();

      if (minNodeSize > 0) {
        filteredNodes = filteredNodes.filter((n) => n.size >= minNodeSize);
        const nodeIds = new Set(filteredNodes.map((n) => n.id));
        filteredLinks = filteredLinks.filter((link) => {
          const sourceId =
            typeof link.source === "string" ? link.source : link.source.id;
          const targetId =
            typeof link.target === "string" ? link.target : link.target.id;
          return nodeIds.has(sourceId) && nodeIds.has(targetId);
        });
      }

      if (selectedCollectionId) {
        const collectionNodeId = `collection-${selectedCollectionId}`;
        const relatedNodeIds = new Set<string>([collectionNodeId]);

        data.links.forEach((link) => {
          const sourceId =
            typeof link.source === "string" ? link.source : link.source.id;
          const targetId =
            typeof link.target === "string" ? link.target : link.target.id;

          if (sourceId === collectionNodeId) {
            relatedNodeIds.add(targetId);
          } else if (targetId === collectionNodeId) {
            relatedNodeIds.add(sourceId);
          }
        });

        filteredNodes = filteredNodes.filter((n) => relatedNodeIds.has(n.id));
        filteredLinks = filteredLinks.filter((link) => {
          const sourceId =
            typeof link.source === "string" ? link.source : link.source.id;
          const targetId =
            typeof link.target === "string" ? link.target : link.target.id;
          return relatedNodeIds.has(sourceId) && relatedNodeIds.has(targetId);
        });
      }

      if (selectedHashtag) {
        const hashtagNodeId = `hashtag-${selectedHashtag}`;
        const relatedNodeIds = new Set<string>([hashtagNodeId]);

        data.links.forEach((link) => {
          const sourceId =
            typeof link.source === "string" ? link.source : link.source.id;
          const targetId =
            typeof link.target === "string" ? link.target : link.target.id;

          if (sourceId === hashtagNodeId || targetId === hashtagNodeId) {
            relatedNodeIds.add(sourceId);
            relatedNodeIds.add(targetId);
          }
        });

        filteredNodes = filteredNodes.filter((n) => relatedNodeIds.has(n.id));
        filteredLinks = filteredLinks.filter((link) => {
          const sourceId =
            typeof link.source === "string" ? link.source : link.source.id;
          const targetId =
            typeof link.target === "string" ? link.target : link.target.id;
          return relatedNodeIds.has(sourceId) && relatedNodeIds.has(targetId);
        });
      }

      if (selectedOwnerId) {
        const ownerNodeId = `owner-${selectedOwnerId}`;
        const relatedNodeIds = new Set<string>([ownerNodeId]);

        data.links.forEach((link) => {
          const sourceId =
            typeof link.source === "string" ? link.source : link.source.id;
          const targetId =
            typeof link.target === "string" ? link.target : link.target.id;

          if (sourceId === ownerNodeId || targetId === ownerNodeId) {
            relatedNodeIds.add(sourceId);
            relatedNodeIds.add(targetId);
          }
        });

        filteredNodes = filteredNodes.filter((n) => relatedNodeIds.has(n.id));
        filteredLinks = filteredLinks.filter((link) => {
          const sourceId =
            typeof link.source === "string" ? link.source : link.source.id;
          const targetId =
            typeof link.target === "string" ? link.target : link.target.id;
          return relatedNodeIds.has(sourceId) && relatedNodeIds.has(targetId);
        });
      }

      if (useCaseFilter) {
        const relevantNodeIds = new Set<string>();

        switch (useCaseFilter) {
          case "onboarding": {
            filteredNodes.forEach((node) => {
              const label = (node.label || "").toLowerCase();
              const title = (node.data.title || "").toLowerCase();
              const description = (node.data.description || "").toLowerCase();
              const combined = `${label} ${title} ${description}`;

              if (
                combined.match(/\b(onboarding|онбординг|введение|getting started|начало работы)\b/i) ||
                getDocumentType(node) === "onboarding"
              ) {
                relevantNodeIds.add(node.id);
              }

              if (node.type === "collection") {
                const collectionName = label;
                if (
                  collectionName.match(/\b(work|работа|job|office|команда|team)\b/i) ||
                  collectionName.match(/\b(project|проект|разработка|development)\b/i) ||
                  collectionName.match(/\b(personal|личный|база знаний|knowledge base)\b/i) ||
                  collectionName.match(/\b(onboarding|онбординг|введение)\b/i)
                ) {
                  relevantNodeIds.add(node.id);
                }
              }
            });

            const nodesToAdd = new Set<string>(relevantNodeIds);
            data.links.forEach((link) => {
              const sourceId =
                typeof link.source === "string" ? link.source : link.source.id;
              const targetId =
                typeof link.target === "string" ? link.target : link.target.id;

              if (link.type === "contains" && nodesToAdd.has(sourceId)) {
                relevantNodeIds.add(targetId);
              }

              if (nodesToAdd.has(sourceId)) {
                relevantNodeIds.add(targetId);
              } else if (nodesToAdd.has(targetId)) {
                relevantNodeIds.add(sourceId);
              }
            });
            break;
          }
          case "system-understanding": {
            filteredNodes.forEach((node) => {
              const docType = getDocumentType(node);
              if (
                docType === "adr" ||
                docType === "diagram" ||
                docType === "glossary" ||
                docType === "reference" ||
                node.type === "collection"
              ) {
                relevantNodeIds.add(node.id);
              }
            });

            const nodesToAdd = new Set<string>(relevantNodeIds);
            data.links.forEach((link) => {
              if (
                link.type === "reference" ||
                link.type === "contains" ||
                link.type === "tagged"
              ) {
                const sourceId =
                  typeof link.source === "string" ? link.source : link.source.id;
                const targetId =
                  typeof link.target === "string" ? link.target : link.target.id;

                if (nodesToAdd.has(sourceId)) {
                  relevantNodeIds.add(targetId);
                } else if (nodesToAdd.has(targetId)) {
                  relevantNodeIds.add(sourceId);
                }
              }
            });
            break;
          }
          case "service-docs": {
            filteredNodes.forEach((node) => {
              const docType = getDocumentType(node);
              if (
                docType === "service" ||
                docType === "runbook" ||
                docType === "api" ||
                (node.label || "").toLowerCase().match(/\b(service|сервис|микросервис)\b/i)
              ) {
                relevantNodeIds.add(node.id);
              }
            });

            const nodesToAdd = new Set<string>(relevantNodeIds);
            data.links.forEach((link) => {
              if (
                link.type === "reference" ||
                link.type === "tagged" ||
                link.type === "contains"
              ) {
                const sourceId =
                  typeof link.source === "string" ? link.source : link.source.id;
                const targetId =
                  typeof link.target === "string" ? link.target : link.target.id;

                if (nodesToAdd.has(sourceId)) {
                  relevantNodeIds.add(targetId);
                } else if (nodesToAdd.has(targetId)) {
                  relevantNodeIds.add(sourceId);
                }
              }
            });
            break;
          }
        }

        if (relevantNodeIds.size > 0) {
          filteredNodes = filteredNodes.filter((n) => relevantNodeIds.has(n.id));
          filteredLinks = filteredLinks.filter((link) => {
            const sourceId =
              typeof link.source === "string" ? link.source : link.source.id;
            const targetId =
              typeof link.target === "string" ? link.target : link.target.id;
            return relevantNodeIds.has(sourceId) && relevantNodeIds.has(targetId);
          });
        }
      }

      return { nodes: filteredNodes, links: filteredLinks };
    };

    if (showFullGraph) {
      const baseLinks = data.links.filter((link) => linkTypesFilter.has(link.type));
      return applyPostFilters(data.nodes, baseLinks);
    }

    const visibleNodeIds = new Set<string>();
    const visibleLinks: Link[] = [];

    data.nodes.forEach((node) => {
      if (node.type === "collection") {
        visibleNodeIds.add(node.id);
      }
    });

    data.links.forEach((link) => {
      const sourceId =
        typeof link.source === "string" ? link.source : link.source.id;
      const targetId =
        typeof link.target === "string" ? link.target : link.target.id;

      if (
        visibleNodeIds.has(sourceId) &&
        (link.type === "editor" || link.type === "viewer" || link.type === "admin")
      ) {
        visibleNodeIds.add(targetId);
        if (linkTypesFilter.has(link.type)) {
          visibleLinks.push(link);
        }
      } else if (
        visibleNodeIds.has(targetId) &&
        (link.type === "editor" || link.type === "viewer" || link.type === "admin")
      ) {
        visibleNodeIds.add(sourceId);
        if (linkTypesFilter.has(link.type)) {
          visibleLinks.push(link);
        }
      }
    });

    const addExpandedNodes = (nodeId: string, visited = new Set<string>()) => {
      if (visited.has(nodeId) || !expandedNodes.has(nodeId)) {
        return;
      }
      visited.add(nodeId);

      data.links.forEach((link) => {
        const sourceId =
          typeof link.source === "string" ? link.source : link.source.id;
        const targetId =
          typeof link.target === "string" ? link.target : link.target.id;

        if (sourceId === nodeId) {
          visibleNodeIds.add(targetId);
          if (linkTypesFilter.has(link.type)) {
            visibleLinks.push(link);
          }
          addExpandedNodes(targetId, visited);
        } else if (targetId === nodeId) {
          visibleNodeIds.add(sourceId);
          if (linkTypesFilter.has(link.type)) {
            visibleLinks.push(link);
          }
          if (expandedNodes.has(sourceId)) {
            addExpandedNodes(sourceId, visited);
          }
        }
      });
    };

    expandedNodes.forEach((nodeId) => {
      addExpandedNodes(nodeId);
    });

    data.links.forEach((link) => {
      const sourceId =
        typeof link.source === "string" ? link.source : link.source.id;
      const targetId =
        typeof link.target === "string" ? link.target : link.target.id;

      if (visibleNodeIds.has(sourceId) && visibleNodeIds.has(targetId)) {
        if (linkTypesFilter.has(link.type)) {
          const linkExists = visibleLinks.some(
            (l) =>
              (typeof l.source === "string" ? l.source : l.source.id) === sourceId &&
              (typeof l.target === "string" ? l.target : l.target.id) === targetId &&
              l.type === link.type
          );
          if (!linkExists) {
            visibleLinks.push(link);
          }
        }
      }
    });

    const baseNodes = data.nodes.filter((n) => visibleNodeIds.has(n.id));
    return applyPostFilters(baseNodes, visibleLinks);
  }, [
    data,
    expandedNodes,
    getDocumentType,
    linkTypesFilter,
    minNodeSize,
    selectedCollectionId,
    selectedHashtag,
    selectedOwnerId,
    showFullGraph,
    useCaseFilter,
  ]);

  // Получаем связанные узлы для боковой панели (без дубликатов)
  const relatedNodes = useMemo(() => {
    if (!selectedNode) return [];
    const relatedMap = new Map<string, Node>();
    data.links.forEach((link) => {
      const sourceId =
        typeof link.source === "string" ? link.source : link.source.id;
      const targetId =
        typeof link.target === "string" ? link.target : link.target.id;

      if (sourceId === selectedNode.id) {
        const targetNode = data.nodes.find((n) => n.id === targetId);
        if (targetNode && !relatedMap.has(targetNode.id)) {
          relatedMap.set(targetNode.id, targetNode);
        }
      } else if (targetId === selectedNode.id) {
        const sourceNode = data.nodes.find((n) => n.id === sourceId);
        if (sourceNode && !relatedMap.has(sourceNode.id)) {
          relatedMap.set(sourceNode.id, sourceNode);
        }
      }
    });
    return Array.from(relatedMap.values());
  }, [selectedNode, data]);

  if (loading) {
    return (
      <Container>
        <LoadingContainer>
          <Text>{t("Loading graph...")}</Text>
        </LoadingContainer>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <ErrorContainer>
          <Text type="danger">{error}</Text>
          <Button onClick={fetchData}>{t("Retry")}</Button>
        </ErrorContainer>
      </Container>
    );
  }

  return (
    <FullscreenContainer $isFullscreen={isFullscreen}>
      <MainLayout $sidebarVisible={sidebarVisible}>
        {/* Левая боковая панель - Tools & Legend */}
        <LeftSidebar $visible={sidebarVisible}>
          <ToolsPanel>
            <ToolsHeader>
              <Text weight="bold" size="small">
                {t("Tools")}
              </Text>
              <CloseButton onClick={() => setSidebarVisible(false)}>
                ×
              </CloseButton>
            </ToolsHeader>
            <ToolsContent>
              <ToolSection>
                <Switch
                  label={t("Show labels")}
                  checked={showLabels}
                  onChange={setShowLabels}
                  labelPosition="right"
                />
              </ToolSection>
              <ToolSection>
                <Tooltip
                  content={t(
                    "Shows every node and link at once. Turn off to go back to hierarchical reveal."
                  )}
                  side="right"
                  sideOffset={4}
                >
                  <Switch
                    label={t("Show full graph")}
                    checked={showFullGraph}
                    onChange={setShowFullGraph}
                    labelPosition="right"
                  />
                </Tooltip>
              </ToolSection>
              <ToolSection>
                <Text size="small" type="secondary">
                  {t("Min node size")}: {minNodeSize}
                </Text>
                <input
                  type="range"
                  min="0"
                  max="20"
                  value={minNodeSize}
                  onChange={(event) => {
                    setMinNodeSize(Number(event.target.value));
                  }}
                />
              </ToolSection>
            </ToolsContent>
          </ToolsPanel>
        </LeftSidebar>

        <ContentArea>
          {/* Статус бар внизу */}
          <StatusBar>
            <Text size="small" type="secondary">
              {t("Nodes")}: {filteredData.nodes.length} / {data.nodes.length} |{" "}
              {t("Links")}: {filteredData.links.length} / {data.links.length}
              {filteredData.nodes.length > 0 && (
                <> | {t("Density")}: {(
                  (filteredData.links.length * 2) /
                  (filteredData.nodes.length * (filteredData.nodes.length - 1))
                ).toFixed(3)}</>
              )}
            </Text>
          </StatusBar>
        </ContentArea>
      </MainLayout>

      {/* Боковая панель с деталями узла */}
      {
        selectedNode ? (
          <SidePanel>
            <SidePanelHeader>
              <Heading>{selectedNode.label}</Heading>
              <CloseButton onClick={() => setSelectedNode(null)}>×</CloseButton>
            </SidePanelHeader>
            <SidePanelContent>
              {selectedNode.type === "collection" && (
                <>
                  {selectedNode.data.path && (
                    <InfoRow>
                      <Text size="small" type="secondary">
                        {t("Path")}:
                      </Text>
                      <Text size="small">{selectedNode.data.path}</Text>
                    </InfoRow>
                  )}
                  {selectedNode.data.documentCount !== undefined && (
                    <InfoRow>
                      <Text size="small" type="secondary">
                        {t("Documents")}:
                      </Text>
                      <Text size="small">
                        {selectedNode.data.documentCount}
                      </Text>
                    </InfoRow>
                  )}
                  {selectedNode.data.description && (
                    <InfoRow>
                      <Text size="small" type="secondary">
                        {t("Description")}:
                      </Text>
                      <Text size="small">
                        {selectedNode.data.description}
                      </Text>
                    </InfoRow>
                  )}
                  {relatedNodes.length > 0 && (
                    <>
                      <Text weight="bold" style={{ marginTop: 16 }}>
                        {t("Related")}:
                      </Text>
                      {relatedNodes.map((node) => (
                        <RelatedNodeItem
                          key={`${selectedNode.id}-${node.id}`}
                          onClick={() => setSelectedNode(node)}
                        >
                          <RelatedNodeColor color={nodeColor(node)} />
                          <Text size="small">
                            {node.label}
                            {node.type === "group" &&
                              node.data.memberCount !== undefined && (
                                <Text size="small" type="secondary">
                                  {" "}
                                  ({node.data.memberCount} {t("members")})
                                </Text>
                              )}
                          </Text>
                        </RelatedNodeItem>
                      ))}
                    </>
                  )}
                  <Button
                    onClick={handleOpenDocument}
                    style={{ marginTop: 16, width: "100%" }}
                  >
                    {t("Open Collection")}
                  </Button>
                </>
              )}
              {selectedNode.type === "group" && (
                <>
                  {selectedNode.data.memberCount !== undefined && (
                    <InfoRow>
                      <Text size="small" type="secondary">
                        {t("Members")}:
                      </Text>
                      <Text size="small">
                        {selectedNode.data.memberCount}
                      </Text>
                    </InfoRow>
                  )}
                  {relatedNodes.length > 0 && (
                    <>
                      <Text weight="bold" style={{ marginTop: 16 }}>
                        {t("Related Collections")}:
                      </Text>
                      {relatedNodes.map((node) => (
                        <RelatedNodeItem
                          key={`${selectedNode.id}-${node.id}`}
                          onClick={() => setSelectedNode(node)}
                        >
                          <RelatedNodeColor color={nodeColor(node)} />
                          <Text size="small">{node.label}</Text>
                        </RelatedNodeItem>
                      ))}
                    </>
                  )}
                </>
              )}
              {selectedNode.type === "document" && (
                <>
                  {selectedNode.data.title && (
                    <InfoRow>
                      <Text size="small" type="secondary">
                        {t("Title")}:
                      </Text>
                      <Text size="small">{selectedNode.data.title}</Text>
                    </InfoRow>
                  )}
                  {selectedNode.data.ownerName && (
                    <InfoRow>
                      <Text size="small" type="secondary">
                        {t("Owner")}:
                      </Text>
                      <Text size="small">{selectedNode.data.ownerName}</Text>
                    </InfoRow>
                  )}
                  {relatedNodes.length > 0 && (
                    <>
                      <Text weight="bold" style={{ marginTop: 16 }}>
                        {t("Related")}:
                      </Text>
                      {relatedNodes.map((node) => (
                        <RelatedNodeItem
                          key={`${selectedNode.id}-${node.id}`}
                          onClick={() => setSelectedNode(node)}
                        >
                          <RelatedNodeColor color={nodeColor(node)} />
                          <Text size="small">{node.label}</Text>
                        </RelatedNodeItem>
                      ))}
                    </>
                  )}
                </>
              )}
              {selectedNode.type === "hashtag" && (
                <>
                  <InfoRow>
                    <Text size="small" type="secondary">
                      {t("Hashtag")}:
                    </Text>
                    <Text size="small">{selectedNode.label}</Text>
                  </InfoRow>
                  {selectedNode.data.documentCount !== undefined && (
                    <InfoRow>
                      <Text size="small" type="secondary">
                        {t("Documents")}:
                      </Text>
                      <Text size="small">
                        {selectedNode.data.documentCount}
                      </Text>
                    </InfoRow>
                  )}
                  {relatedNodes.length > 0 && (
                    <>
                      <Text weight="bold" style={{ marginTop: 16 }}>
                        {t("Tagged Documents")}:
                      </Text>
                      {relatedNodes.map((node) => (
                        <RelatedNodeItem
                          key={`${selectedNode.id}-${node.id}`}
                          onClick={() => setSelectedNode(node)}
                        >
                          <RelatedNodeColor color={nodeColor(node)} />
                          <Text size="small">{node.label}</Text>
                        </RelatedNodeItem>
                      ))}
                    </>
                  )}
                </>
              )}
              {selectedNode.type === "owner" && (
                <>
                  {selectedNode.data.name && (
                    <InfoRow>
                      <Text size="small" type="secondary">
                        {t("Name")}:
                      </Text>
                      <Text size="small">{selectedNode.data.name}</Text>
                    </InfoRow>
                  )}
                  {selectedNode.data.email && (
                    <InfoRow>
                      <Text size="small" type="secondary">
                        {t("Email")}:
                      </Text>
                      <Text size="small">{selectedNode.data.email}</Text>
                    </InfoRow>
                  )}
                  {selectedNode.data.documentCount !== undefined && (
                    <InfoRow>
                      <Text size="small" type="secondary">
                        {t("Documents")}:
                      </Text>
                      <Text size="small">
                        {selectedNode.data.documentCount}
                      </Text>
                    </InfoRow>
                  )}
                  {relatedNodes.length > 0 && (
                    <>
                      <Text weight="bold" style={{ marginTop: 16 }}>
                        {t("Owned Documents")}:
                      </Text>
                      {relatedNodes.map((node) => (
                        <RelatedNodeItem
                          key={`${selectedNode.id}-${node.id}`}
                          onClick={() => setSelectedNode(node)}
                        >
                          <RelatedNodeColor color={nodeColor(node)} />
                          <Text size="small">{node.label}</Text>
                        </RelatedNodeItem>
                      ))}
                    </>
                  )}
                </>
              )}
            </SidePanelContent>
          </SidePanel>
        ) : null
      }
    </FullscreenContainer >
  );
});

const Container = styled.div`
        display: flex;
        width: 100%;
        height: 100%;
        min-height: 600px;
        position: relative;
        `;

const FullscreenContainer = styled.div<{ $isFullscreen: boolean }>`
        display: flex;
        width: 100%;
        height: ${(props) => (props.$isFullscreen ? "100vh" : "100%")};
        min-height: ${(props) => (props.$isFullscreen ? "100vh" : "600px")};
        position: ${(props) => (props.$isFullscreen ? "fixed" : "relative")};
        top: ${(props) => (props.$isFullscreen ? 0 : "auto")};
        left: ${(props) => (props.$isFullscreen ? 0 : "auto")};
        z-index: ${(props) => (props.$isFullscreen ? 9999 : "auto")};
        background: ${(props) => props.theme.background};
        `;

const MainLayout = styled.div<{ $sidebarVisible: boolean }>`
        display: grid;
        grid-template-columns: ${(props) => (props.$sidebarVisible ? "250px 1fr" : "0 1fr")};
        grid-template-rows: 1fr;
        height: 100%;
        width: 100%;
        transition: grid-template-columns 0.3s ease;
        overflow: hidden;

        @media (max-width: 1024px) {
          grid - template - columns: 1fr;
  }
        `;

const LeftSidebar = styled.aside<{ $visible: boolean }>`
        grid-column: 1;
        display: ${(props) => (props.$visible ? "flex" : "none")};
        flex-direction: column;
        background: ${(props) => props.theme.background};
        border-right: 1px solid ${(props) => props.theme.divider};
        overflow-y: auto;
        overflow-x: hidden;
        z-index: 10;

        @media (max-width: 1024px) {
          position: absolute;
        left: 0;
        top: 0;
        width: 280px;
        height: 100%;
        transform: ${(props) => (props.$visible ? "translateX(0)" : "translateX(-100%)")};
        transition: transform 0.3s ease;
        box-shadow: ${(props) => (props.$visible ? props.theme.menuShadow : "none")};
        z-index: 100;
  }
        `;

const ContentArea = styled.div`
        grid-column: 2;
        display: flex;
        flex-direction: column;
        height: 100%;
        overflow: hidden;

        @media (max-width: 1024px) {
          grid - column: 1;
  }
        `;

const ToolbarTop = styled.div`
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        border-bottom: 1px solid ${(props) => props.theme.divider};
        background: ${(props) => props.theme.background};
        gap: 12px;
        flex-shrink: 0;
        z-index: 20;

        @media (max-width: 768px) {
          flex - wrap: wrap;
        padding: 8px 12px;
  }
        `;

const ToolbarLeft = styled.div`
        display: flex;
        align-items: center;
        gap: 8px;
        flex: 1;
        flex-wrap: wrap;
        `;

const ToolbarRight = styled.div`
        display: flex;
        align-items: center;
        gap: 8px;
        flex-shrink: 0;
        `;

const GraphWrapper = styled.div`
        flex: 1;
        position: relative;
        background: ${(props) => props.theme.background};
        overflow: hidden;
        min-height: 0; /* Важно для flexbox */

        canvas {
          display: block;
        width: 100%;
        height: 100%;
  }
        `;

const StatusBar = styled.div`
        padding: 8px 16px;
        border-top: 1px solid ${(props) => props.theme.divider};
        background: ${(props) => props.theme.background};
        flex-shrink: 0;
        z-index: 10;
        `;

const GraphCanvas = styled.div`
        position: relative;
        width: 100%;
        height: 100%;
        `;


const FilterButton = styled.div`
        display: flex;
        align-items: center;
        `;

const ToolsPanel = styled.div`
        width: 100%;
        background: ${(props) => props.theme.background};
        border-bottom: 1px solid ${(props) => props.theme.divider};
        flex-shrink: 0;
        overflow-y: auto;
        max-height: 50%;
        `;

const ToolsHeader = styled.div`
        padding: 12px 16px;
        border-bottom: 1px solid ${(props) => props.theme.divider};
        `;

const ToolsContent = styled(VStack)`
        padding: 12px 16px;
        gap: 12px;
        `;

const ToolSection = styled(VStack)`
        gap: 8px;
        `;

const ToolDivider = styled.div`
        height: 1px;
        background: ${(props) => props.theme.divider};
        margin: 8px 0;
        `;

const SidePanel = styled.div`
        width: 320px;
        background: ${(props) => props.theme.background};
        border-left: 1px solid ${(props) => props.theme.divider};
        display: flex;
        flex-direction: column;
        max-height: 100%;
        overflow: hidden;
        `;

const SidePanelHeader = styled.div`
        padding: 16px;
        border-bottom: 1px solid ${(props) => props.theme.divider};
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 16px;
        `;

const CloseButton = styled.button`
        background: none;
        border: none;
        font-size: 24px;
        line-height: 1;
        color: ${(props) => props.theme.textSecondary};
        cursor: pointer;
        padding: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;

        &:hover {
          color: ${(props) => props.theme.text};
  }
        `;

const SidePanelContent = styled.div`
        padding: 16px;
        overflow-y: auto;
        flex: 1;
        `;

const InfoRow = styled(VStack)`
        gap: 4px;
        margin-bottom: 12px;
        `;

const RelatedNodeItem = styled.div`
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px;
        border-radius: 4px;
        cursor: pointer;
        margin-top: 4px;

        &:hover {
          background: ${(props) => props.theme.sidebarActiveBackground};
  }
        `;

const RelatedNodeColor = styled.div<{ color: string }>`
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: ${(props) => props.color};
        flex-shrink: 0;
        `;

const Legend = styled.div`
        width: 100%;
        background: ${(props) => props.theme.background};
        padding: 12px;
        flex-shrink: 0;
        overflow-y: auto;
        max-height: 50%;
        `;

const LegendTitle = styled(Text)`
        font-weight: 600;
        margin-bottom: 8px;
        `;

const LegendItem = styled.div`
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 6px;
        `;

const LegendColor = styled.div<{ color: string }>`
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: ${(props) => props.color};
        flex-shrink: 0;
        `;

const LegendText = styled(Text) <{ size?: string; fontWeight?: "normal" | "bold" | "xbold" }>`
        font-size: ${(props) => (props.size === "small" ? "12px" : "14px")};
        font-weight: ${(props) => (props.fontWeight ? props.fontWeight : "normal")};
        `;

const LegendDivider = styled.div`
        height: 1px;
        background: ${(props) => props.theme.divider};
        margin: 8px 0;
        `;

const LegendSection = styled.div`
        margin-bottom: 8px;
        `;

const LegendLine = styled.div<{ color: string }>`
        width: 20px;
        height: 2px;
        background: ${(props) => props.color};
        flex-shrink: 0;
        `;

const LoadingContainer = styled.div`
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        min-height: 600px;
        `;

const ErrorContainer = styled(VStack)`
        align-items: center;
        justify-content: center;
        height: 100%;
        min-height: 600px;
        gap: 16px;
        `;

export default NetworkGraph;
