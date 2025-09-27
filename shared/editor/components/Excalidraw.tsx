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
  children?: React.ReactNode;
};

const ExcalidrawComponent: React.FC<Props> = ({
  node,
  isSelected,
  isEditable,
  _onEdit,
  onUpdateData,
  _onChangeSize,
  yDoc,
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

  // Simplified resize handling - removed complex useDragResize for now

  const displayWidth = width || 600;
  const displayHeight = height || 400;

  return (
    <>
      <Container
        onClick={handleClick}
        $isSelected={isSelected}
        $isEditable={isEditable}
        style={{
          width: displayWidth,
          height: displayHeight,
        }}
      >
        <Content>
          {svg ? (
            <SvgContainer
              dangerouslySetInnerHTML={{ __html: svg }}
              style={{
                width: displayWidth,
                height: displayHeight,
              }}
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
}>`
  position: relative;
  margin: 0.5em 0;
  border-radius: 8px;
  overflow: hidden;
  transition: all 150ms ease-in-out;
  cursor: ${(props) => (props.$isEditable ? "pointer" : "default")};

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
  width: 100%;
  height: 100%;
  background: ${(props) => props.theme.background};
  border: 1px solid ${(props) => props.theme.divider};
  border-radius: 8px;
  overflow: hidden;
`;

const SvgContainer = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    max-width: 100%;
    max-height: 100%;
  }
`;

const Placeholder = styled.div`
  width: 100%;
  height: 100%;
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px dashed ${(props) => props.theme.divider};
  background: ${(props) => props.theme.background};
`;

const PlaceholderText = styled.span`
  color: ${(props) => props.theme.textSecondary};
  font-size: 16px;
  font-weight: 500;
`;

export default ExcalidrawComponent;