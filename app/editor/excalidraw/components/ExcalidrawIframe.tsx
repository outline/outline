import * as React from "react";
import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import styled from "styled-components";
import { v5 as uuidv5 } from "uuid";
import debounce from "lodash/debounce";
import { EditIcon, EyeIcon, ExpandedIcon, CollapseIcon } from "outline-icons";
import ExcalidrawErrorBoundary from "./ExcalidrawErrorBoundary";
import type { ExcalidrawElement, AppState, ExcalidrawImperativeAPI } from "../lib/types";
import type { LibraryItem } from "@excalidraw/excalidraw/types/types";
import { ExcalidrawCollaboration, type CollaborationCallbacks } from "../lib/collaboration";
import { ConnectionStatus } from "../lib/constants";
import { getDefaultLibraries } from "../lib/defaultLibraries";
import { extractSceneFromSVG, hasEmbeddedScene } from "../lib/svgExtractor";
import { generateExcalidrawSVG } from "../lib/svgGenerator";
import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";

// Namespace UUID for Excalidraw diagrams
const EXCALIDRAW_NAMESPACE = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

type Props = {
  svg: string;
  documentId: string;
  position: number;
  user?: { name: string; id: string };
  collaborationToken?: string;
  theme: "light" | "dark";
  onSave?: (svg: string, height?: number) => void;
  scrollToContentTrigger?: number;
};

// Helper functions for collaboration
const getCollaborationServerUrl = (): string => {
  if (typeof window !== "undefined") {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    return `${protocol}//${host}`;
  }
  return "http://localhost:3000";
};

const getUserName = (user?: { name: string }): string => user?.name || "Anonymous User";

const getCollaborationToken = (): string | undefined => {
  if (typeof document !== "undefined") {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'accessToken') {
        return value;
      }
    }
  }
  return undefined;
};

