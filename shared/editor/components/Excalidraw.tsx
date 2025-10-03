import * as React from "react";
import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { observer } from "mobx-react";
import styled from "styled-components";
import * as Y from "yjs";
import { v5 as uuidv5 } from "uuid";
import debounce from "lodash/debounce";
import { EditIcon, EyeIcon, ExpandedIcon, CollapseIcon } from "outline-icons";
import Image from "@shared/editor/components/Img";
import ExcalidrawErrorBoundary from "./ExcalidrawErrorBoundary";
import useDragResize from "./hooks/useDragResize";
import { ComponentProps } from "../types";
import type { ExcalidrawElement, AppState, ExcalidrawImperativeAPI } from "../lib/excalidraw/types";
import type { LibraryItem } from "@excalidraw/excalidraw/types/types";
import { ExcalidrawCollaboration, type CollaborationCallbacks } from "../lib/excalidraw/collaboration";
import { ConnectionStatus } from "../lib/excalidraw/constants";
import { getDefaultLibraries } from "../lib/excalidraw/defaultLibraries";
import { extractSceneFromSVG, hasEmbeddedScene } from "../lib/excalidraw/svgExtractor";
import { generateExcalidrawSVG } from "../lib/excalidraw/svgGenerator";

// Namespace UUID for Excalidraw diagrams (generated once, used for all diagrams)
const EXCALIDRAW_NAMESPACE = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

// Dynamic imports for Excalidraw to avoid SSR issues
const ExcalidrawLazy = React.lazy(() =>
  import("@excalidraw/excalidraw").then((module) => ({
    default: module.Excalidraw
  }))
);

