import * as React from "react";
import { useState, useEffect, useCallback, useRef } from "react";
import { observer } from "mobx-react";
import styled from "styled-components";
import * as Y from "yjs";
import { ExcalidrawCollaboration, type CollaborationState, type CollaborationCallbacks } from "../lib/excalidraw/collaboration";
import ExcalidrawCollabUI from "./ExcalidrawCollabUI";
import { ConnectionStatus, CollabErrorType } from "../lib/excalidraw/constants";
import useStores from "../../hooks/useStores";

// Helper functions for collaboration - now integrated with Outline's auth system
const getCollaborationServerUrl = (): string => {
  if (typeof window !== "undefined") {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    return `${protocol}//${host}`;
  }
  return "http://localhost:3000";
};

const getUserName = (user?: { name: string }): string => {
  return user?.name || "Anonymous User";
};

const getCollaborationToken = (): string | undefined => {
  // Extract token from cookies - this matches how Outline's websockets work
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

// Dynamic imports for Excalidraw to avoid SSR issues
const ExcalidrawLazy = React.lazy(() =>
  import("@excalidraw/excalidraw").then((module) => ({
    default: module.Excalidraw
  }))
);

// Type imports - using any for now due to module resolution issues
// These will be resolved when the build system processes the imports
type ExcalidrawElement = any;
type AppState = any;
type ExcalidrawImperativeAPI = any;


type Props = {
  isOpen: boolean;
  excalidrawId: string;
  documentId?: string;
  collaborationToken?: string;
  user?: { name: string; id: string }; // Add user prop for real user data
  initialData?: {
    elements: ExcalidrawElement[];
    appState: Partial<AppState>;
  };
  yDoc?: Y.Doc;
  onSave: (data: {
    elements: ExcalidrawElement[];
    appState: Partial<AppState>;
    svg: string;
  }) => void;
  onClose: () => void;
};

// Dynamic import wrapper to handle SSR
const ExcalidrawWrapper: React.FC<{
  excalidrawAPI: (api: ExcalidrawImperativeAPI) => void;
  initialData?: { elements: ExcalidrawElement[]; appState: Partial<AppState> };
  onChange: (elements: ExcalidrawElement[], appState: AppState) => void;
  onPointerUpdate?: (update: { pointer: { x: number; y: number }; button: string }) => void;
  theme?: "light" | "dark";
}> = ({ excalidrawAPI, initialData, onChange, onPointerUpdate, theme = "light" }) => (
    <React.Suspense fallback={<div>Loading Excalidraw...</div>}>
      <ExcalidrawLazy
        excalidrawAPI={excalidrawAPI}
        initialData={initialData}
        onChange={onChange}
        onPointerUpdate={onPointerUpdate}
        isCollaborating={true}
        theme={theme}
        UIOptions={{
          canvasActions: {
            loadScene: true,
            saveToActiveFile: false,
            export: false,
          },
        }}
        renderTopRightUI={() => null}
        detectScroll={false}
        handleKeyboardGlobally={false}
      />
    </React.Suspense>
);

const ExcalidrawModal: React.FC<Props> = observer(({
  isOpen,
  excalidrawId,
  documentId,
  collaborationToken,
  user,
  initialData,
  yDoc: _yDoc,
  onSave,
  onClose,
}) => {
  const stores = useStores();
  const resolvedTheme = stores?.ui?.resolvedTheme || "light";
  const excalidrawTheme = resolvedTheme === "dark" ? "dark" : "light";

  const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawImperativeAPI | null>(null);
  const [collaboration, setCollaboration] = useState<ExcalidrawCollaboration | null>(null);
  const [collabState, setCollabState] = useState<CollaborationState>({
    connectionStatus: ConnectionStatus.DISCONNECTED,
    collaborators: new Map(),
    isCollaborating: false,
    error: null,
    retryCount: 0
  });
  const isMountedRef = useRef(true);
  const hasInitialized = useRef(false);
  const [showCollabUI, setShowCollabUI] = useState(false);

  // Dynamically load Excalidraw styles (browser only)
  useEffect(() => {
    if (isOpen && typeof window !== "undefined") {
      void import("@excalidraw/excalidraw/index.css");
    }
  }, [isOpen]);

  // Reset mounted ref when modal opens
  useEffect(() => {
    if (isOpen) {
      isMountedRef.current = true;
      hasInitialized.current = false;
    }
  }, [isOpen]);

  // Handle collaboration state changes
  const handleCollabStateChange = useCallback((newState: CollaborationState) => {
    if (!isMountedRef.current) {
      return;
    }
    setCollabState(newState);

    // Show/hide collaboration UI based on collaboration state
    setShowCollabUI(newState.isCollaborating);
  }, []);

  // Handle collaboration errors
  const handleCollabError = useCallback((message: string, _type: CollabErrorType) => {
    setCollabState(prev => ({ ...prev, error: message }));
  }, []);

  // Handle retry connection
  const handleRetryConnection = useCallback(() => {
    if (collaboration && !collabState.isCollaborating) {
      collaboration.startCollaboration();
    }
  }, [collaboration, collabState.isCollaborating]);

  // Handle dismiss error
  const handleDismissError = useCallback(() => {
    setCollabState(prev => ({ ...prev, error: null }));
  }, []);

  // Initialize collaboration when modal opens
  useEffect(() => {
    if (isOpen && documentId && excalidrawId && !collaboration) {
      const callbacks: CollaborationCallbacks = {
        onStateChange: handleCollabStateChange,
        onError: handleCollabError,
      };

      const config = {
        documentId,
        excalidrawId,
        collaborationServerUrl: getCollaborationServerUrl(),
        username: getUserName(user),
        collaborationToken: collaborationToken || getCollaborationToken(),
      };

      const collabInstance = new ExcalidrawCollaboration(config, callbacks);
      setCollaboration(collabInstance);
    }
  }, [isOpen, documentId, excalidrawId, user, collaborationToken, collaboration, handleCollabStateChange, handleCollabError]);

  // Set Excalidraw API and start collaboration
  useEffect(() => {
    if (collaboration && excalidrawAPI && !hasInitialized.current) {
      hasInitialized.current = true;
      collaboration.setExcalidrawAPI(excalidrawAPI);
      collaboration.startCollaboration();
    }
  }, [collaboration, excalidrawAPI]);

  // Stop collaboration when modal closes
  useEffect(() => {
    if (!isOpen && collaboration && hasInitialized.current) {
      collaboration.stopCollaboration();
      hasInitialized.current = false;
    }
  }, [isOpen, collaboration]);

  // Cleanup collaboration when modal unmounts
  useEffect(() => () => {
    if (collaboration) {
      collaboration.destroy();
    }
  }, [collaboration]);

  // Initialize Excalidraw with initial data
  useEffect(() => {
    if (excalidrawAPI && initialData && isOpen) {
      excalidrawAPI.updateScene({
        elements: initialData.elements,
        appState: initialData.appState,
      });
    }
  }, [excalidrawAPI, initialData, isOpen]);

  const handleChange = useCallback((newElements: ExcalidrawElement[], newAppState: AppState) => {
    // Sync changes via collaboration
    if (collaboration && collabState.isCollaborating) {
      collaboration.syncElements(newElements, newAppState);
    }
  }, [collaboration, collabState.isCollaborating]);

  const handleSave = useCallback(async () => {
    if (!excalidrawAPI) {
      return;
    }

    try {
      const currentElements = excalidrawAPI.getSceneElements();
      const currentAppState = excalidrawAPI.getAppState();

      // Dynamically import exportToSvg to avoid SSR issues
      const { exportToSvg } = await import("@excalidraw/excalidraw");

      // Export to SVG with optimized settings
      const svg = await exportToSvg({
        elements: currentElements,
        appState: {
          ...currentAppState,
          exportWithDarkMode: false,
          exportEmbedScene: false,
        },
        files: {},
        exportPadding: 10, // Minimal padding
      });

      // Convert SVG to string and optimize it
      let svgString = new XMLSerializer().serializeToString(svg);

      // Remove unnecessary whitespace and optimize viewBox
      svgString = svgString.replace(/\s+/g, ' ').trim();

      // Save and close modal only for this user
      onSave({
        elements: currentElements,
        appState: {
          viewBackgroundColor: currentAppState.viewBackgroundColor,
          gridSize: currentAppState.gridSize,
          zoom: currentAppState.zoom,
          scrollX: currentAppState.scrollX,
          scrollY: currentAppState.scrollY,
        },
        svg: svgString,
      });

      // Close modal only for this user
      onClose();
    } catch (_error) {
      // Silently handle save errors
    }
  }, [excalidrawAPI, onSave, onClose]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Only handle keys when the modal is focused
    if (!isOpen) {
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onClose();
      return;
    }

    if ((event.metaKey || event.ctrlKey) && event.key === "s") {
      event.preventDefault();
      event.stopPropagation();
      handleSave();
      return;
    }

    // Stop other keyboard shortcuts from reaching Outline editor
    if (event.metaKey || event.ctrlKey) {
      // Allow common editing shortcuts to work in Excalidraw
      const allowedKeys = ['z', 'y', 'c', 'v', 'x', 'a', '+', '-', '0'];
      if (allowedKeys.includes(event.key.toLowerCase())) {
        event.stopPropagation();
      }
    }
  }, [onClose, handleSave, isOpen]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
    return undefined;
  }, [isOpen, handleKeyDown]);

  if (!isOpen) {
    return null;
  }

  // Don't render on server side
  if (typeof window === "undefined") {
    return null;
  }

  return (
    <Overlay onClick={onClose}>
      <Container
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
        onMouseMove={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        onKeyUp={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
      >
        <Header>
          <HeaderContent>
            <Title>Edit Drawing</Title>
            <ButtonGroup>
              <StyledButton onClick={onClose}>
                Cancel
              </StyledButton>
              <StyledButton onClick={handleSave} $primary>
                Save
              </StyledButton>
            </ButtonGroup>
          </HeaderContent>
        </Header>

        <ExcalidrawContainer
          onMouseDown={(e) => e.stopPropagation()}
          onMouseUp={(e) => e.stopPropagation()}
          onMouseMove={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          onKeyUp={(e) => e.stopPropagation()}
          onWheel={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
          onDragStart={(e) => e.stopPropagation()}
          onDrag={(e) => e.stopPropagation()}
          onDragEnd={(e) => e.stopPropagation()}
        >
          <ExcalidrawWrapper
            excalidrawAPI={setExcalidrawAPI}
            initialData={initialData}
            onChange={handleChange}
            onPointerUpdate={collaboration ? (update) => {
              if (!excalidrawAPI || !isMountedRef.current || !collabState.isCollaborating) {
                return;
              }
              collaboration.updatePointer(update.pointer, update.button);
            } : undefined}
            theme={excalidrawTheme}
          />

          {/* Collaboration is now handled by the collaboration instance */}
        </ExcalidrawContainer>

        {/* Collaboration UI */}
        {showCollabUI && (
          <ExcalidrawCollabUI
            connectionStatus={collabState.connectionStatus}
            collaborators={collabState.collaborators}
            isCollaborating={collabState.isCollaborating}
            error={collabState.error}
            onRetryConnection={handleRetryConnection}
            onDismissError={handleDismissError}
          />
        )}
      </Container>
    </Overlay>
  );
});

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Container = styled.div`
  width: 95vw;
  height: 95vh;
  max-width: 2200px;
  max-height: 1400px;
  background: ${(props) => props.theme.background};
  border-radius: 8px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const Header = styled.div`
  padding: 16px;
  border-bottom: 1px solid ${(props) => props.theme.divider};
  background: ${(props) => props.theme.background};
`;

const HeaderContent = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Title = styled.h2`
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: ${(props) => props.theme.text};
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 8px;
`;

const StyledButton = styled.button<{ $primary?: boolean }>`
  padding: 8px 16px;
  border: 1px solid ${(props) => props.theme.divider};
  border-radius: 4px;
  background: ${(props) => props.$primary ? '#007bff' : props.theme.background};
  color: ${(props) => props.$primary ? "#fff" : props.theme.text};
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${(props) => props.$primary ? '#0056b3' : props.theme.backgroundSecondary};
  }

  &:focus {
    outline: 2px solid #007bff;
    outline-offset: 2px;
  }
`;

const ExcalidrawContainer = styled.div`
  flex: 1;
  overflow: hidden;
  position: relative;

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

export default ExcalidrawModal;