import * as React from "react";
import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { v5 as uuidv5 } from "uuid";
import debounce from "lodash/debounce";
import { EditIcon, EyeIcon, ExpandedIcon, CollapseIcon } from "outline-icons";
import ErrorBoundary from "~/components/ErrorBoundary";
import Spinner from "@shared/components/Spinner";
import Flex from "@shared/components/Flex";
import NudeButton from "~/components/NudeButton";
import Logger from "~/utils/Logger";
import type { ExcalidrawElement, AppState, ExcalidrawImperativeAPI } from "../lib/types";
import { ExcalidrawCollaboration, type CollaborationCallbacks } from "../lib/collaboration";
import { ConnectionStatus } from "../lib/constants";
import { extractSceneFromSVG, hasEmbeddedScene } from "../lib/svgExtractor";
import { generateExcalidrawSVG } from "../lib/svgGenerator";
import { getCollaborationServerUrl, getUserName, getCollaborationToken } from "../lib/utils";
import { useExcalidrawLibraries } from "../hooks/useExcalidrawLibraries";
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
  libraryUrls?: string[];
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
  libraryUrls,
}) => {
  const { t } = useTranslation();
  const [isViewMode, setIsViewMode] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawImperativeAPI | null>(null);
  const [collaboration, setCollaboration] = useState<ExcalidrawCollaboration | null>(null);
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
  const excalidrawAPIRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const onSaveRef = useRef(onSave);

  // Load libraries from team preferences
  useExcalidrawLibraries(excalidrawAPI, isMountedRef, libraryUrls);

  // Keep refs up to date (Fix #4: Prevent stale closures)
  useEffect(() => {
    excalidrawAPIRef.current = excalidrawAPI;
  }, [excalidrawAPI]);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

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
                userToFollow: null,
              },
            });
          } else {
            setInitialData({
              elements: [],
              appState: {
                scrollX: 0,
                scrollY: 0,
                zoom: { value: 1 },
                userToFollow: null,
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
              userToFollow: null,
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

  // Centralized save function with error handling (Fix #2, #10)
  const performSave = useCallback(async (svg: string, immediate = false): Promise<boolean> => {
    const saveCallback = onSaveRef.current;
    if (!saveCallback) {
      return false;
    }

    try {
      saveCallback(svg);
      return true;
    } catch (error) {
      // Fix #2: Log errors instead of silently ignoring
      Logger.error("Excalidraw save failed", error);
      return false;
    }
  }, []);

  // Initialize debounced save function
  useEffect(() => {
    debouncedSaveRef.current = debounce((svg: string) => {
      void performSave(svg, false);
    }, 2000);

    return () => {
      debouncedSaveRef.current?.cancel();
    };
  }, [performSave]);

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

    // Handle userToFollow changes from Excalidraw's built-in UI
    if (newAppState.userToFollow !== undefined) {
      const currentFollow = collaboration?.getUserToFollow();
      const newFollow = newAppState.userToFollow;

      // Check if follow state changed
      if (newFollow && (!currentFollow || currentFollow.socketId !== newFollow.socketId)) {
        // User clicked to follow someone
        collaboration?.setUserToFollow(newFollow);
      } else if (!newFollow && currentFollow) {
        // User clicked to unfollow
        collaboration?.clearUserToFollow();
      }
    }

    // Generate and save SVG (only in edit mode)
    // Fix #6: Snapshot elements/appState before async operation to prevent race conditions
    if (excalidrawAPI && onSave && !isViewMode) {
      const elementSnapshot = [...newElements];
      const appStateSnapshot = { ...newAppState };

      generateExcalidrawSVG(elementSnapshot, appStateSnapshot)
        .then((svg) => {
          debouncedSaveRef.current?.(svg);
        })
        .catch((error) => {
          // Fix #2: Log errors instead of silently ignoring
          Logger.error("Excalidraw failed to generate SVG for save", error);
        });
    }
  }, [collaboration, excalidrawAPI, onSave, isViewMode]);

  // Toggle view/edit mode
  const handleToggleViewMode = useCallback(async () => {
    const wasEditMode = !isViewMode;

    // Save when switching from edit to view mode
    // Fix #3: Cancel pending debounced save before immediate save
    if (wasEditMode && excalidrawAPIRef.current && onSaveRef.current) {
      debouncedSaveRef.current?.cancel();

      const elements = excalidrawAPIRef.current.getSceneElements();
      const appState = excalidrawAPIRef.current.getAppState();
      try {
        const svg = await generateExcalidrawSVG(elements, appState);
        await performSave(svg, true);
      } catch (error) {
        // Fix #2: Log errors instead of silently ignoring
        Logger.error("Excalidraw failed to save on view mode toggle", error);
      }
    }

    // Toggle view mode
    setIsViewMode(!isViewMode);

    // When switching from edit to view mode, auto-fit the diagram
    if (wasEditMode) {
      scrollToContentHelper({ animate: true, delay: 100 });
    }
  }, [isViewMode, scrollToContentHelper, performSave]);

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
      // Fix #3: Cancel pending debounced save before immediate save
      if (!isNowFullscreen && excalidrawAPIRef.current && onSaveRef.current) {
        debouncedSaveRef.current?.cancel();

        const elements = excalidrawAPIRef.current.getSceneElements();
        const appState = excalidrawAPIRef.current.getAppState();
        try {
          const svg = await generateExcalidrawSVG(elements, appState);
          await performSave(svg, true);
        } catch (error) {
          // Fix #2: Log errors instead of silently ignoring
          Logger.error("Excalidraw failed to save on fullscreen exit", error);
        }
        scrollToContentHelper({ animate: true, delay: 300 });
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [scrollToContentHelper, performSave]);

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
  // Fix #4: Use refs to avoid stale closures
  useEffect(() => () => {
    debouncedSaveRef.current?.cancel();
    const api = excalidrawAPIRef.current;
    const saveCallback = onSaveRef.current;

    if (api && saveCallback) {
      const elements = api.getSceneElements();
      const appState = api.getAppState();
      generateExcalidrawSVG(elements, appState)
        .then((svg) => {
          try {
            saveCallback(svg);
          } catch (error) {
            // Fix #2: Log errors instead of silently ignoring
            Logger.error("Excalidraw failed to save on unmount", error);
          }
        })
        .catch((error) => {
          // Fix #2: Log errors instead of silently ignoring
          Logger.error("Excalidraw failed to generate SVG on unmount", error);
        });
    }
  }, []);

  if (typeof window === "undefined") {
    return null;
  }

  if (isLoadingInitialData || !initialData) {
    return (
      <ErrorBoundary>
        <Container $isFullscreen={false}>
          <Flex column align="center" justify="center" gap={16} style={{ width: '100%', height: '100%', color: 'var(--text-secondary)' }}>
            <Spinner style={{ width: '48px', height: '48px' }} />
            <span>{t("Loading diagram...")}</span>
          </Flex>
        </Container>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
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
            <Flex gap={8} align="center" style={{ pointerEvents: 'auto' }}>
              <StyledButton
                onClick={handleToggleViewMode}
                title={isViewMode ? t("Enter Edit Mode") : t("Enter View Mode")}
                aria-label={isViewMode ? t("Enter Edit Mode") : t("Enter View Mode")}
              >
                {isViewMode ? <EditIcon size={20} /> : <EyeIcon size={20} />}
              </StyledButton>
              <StyledButton
                onClick={handleToggleFullscreen}
                title={isFullscreen ? t("Exit Fullscreen") : t("Enter Fullscreen")}
                aria-label={isFullscreen ? t("Exit Fullscreen") : t("Enter Fullscreen")}
              >
                {isFullscreen ? <CollapseIcon size={20} /> : <ExpandedIcon size={20} />}
              </StyledButton>
            </Flex>
          )}
          handleKeyboardGlobally={true}
        />

        {/* Connection status overlay */}
        {(connectionStatus === ConnectionStatus.CONNECTING ||
          connectionStatus === ConnectionStatus.RECONNECTING ||
          connectionStatus === ConnectionStatus.DISCONNECTED) && (
          <ConnectionOverlay $isDark={theme === "dark"}>
            <Flex column align="center" gap={16}>
              <Spinner style={{ width: '48px', height: '48px' }} />
              <div style={{ fontSize: '16px', textAlign: 'center', maxWidth: '300px', lineHeight: 1.5 }}>
                {connectionStatus === ConnectionStatus.CONNECTING && t("Connecting to collaboration...")}
                {connectionStatus === ConnectionStatus.RECONNECTING && t("Reconnecting...")}
                {connectionStatus === ConnectionStatus.DISCONNECTED && (
                  connectionError || t("Connection lost. Reconnecting...")
                )}
              </div>
            </Flex>
          </ConnectionOverlay>
        )}
      </Container>
    </ErrorBoundary>
  );
};

const StyledButton = styled(NudeButton)`
  display: flex;
  justify-content: center;
  align-items: center;
  width: 2rem;
  height: 2rem;
  padding: 0;
  border: none;
  border-radius: 0.5rem;
  box-shadow: ${(props) => props.theme.isDark
    ? '0 0 0 1px hsl(0, 0%, 7%)'
    : '0 0 0 1px #ffffff'};
  background-color: ${(props) => props.theme.isDark
    ? 'hsl(240, 8%, 15%)'
    : '#ececf4'};
  cursor: pointer;
  transition: background-color 0.1s ease, box-shadow 0.1s ease;

  &:hover {
    background-color: ${(props) => props.theme.isDark
      ? 'hsl(240, 8%, 18%)'
      : '#e0e0e8'};
  }

  &:active {
    background-color: ${(props) => props.theme.isDark
      ? 'hsl(240, 8%, 20%)'
      : '#d4d4dc'};
  }
`;

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

export default ExcalidrawIframe;