type Props = Omit<ComponentProps, "theme"> & {
  editor: any; // Editor instance passed from node
  yDoc?: Y.Doc;
  documentId?: string;
  collaborationToken?: string;
  user?: { name: string; id: string };
  children?: React.ReactNode;
  theme: "light" | "dark"; // Excalidraw theme string
  onChangeSize?: (size: { width?: number; height?: number }) => void;
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

const ExcalidrawComponent: React.FC<Props> = observer(({
  node,
  isSelected,
  isEditable,
  editor,
  getPos,
  theme,
  yDoc,
  documentId,
  collaborationToken,
  user,
  children,
  onChangeSize,
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
  const containerRef = useRef<HTMLDivElement>(null);

  // Resize functionality
  const naturalHeight = 500;
  const naturalWidth = 800; // Default width for resize calculations
  const isResizable = !!onChangeSize;

  const { width, height, setSize, handlePointerDown, dragging } = useDragResize({
    width: naturalWidth,
    height: node.attrs.height ?? naturalHeight,
    naturalWidth,
    naturalHeight,
    gridSnap: 5,
    onChangeSize: onChangeSize ? (size) => onChangeSize({ height: size.height }) : undefined,
    ref: containerRef,
  });
  const debouncedSaveRef = useRef<ReturnType<typeof debounce>>();
  const saveCurrentStateRef = useRef<(() => Promise<void>) | null>(null);
  // Guards to prevent save loops
  const isSavingRef = useRef(false);
  const lastSaveTimestampRef = useRef(0);
  const lastSavedSvgRef = useRef<string>("");
  const hasLoadedDataRef = useRef(false);
  const hasInitiallyLoadedRef = useRef(false);

  // Track component mounted state
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Sync node height changes with resize hook (only when node attribute changes externally)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!dragging && node.attrs.height && node.attrs.height !== height) {
      setSize({
        width: naturalWidth,
        height: node.attrs.height,
      });
    }
    // Only depend on node.attrs.height to avoid interfering with drag resize
    // Including 'height' would cause this to run during drag, resetting the value
  }, [node.attrs.height]);

  // Load initial diagram data from node SVG
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const svg = node.attrs.svg || "";

    // Guard: Skip reload if SVG hasn't actually changed from what we're currently showing
    // This prevents unnecessary reloads and state resets
    if (svg === lastSavedSvgRef.current) {
      return;
    }

    // Guard: Skip reload if already initially loaded
    // Once loaded, Excalidraw's internal state is the source of truth
    // We only reload when the node's SVG actually changes (external edits)
    if (hasInitiallyLoadedRef.current) {
      return;
    }

    // Async function to load scene data
    const loadScene = async () => {
      try {
        if (svg && hasEmbeddedScene(svg)) {
          // Use Excalidraw's native import (async)
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
            // Empty diagram
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
          // No embedded scene data, start with empty diagram
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
        lastSavedSvgRef.current = svg;
        hasLoadedDataRef.current = true;
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

    // Execute async load
    loadScene();
  }, [node]);

  // Dynamically load Excalidraw styles (browser only)
  useEffect(() => {
    if (typeof window !== "undefined") {
      void import("@excalidraw/excalidraw/index.css");
    }
  }, []);

  // Load libraries from team preferences
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    let mounted = true;
    // Try to get team preferences from window stores
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

  // Reusable helper to scroll to content
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

  // Scroll to content when initial data is loaded and API is ready
  useEffect(() => {
    if (excalidrawAPI && initialData && !isLoadingInitialData) {
      scrollToContentHelper({ animate: false, delay: 100 });
    }
  }, [excalidrawAPI, initialData, isLoadingInitialData, scrollToContentHelper]);

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
    // Validate documentId is a valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const validDocumentId = documentId && uuidRegex.test(documentId) ? documentId : null;

    if (!validDocumentId) {
      return null;
    }

    // Generate a stable room ID based on document ID and node position using UUID v5
    // This creates a deterministic UUID from the document ID and position
    const position = typeof getPos === "function" ? getPos() : 0;
    const roomId = uuidv5(`${validDocumentId}:excalidraw:${position}`, EXCALIDRAW_NAMESPACE);

    return {
      documentId: validDocumentId,
      excalidrawId: roomId,
      excalidrawDataId: roomId,
      collaborationServerUrl: getCollaborationServerUrl(),
      username: getUserName(user),
      collaborationToken: collaborationToken || getCollaborationToken(),
    };
  }, [documentId, getPos, user, collaborationToken]);


  // Memoize pointer update callback - only active in edit mode
  const memoizedPointerUpdate = useMemo(() =>
    (!isViewMode && collaboration) ? (update: { pointer: { x: number; y: number }; button: "up" | "down" }) => {
      if (!excalidrawAPI || !isMountedRef.current || !collaboration.isCollaborating()) {
        return;
      }
      collaboration.updatePointer(update.pointer, update.button);
    } : undefined
  , [collaboration, excalidrawAPI, isViewMode]);

  // Initialize collaboration when component mounts
  useEffect(() => {
    // Only start collaboration when we have valid config
    if (collaborationConfig && !collaboration) {
      setConnectionStatus(ConnectionStatus.CONNECTING);
      setConnectionError(null);
      const collabInstance = new ExcalidrawCollaboration(collaborationConfig, collaborationCallbacks);
      setCollaboration(collabInstance);
    } else if (!collaborationConfig) {
      // No valid document context - disable collaboration
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

  // Cleanup collaboration when component unmounts
  useEffect(() => () => {
    if (collaboration) {
      collaboration.destroy();
    }
  }, [collaboration]);

  // Save on unmount to catch any unsaved changes
  useEffect(() => {
    return () => {
      // Cancel any pending debounced saves
      debouncedSaveRef.current?.cancel();

      // Only save if component is actually unmounting, not just props changing
      // isMountedRef becomes false when component unmounts, stays true for prop changes
      if (!isMountedRef.current && excalidrawAPI && editor && typeof getPos === "function") {
        const elements = excalidrawAPI.getSceneElements();
        const appState = excalidrawAPI.getAppState();

        if (elements.length > 0) {
          // Generate and save SVG synchronously
          generateExcalidrawSVG(elements, appState).then((svg) => {
            const pos = getPos();
            const { state, dispatch } = editor.view;
            const tr = state.tr.setNodeMarkup(pos, undefined, {
              ...node.attrs,
              svg,
            });
            dispatch(tr);
          }).catch(() => {
            // Silently ignore save errors on unmount
          });
        }
      }
    };
  }, [excalidrawAPI, editor, getPos, node]);

  // Save current diagram state to node attribute
  const saveCurrentState = useCallback(async () => {
    if (!excalidrawAPI || !editor || typeof getPos !== "function") {
      return;
    }

    // Guard: Already saving, skip
    if (isSavingRef.current) {
      return;
    }

    try {
      isSavingRef.current = true;

      const elements = excalidrawAPI.getSceneElements();
      const appState = excalidrawAPI.getAppState();

      // Generate SVG with embedded scene data
      const svg = await generateExcalidrawSVG(elements, appState);

      // Note: Removed SVG comparison guard as it was causing false positives
      // ProseMirror will naturally handle deduplication of identical transactions

      // Update node attribute via ProseMirror transaction
      const pos = getPos();
      const { state, dispatch } = editor.view;
      // Get current node from ProseMirror state to avoid stale closure
      const currentNode = state.doc.nodeAt(pos);
      if (!currentNode) {
        return;
      }
      const tr = state.tr.setNodeMarkup(pos, undefined, {
        ...currentNode.attrs,
        svg,
      });
      dispatch(tr);

      // Update tracking refs
      lastSavedSvgRef.current = svg;
      lastSaveTimestampRef.current = Date.now();
    } catch {
      setConnectionError("Failed to save diagram");
    } finally {
      isSavingRef.current = false;
    }
  }, [excalidrawAPI, editor, getPos]);

  // Keep ref updated with latest saveCurrentState
  useEffect(() => {
    saveCurrentStateRef.current = saveCurrentState;
  }, [saveCurrentState]);

  // Initialize debounced save function ONCE
  useEffect(() => {
    debouncedSaveRef.current = debounce(() => {
      saveCurrentStateRef.current?.();
    }, 2000); // 2 second delay after last change

    return () => {
      debouncedSaveRef.current?.cancel();
    };
  }, []); // Empty deps - create once, never recreate

  // Handle changes - sync via collaboration
  const handleChange = useCallback((newElements: ExcalidrawElement[], newAppState: AppState) => {
    // Sync changes via collaboration
    if (collaboration?.isCollaborating() && !isViewMode) {
      collaboration.syncElements(newElements, newAppState);
    }

    // Guard: Check if save is in progress
    if (isSavingRef.current) {
      return;
    }

    // Guard: Check cooldown period after last save
    const timeSinceLastSave = Date.now() - lastSaveTimestampRef.current;
    if (timeSinceLastSave < 500) {
      return;
    }

    // Auto-save with debounce
    debouncedSaveRef.current?.();
  }, [collaboration, isViewMode]);

  const handleToggleViewMode = useCallback(async () => {
    const wasEditMode = !isViewMode;

    // Save when switching from edit to view mode and WAIT for it to complete
    if (wasEditMode) {
      await saveCurrentState();
    }

    // Toggle view mode AFTER save completes
    setIsViewMode(!isViewMode);

    // When switching from edit to view mode, auto-fit the diagram to viewport
    if (wasEditMode) {
      scrollToContentHelper({ animate: true, delay: 100 });
    }
  }, [isViewMode, saveCurrentState, scrollToContentHelper]);

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

      // Save when exiting fullscreen and WAIT for it to complete
      if (!isNowFullscreen) {
        await saveCurrentState();
        scrollToContentHelper({ animate: true, delay: 300 });
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [saveCurrentState, scrollToContentHelper]);

  // Track previous height for resize detection
  const previousHeightRef = useRef<number | undefined>(height);

  // Scroll to content when height changes in view mode (drag resize)
  useEffect(() => {
    // Skip on initial mount
    if (previousHeightRef.current === undefined) {
      previousHeightRef.current = height;
      return;
    }

    // Only scroll if height actually changed and we're in view mode
    if (height !== previousHeightRef.current && isViewMode) {
      previousHeightRef.current = height;
      scrollToContentHelper({ animate: true, delay: 100 });
    } else {
      previousHeightRef.current = height;
    }
  }, [height, isViewMode, scrollToContentHelper]);

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

  // Note: Focus handling removed as this component is now used in iframe context
  // where focus is handled naturally by the browser

  // Don't render on server side
  if (typeof window === "undefined") {
    return null;
  }

  // Show loading state while fetching initial data
  if (isLoadingInitialData || !initialData) {
    return (
      <ExcalidrawErrorBoundary>
        <Container
          ref={containerRef}
          $isSelected={isSelected}
          $isFullscreen={isFullscreen}
          $height={height}
        >
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
      <Container
        ref={containerRef}
        $isSelected={isSelected}
        $isFullscreen={isFullscreen}
        $height={height}
      >
        <DragHandleBar>
          <Img src="/images/excalidraw.png" alt="Excalidraw" />
          Excalidraw
        </DragHandleBar>

        <ExcalidrawWrapper
          $isViewMode={isViewMode}
          $hasResizeBar={isEditable && isResizable}
          style={{ pointerEvents: dragging ? "none" : "all" }}
          onPointerDown={(e) => {
            // Stop propagation in edit mode to prevent ProseMirror from intercepting
            // drag events, allowing Excalidraw to handle all interactions internally
            if (!isViewMode) {
              e.stopPropagation();
            }
          }}
        >
          <React.Suspense fallback={<LoadingPlaceholder>Loading Excalidraw...</LoadingPlaceholder>}>
            <ExcalidrawLazy
              excalidrawAPI={setExcalidrawAPI}
              initialData={initialData}
              onChange={handleChange}
              onPointerUpdate={memoizedPointerUpdate}
              viewModeEnabled={isViewMode}
              isCollaborating={true}
              theme={theme}
              UIOptions={{
                canvasActions: {
                  clearCanvas: true,
                  export: {
                    saveFileToDisk: false,
                  },
                  loadScene: true,
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
              handleKeyboardGlobally={isSelected}
            />
          </React.Suspense>

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
        </ExcalidrawWrapper>

        {isEditable && isResizable && (
          <ResizeHandleBar
            onPointerDown={handlePointerDown("bottom")}
            $dragging={!!dragging}
          >
            {dragging ? "Resizing..." : "⋮"}
          </ResizeHandleBar>
        )}

        {children}
      </Container>
    </ExcalidrawErrorBoundary>
  );
});

const Container = styled.div<{
  $isSelected: boolean;
  $isFullscreen: boolean;
  $height?: number;
}>`
  position: relative;
  margin: 0;
  border-radius: 8px;
  overflow: hidden;
  transition: all 150ms ease-in-out;
  padding: 0;
  min-height: 400px;
  height: ${(props) => props.$height || 500}px;
  width: 100%;

  /* Mobile responsive */
  @media (max-width: 768px) {
    min-height: 300px;
    height: ${(props) => (props.$height && props.$height < 500 ? props.$height : 400)}px;
  }


  ${(props) =>
    props.$isSelected &&
    `
    outline: 2px solid ${props.theme.selected};
    outline-offset: 2px;
  `}

  ${(props) =>
    props.$isFullscreen &&
    `
    min-height: 100vh;
    height: 100vh;
    width: 100vw;
    margin: 0;
    border-radius: 0;
  `}
`;

const ExcalidrawWrapper = styled.div<{ $isViewMode: boolean; $hasResizeBar: boolean }>`
  position: relative;
  width: 100%;
  height: ${(props) => props.$hasResizeBar ? 'calc(100% - 56px)' : 'calc(100% - 28px)'};
  /* Account for top bar (28px) + optional bottom bar (28px) */
  background: ${(props) => props.theme.background};
  border-radius: 8px;
  overflow: hidden;

  ${(props) =>
    !props.$isViewMode &&
    `
    /* Enable proper pointer event capture for dragging in edit mode */
    touch-action: none;
    user-select: none;
  `}

  .excalidraw {
    height: 100% !important;
    width: 100% !important;
  }

  .excalidraw .App-menu_top {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
  }

  .excalidraw .layer-ui__wrapper {
    height: 100% !important;
  }

  .excalidraw .layer-ui__wrapper__top-left,
  .excalidraw .layer-ui__wrapper__top-right,
  .excalidraw .layer-ui__wrapper__bottom-left,
  .excalidraw .layer-ui__wrapper__bottom-right {
    position: absolute;
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
  border-radius: 8px;
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

const Img = styled(Image)`
  border-radius: 2px;
  background: #fff;
  box-shadow: 0 0 0 1px #fff;
  margin: 4px;
  width: 18px;
  height: 18px;
`;

const DragHandleBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-start;
  border-bottom: 1px solid ${(props) => props.theme.divider};
  background: ${(props) => props.theme.backgroundSecondary};
  color: ${(props) => props.theme.textSecondary};
  padding: 0 8px;
  user-select: none;
  height: 28px;
  font-size: 13px;
  font-weight: 500;
  cursor: grab;

  &:active {
    cursor: grabbing;
  }
`;

const ResizeHandleBar = styled.div<{ $dragging: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  border-top: 1px solid ${(props) => props.theme.divider};
  background: ${(props) => props.theme.backgroundSecondary};
  color: ${(props) => props.theme.textSecondary};
  padding: 0 8px;
  user-select: none;
  height: 28px;
  font-size: 13px;
  font-weight: 500;
  cursor: ns-resize;
  transition: background 150ms ease-in-out;

  &:hover {
    background: ${(props) => props.theme.background};
  }

  &:active {
    background: ${(props) => props.theme.divider};
  }

  ${(props) =>
    props.$dragging &&
    `
    background: ${props.theme.divider};
  `}
`;

export default ExcalidrawComponent;