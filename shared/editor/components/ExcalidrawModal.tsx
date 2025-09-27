import * as React from "react";
import { useState, useEffect, useCallback, useMemo } from "react";
import styled from "styled-components";
import * as Y from "yjs";
import { s } from "../../styles";

// Dynamic imports for Excalidraw to avoid SSR issues
const ExcalidrawLazy = React.lazy(() =>
  import("@excalidraw/excalidraw").then((module) => ({
    default: module.Excalidraw
  }))
);

// Type imports only
import type { ExcalidrawElement, AppState, ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types/types";

type Props = {
  isOpen: boolean;
  excalidrawId: string;
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
}> = ({ excalidrawAPI, initialData, onChange }) => {
  return (
    <React.Suspense fallback={<div>Loading Excalidraw...</div>}>
      <ExcalidrawLazy
        excalidrawAPI={excalidrawAPI}
        initialData={initialData}
        onChange={onChange}
        theme="light"
        UIOptions={{
          canvasActions: {
            loadScene: false,
            saveToActiveFile: false,
            export: false,
          },
        }}
      />
    </React.Suspense>
  );
};

const ExcalidrawModal: React.FC<Props> = ({
  isOpen,
  excalidrawId,
  initialData,
  yDoc,
  onSave,
  onClose,
}) => {
  const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawImperativeAPI | null>(null);
  const [elements, setElements] = useState<ExcalidrawElement[]>(initialData?.elements || []);
  const [appState, setAppState] = useState<Partial<AppState>>(initialData?.appState || {});
  const [isLoaded, setIsLoaded] = useState(false);
  const [ySubDoc, setYSubDoc] = useState<Y.Doc | null>(null);
  const [yElements, setYElements] = useState<Y.Array<any> | null>(null);

  // Dynamically load Excalidraw styles (browser only)
  useEffect(() => {
    if (isOpen && typeof window !== "undefined") {
      void import("@excalidraw/excalidraw/index.css");
    }
  }, [isOpen]);

  // Initialize Y.js subdocument for collaboration
  useEffect(() => {
    if (yDoc && excalidrawId && isOpen) {
      const subdocKey = `excalidraw-${excalidrawId}`;
      let subdoc = yDoc.getSubDoc(subdocKey);

      if (!subdoc) {
        subdoc = new Y.Doc();
        yDoc.setSubDoc(subdocKey, subdoc);
      }

      const elementsArray = subdoc.getArray("elements");

      setYSubDoc(subdoc);
      setYElements(elementsArray);

      // Listen for remote changes
      const handleElementsChange = () => {
        const remoteElements = elementsArray.toArray();
        if (excalidrawAPI && remoteElements.length > 0) {
          excalidrawAPI.updateScene({
            elements: remoteElements,
          });
        }
        setElements(remoteElements);
      };

      elementsArray.observe(handleElementsChange);

      return () => {
        elementsArray.unobserve(handleElementsChange);
      };
    }
  }, [yDoc, excalidrawId, isOpen, excalidrawAPI]);

  // Initialize Excalidraw with initial data
  useEffect(() => {
    if (excalidrawAPI && initialData && isOpen) {
      excalidrawAPI.updateScene({
        elements: initialData.elements,
        appState: initialData.appState,
      });
      setIsLoaded(true);
    }
  }, [excalidrawAPI, initialData, isOpen]);

  const handleChange = useCallback((newElements: ExcalidrawElement[], newAppState: AppState) => {
    setElements(newElements);
    setAppState(newAppState);

    // Sync to Y.js for collaboration
    if (yElements && ySubDoc) {
      ySubDoc.transact(() => {
        yElements.delete(0, yElements.length);
        yElements.insert(0, newElements);
      });
    }
  }, [yElements, ySubDoc]);

  const handleSave = useCallback(async () => {
    if (!excalidrawAPI) return;

    try {
      const currentElements = excalidrawAPI.getSceneElements();
      const currentAppState = excalidrawAPI.getAppState();

      // Dynamically import exportToSvg to avoid SSR issues
      const { exportToSvg } = await import("@excalidraw/excalidraw");

      // Export to SVG
      const svg = await exportToSvg({
        elements: currentElements,
        appState: currentAppState,
        files: {},
      });

      // Convert SVG to string
      const svgString = new XMLSerializer().serializeToString(svg);

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
    } catch (error) {
      console.error("Failed to save Excalidraw:", error);
    }
  }, [excalidrawAPI, onSave]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Only handle keys when the modal is focused
    if (!isOpen) return;

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
          />
        </ExcalidrawContainer>
      </Container>
    </Overlay>
  );
};

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
  width: 90vw;
  height: 90vh;
  max-width: 1200px;
  max-height: 800px;
  background: ${(props) => props.theme.background};
  border-radius: 8px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const Header = styled.div`
  padding: ${s(3)};
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
  gap: ${s(2)};
`;

const StyledButton = styled.button<{ $primary?: boolean }>`
  padding: 8px 16px;
  border: 1px solid ${(props) => props.theme.divider};
  border-radius: 4px;
  background: ${(props) => props.$primary ? props.theme.primary : props.theme.background};
  color: ${(props) => props.$primary ? "#fff" : props.theme.text};
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${(props) => props.$primary ? props.theme.primaryHover || props.theme.primary : props.theme.backgroundSecondary};
  }

  &:focus {
    outline: 2px solid ${(props) => props.theme.primary};
    outline-offset: 2px;
  }
`;

const ExcalidrawContainer = styled.div`
  flex: 1;
  overflow: hidden;

  .excalidraw {
    height: 100%;
  }
`;

export default ExcalidrawModal;