const ExcalidrawIframe: React.FC<Props> = ({
  svg,
  documentId,
  position,
  user,
  collaborationToken,
  theme,
  onSave,
  scrollToContentTrigger,
}) => {
  const [isViewMode, setIsViewMode] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawImperativeAPI | null>(null);
  const [collaboration, setCollaboration] = useState<ExcalidrawCollaboration | null>(null);
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(ConnectionStatus.CONNECTING);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [initialData, setInitialData] = useState<{ elements: ExcalidrawElement[]; appState: Partial<AppState> } | null>(null);
  const [isLoadingInitialData, setIsLoadingInitialData] = useState(true);
  const isMountedRef = useRef(true);
  const hasInitialized = useRef(false);
  const debouncedSaveRef = useRef<ReturnType<typeof debounce>>();
  const containerRef = useRef<HTMLDivElement>(null);
  const lastLoadedSvgRef = useRef<string>("");
  const hasInitiallyLoadedRef = useRef(false);

  // Track component mounted state
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Load initial diagram data from SVG
  useEffect(() => {
    if (typeof window === "undefined" || !svg) {
      return;
    }

    // Guard: Skip reload if SVG hasn't actually changed from what we're currently showing
    // This prevents unnecessary reloads and state resets
    if (svg === lastLoadedSvgRef.current) {
      return;
    }

    // Guard: Skip reload if already initially loaded
    // Once loaded, Excalidraw's internal state is the source of truth
    // We only reload when the SVG actually changes (external edits)
    if (hasInitiallyLoadedRef.current) {
      return;
    }

    const loadScene = async () => {
      try {
        if (svg && hasEmbeddedScene(svg)) {
          const scene = await extractSceneFromSVG(svg);
          if (scene) {
            setInitialData({
              elements: scene.elements || [],
              appState: {
                ...(scene.appState || {}),
                scrollX: scene.appState?.scrollX ?? 0,
                scrollY: scene.appState?.scrollY ?? 0,
                zoom: scene.appState?.zoom ?? { value: 1 },
              },
            });
          } else {
            setInitialData({
              elements: [],
              appState: {
                scrollX: 0,
                scrollY: 0,
                zoom: { value: 1 },
              },
            });
          }
        } else {
          setInitialData({
            elements: [],
            appState: {
              scrollX: 0,
              scrollY: 0,
              zoom: { value: 1 },
            },
          });
        }

        // Update tracking refs
        lastLoadedSvgRef.current = svg;
        hasInitiallyLoadedRef.current = true;
      } catch {
        setInitialData({
          elements: [],
          appState: {
            scrollX: 0,
            scrollY: 0,
            zoom: { value: 1 },
          },
        });
        setConnectionError("Failed to load diagram data");
        hasInitiallyLoadedRef.current = true;
      } finally {
        setIsLoadingInitialData(false);
      }
    };

    loadScene();
  }, [svg]);

  // Load libraries from team preferences
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    let mounted = true;
    const stores = (window as any).__STORES__;
    const libraryUrls = stores?.auth?.team?.getPreference("excalidrawLibraries");

    getDefaultLibraries(libraryUrls).then((items) => {
      if (mounted) {
        setLibraryItems(items);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  // Update library when items are loaded and API is available
  useEffect(() => {
    if (excalidrawAPI && libraryItems.length > 0 && isMountedRef.current) {
      excalidrawAPI.updateLibrary({
        libraryItems,
        openLibraryMenu: false,
      });
    }
  }, [excalidrawAPI, libraryItems]);

  // Scroll to content when initial data is loaded and API is ready
  useEffect(() => {
    if (excalidrawAPI && initialData && !isLoadingInitialData && isMountedRef.current) {
      // Small delay to ensure Excalidraw has rendered the elements
      setTimeout(() => {
        if (isMountedRef.current) {
          try {
            excalidrawAPI.scrollToContent(undefined, {
              fitToContent: true,
              animate: false,
            });
          } catch {
            // Silently ignore scrollToContent errors
          }
        }
      }, 100);
    }
  }, [excalidrawAPI, initialData, isLoadingInitialData]);

  // Memoize collaboration callbacks
  const collaborationCallbacks = useMemo<CollaborationCallbacks>(() => ({
    onStateChange: (state) => {
      setConnectionStatus(state.connectionStatus);
      setConnectionError(state.error);
    },
    onError: (message) => {
      setConnectionError(message);
    },
  }), []);

  // Memoize collaboration config
  const collaborationConfig = useMemo(() => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const validDocumentId = documentId && uuidRegex.test(documentId) ? documentId : null;

    if (!validDocumentId) {
      return null;
    }

    const roomId = uuidv5(`${validDocumentId}:excalidraw:${position}`, EXCALIDRAW_NAMESPACE);

    return {
      documentId: validDocumentId,
      excalidrawId: roomId,
      excalidrawDataId: roomId,
      collaborationServerUrl: getCollaborationServerUrl(),
      username: getUserName(user),
      collaborationToken: collaborationToken || getCollaborationToken(),
    };
  }, [documentId, position, user, collaborationToken]);

  // Memoize pointer update callback - active in both view and edit modes
  const memoizedPointerUpdate = useMemo(() =>
    collaboration ? (update: { pointer: { x: number; y: number }; button: "up" | "down" }) => {
      if (!excalidrawAPI || !isMountedRef.current || !collaboration.isCollaborating()) {
        return;
      }
      collaboration.updatePointer(update.pointer, update.button);
    } : undefined
  , [collaboration, excalidrawAPI]);

  // Initialize collaboration
  useEffect(() => {
    if (collaborationConfig && !collaboration) {
      setConnectionStatus(ConnectionStatus.CONNECTING);
      setConnectionError(null);
      const collabInstance = new ExcalidrawCollaboration(collaborationConfig, collaborationCallbacks);
      setCollaboration(collabInstance);
    } else if (!collaborationConfig) {
      setConnectionStatus(ConnectionStatus.DISCONNECTED);
      setConnectionError("Excalidraw requires a valid document context");
    }
  }, [collaboration, collaborationConfig, collaborationCallbacks]);

  // Set Excalidraw API and start collaboration
  useEffect(() => {
    if (collaboration && excalidrawAPI && !hasInitialized.current) {
      hasInitialized.current = true;
      collaboration.setExcalidrawAPI(excalidrawAPI);
      collaboration.startCollaboration();
    }
  }, [collaboration, excalidrawAPI]);

  // Cleanup collaboration
  useEffect(() => () => {
    if (collaboration) {
      collaboration.destroy();
    }
  }, [collaboration]);

  // Initialize debounced save function
  useEffect(() => {
    debouncedSaveRef.current = debounce((svg: string) => {
      onSave?.(svg);
    }, 2000);

    return () => {
      debouncedSaveRef.current?.cancel();
    };
  }, [onSave]);

  // Scroll to content helper
  const scrollToContentHelper = useCallback(
    (options: { animate?: boolean; delay?: number } = {}) => {
      const { animate = true, delay = 0 } = options;

      const performScroll = () => {
        if (!excalidrawAPI || !isMountedRef.current) {
          return;
        }

        try {
          excalidrawAPI.scrollToContent(undefined, {
            fitToContent: true,
            animate,
          });
        } catch {
          // Silently ignore scrollToContent errors
        }
      };

      if (delay > 0) {
        setTimeout(performScroll, delay);
      } else {
        performScroll();
      }
    },
    [excalidrawAPI]
  );

  // Handle changes
  const handleChange = useCallback((newElements: ExcalidrawElement[], newAppState: AppState) => {
    // Sync via collaboration
    if (collaboration?.isCollaborating() && !isViewMode) {
      collaboration.syncElements(newElements, newAppState);
    }

    // Generate and save SVG (only in edit mode)
    if (excalidrawAPI && onSave && !isViewMode) {
      generateExcalidrawSVG(newElements, newAppState)
        .then((svg) => {
          debouncedSaveRef.current?.(svg);
        })
        .catch(() => {
          // Silently ignore save errors
        });
    }
  }, [collaboration, excalidrawAPI, onSave, isViewMode]);

  // Toggle view/edit mode
  const handleToggleViewMode = useCallback(async () => {
    const wasEditMode = !isViewMode;

    // Save when switching from edit to view mode
    if (wasEditMode && excalidrawAPI && onSave) {
      const elements = excalidrawAPI.getSceneElements();
      const appState = excalidrawAPI.getAppState();
      try {
        const svg = await generateExcalidrawSVG(elements, appState);
        onSave(svg);
      } catch {
        // Silently ignore
      }
    }

    // Toggle view mode
    setIsViewMode(!isViewMode);

    // When switching from edit to view mode, auto-fit the diagram
    if (wasEditMode) {
      scrollToContentHelper({ animate: true, delay: 100 });
    }
  }, [isViewMode, excalidrawAPI, onSave, scrollToContentHelper]);

  // Toggle fullscreen
  const handleToggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    if (!document.fullscreenElement) {
      void container.requestFullscreen().catch(() => {
        // Fullscreen request failed - silently ignore
      });
    } else {
      document.exitFullscreen();
    }
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = async () => {
      const isNowFullscreen = !!document.fullscreenElement;
      setIsFullscreen(isNowFullscreen);

      // Save and scroll when exiting fullscreen
      if (!isNowFullscreen && excalidrawAPI && onSave) {
        const elements = excalidrawAPI.getSceneElements();
        const appState = excalidrawAPI.getAppState();
        try {
          const svg = await generateExcalidrawSVG(elements, appState);
          onSave(svg);
        } catch {
          // Silently ignore
        }
        scrollToContentHelper({ animate: true, delay: 300 });
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [excalidrawAPI, onSave, scrollToContentHelper]);

  // Scroll to content when triggered by parent (e.g., after resize)
  useEffect(() => {
    if (scrollToContentTrigger && scrollToContentTrigger > 0) {
      scrollToContentHelper({ animate: true, delay: 100 });
    }
  }, [scrollToContentTrigger, scrollToContentHelper]);

  // Listen for window resize events and scroll to content in view mode
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const debouncedResizeHandler = debounce(() => {
      if (isViewMode) {
        scrollToContentHelper({ animate: true, delay: 100 });
      }
    }, 300);

    window.addEventListener("resize", debouncedResizeHandler);

    return () => {
      window.removeEventListener("resize", debouncedResizeHandler);
      debouncedResizeHandler.cancel();
    };
  }, [isViewMode, scrollToContentHelper]);

  // Save on unmount
  useEffect(() => {
    return () => {
      debouncedSaveRef.current?.cancel();
      if (excalidrawAPI && onSave) {
        const elements = excalidrawAPI.getSceneElements();
        const appState = excalidrawAPI.getAppState();
        generateExcalidrawSVG(elements, appState)
          .then((svg) => {
            onSave(svg);
          })
          .catch(() => {
            // Silently ignore
          });
      }
    };
  }, [excalidrawAPI, onSave]);

  if (typeof window === "undefined") {
    return null;
  }

  if (isLoadingInitialData || !initialData) {
    return (
      <ExcalidrawErrorBoundary>
        <Container $isFullscreen={false}>
          <LoadingPlaceholder>
            <Spinner />
            <span>Loading diagram...</span>
          </LoadingPlaceholder>
        </Container>
      </ExcalidrawErrorBoundary>
    );
  }

  return (
    <ExcalidrawErrorBoundary>
      <Container ref={containerRef} $isFullscreen={isFullscreen}>
        <Excalidraw
          excalidrawAPI={setExcalidrawAPI}
          initialData={initialData}
          onChange={handleChange}
          onPointerUpdate={memoizedPointerUpdate}
          viewModeEnabled={isViewMode}
          isCollaborating={true}
          theme={theme}
          UIOptions={{
            canvasActions: {
              changeViewBackgroundColor: true,
              clearCanvas: true,
              export: false,
              loadScene: true,
              saveToActiveFile: false,
              toggleTheme: true,
              saveAsImage: true,
            },
          }}
          renderTopRightUI={() => (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', pointerEvents: 'auto' }}>
              <button
                className="help-icon"
                onClick={handleToggleViewMode}
                title={isViewMode ? "Enter Edit Mode" : "Enter View Mode"}
                aria-label={isViewMode ? "Enter Edit Mode" : "Enter View Mode"}
                style={{ pointerEvents: 'auto' }}
              >
                {isViewMode ? <EditIcon size={20} /> : <EyeIcon size={20} />}
              </button>
              <button
                className="help-icon"
                onClick={handleToggleFullscreen}
                title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                aria-label={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                style={{ pointerEvents: 'auto' }}
              >
                {isFullscreen ? <CollapseIcon size={20} /> : <ExpandedIcon size={20} />}
              </button>
            </div>
          )}
          handleKeyboardGlobally={true}
        />

        {/* Connection status overlay */}
        {(connectionStatus === ConnectionStatus.CONNECTING ||
          connectionStatus === ConnectionStatus.RECONNECTING ||
          connectionStatus === ConnectionStatus.DISCONNECTED) && (
          <ConnectionOverlay $isDark={theme === "dark"}>
            <OverlayContent>
              <Spinner />
              <StatusText>
                {connectionStatus === ConnectionStatus.CONNECTING && "Connecting to collaboration..."}
                {connectionStatus === ConnectionStatus.RECONNECTING && "Reconnecting..."}
                {connectionStatus === ConnectionStatus.DISCONNECTED && (
                  connectionError || "Connection lost. Reconnecting..."
                )}
              </StatusText>
            </OverlayContent>
          </ConnectionOverlay>
        )}
      </Container>
    </ExcalidrawErrorBoundary>
  );
};

const Container = styled.div<{ $isFullscreen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100vw;
  height: 100vh;
  background: ${(props) => props.theme.background};
  overflow: hidden;

  ${(props) =>
    props.$isFullscreen &&
    `
    z-index: 9999;
  `}

  .excalidraw {
    height: 100% !important;
    width: 100% !important;
  }
`;

const LoadingPlaceholder = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: ${(props) => props.theme.textSecondary};
  font-size: 16px;
  background: ${(props) => props.theme.background};
`;

const ConnectionOverlay = styled.div<{ $isDark: boolean }>`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: ${(props) => props.$isDark ? "rgba(30, 30, 30, 0.95)" : "rgba(255, 255, 255, 0.95)"};
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  pointer-events: all;
`;

const OverlayContent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
`;

const Spinner = styled.div`
  width: 48px;
  height: 48px;
  border: 4px solid ${(props) => props.theme.divider};
  border-top-color: #007bff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const StatusText = styled.div`
  font-size: 16px;
  color: ${(props) => props.theme.text};
  text-align: center;
  max-width: 300px;
  line-height: 1.5;
`;

export default ExcalidrawIframe;
