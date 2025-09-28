import * as React from "react";
import { useState, useCallback } from "react";
import styled from "styled-components";
import * as Y from "yjs";
import ExcalidrawModal from "./ExcalidrawModal";
import { ComponentProps } from "../types";
import type { ExcalidrawElement, AppState } from "@excalidraw/excalidraw/types/types";

type Props = ComponentProps & {
  onEdit: () => void;
  onUpdateData: (data: {
    elements: ExcalidrawElement[];
    appState: Partial<AppState>;
    svg: string;
  }) => void;
  onChangeSize?: ({ width, height }: { width: number; height: number }) => void;
  yDoc?: Y.Doc;
  documentId?: string;
  collaborationToken?: string;
  user?: { name: string; id: string };
  children?: React.ReactNode;
};

const ExcalidrawComponent: React.FC<Props> = ({
  node,
  isSelected,
  isEditable,
  onUpdateData,
  yDoc,
  documentId,
  collaborationToken,
  user,
  children,
}) => {
  const { id, data, svg, width, height } = node.attrs;
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleClick = useCallback(() => {
    if (isEditable) {
      setIsModalOpen(true);
    }
  }, [isEditable]);

  const handleModalClose = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const handleModalSave = useCallback((newData: {
    elements: ExcalidrawElement[];
    appState: Partial<AppState>;
    svg: string;
  }) => {
    onUpdateData(newData);
    setIsModalOpen(false);
  }, [onUpdateData]);

  // Calculate display dimensions based on SVG content or use defaults
  const displayWidth = width || (svg ? 'auto' : 600);
  const displayHeight = height || (svg ? 'auto' : 400);

  return (
    <>
      <Container
        onClick={handleClick}
        $isSelected={isSelected}
        $isEditable={isEditable}
        $hasContent={!!svg}
        style={
          svg
            ? {} // No fixed dimensions when SVG exists - let it size naturally
            : {
                width: displayWidth,
                height: displayHeight,
              }
        }
      >
        <Content>
          {svg ? (
            <SvgContainer
              dangerouslySetInnerHTML={{ __html: svg }}
              $svg={svg}
            />
          ) : (
            <Placeholder>
              <PlaceholderText>Click to create a drawing</PlaceholderText>
            </Placeholder>
          )}
        </Content>

        {/* Resize handles temporarily removed - will be added back later */}

        {children}
      </Container>

      <ExcalidrawModal
        isOpen={isModalOpen}
        excalidrawId={id}
        documentId={documentId}
        collaborationToken={collaborationToken}
        user={user}
        initialData={data}
        yDoc={yDoc}
        onSave={handleModalSave}
        onClose={handleModalClose}
      />
    </>
  );
};

const Container = styled.div<{
  $isSelected: boolean;
  $isEditable: boolean;
  $hasContent: boolean;
}>`
  position: relative;
  margin: 0.5em 0;
  border-radius: 8px;
  overflow: hidden;
  transition: all 150ms ease-in-out;
  cursor: ${(props) => (props.$isEditable ? "pointer" : "default")};
  padding: 0;
  display: ${(props) => (props.$hasContent ? "inline-block" : "block")};
  width: ${(props) => (props.$hasContent ? "fit-content" : "auto")};
  height: ${(props) => (props.$hasContent ? "fit-content" : "auto")};

  ${(props) =>
    props.$isSelected &&
    `
    outline: 2px solid ${props.theme.selected};
    outline-offset: 2px;
  `}

  ${(props) =>
    props.$isEditable &&
    `
    &:hover {
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    }
  `}
`;

const Content = styled.div`
  background: ${(props) => props.theme.background};
  border-radius: 8px;
  overflow: hidden;
  padding: 0;
  margin: 0;
  display: block;
  width: fit-content;
  height: fit-content;
`;

const SvgContainer = styled.div<{ $svg?: string }>`
  display: block;
  padding: 0;
  margin: 0;
  width: fit-content;
  height: fit-content;

  svg {
    display: block;
    margin: 0;
    padding: 0;
    width: auto;
    height: auto;

    /* Scale down large SVGs while maintaining aspect ratio */
    max-width: min(800px, 80vw);
    max-height: min(600px, 60vh);
  }
`;

const Placeholder = styled.div`
  width: 600px;
  height: 400px;
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px dashed ${(props) => props.theme.divider};
  background: ${(props) => props.theme.background};
  border-radius: 8px;
`;

const PlaceholderText = styled.span`
  color: ${(props) => props.theme.textSecondary};
  font-size: 16px;
  font-weight: 500;
`;

export default ExcalidrawComponent;