import { observer } from "mobx-react";
import * as React from "react";
import styled from "styled-components";
import { useTranslation } from "react-i18next";
import { PaletteIcon } from "outline-icons";
import type { MenuItem } from "@shared/editor/types";
import type { Dictionary } from "~/hooks/useDictionary";
import { useEditor } from "~/editor/components/EditorContext";

const COLORS = [
  "#ffffff", // white
  "#f8f9fa", // light gray
  "#e9ecef", // light gray 2
  "#dee2e6", // light gray 3
  "#343a40", // dark gray
  "#6c757d", // gray
  "#dc3545", // red
  "#fd7e14", // orange
  "#ffc107", // yellow
  "#28a745", // green
  "#20c997", // teal
  "#17a2b8", // cyan
  "#007bff", // blue
  "#6f42c1", // purple
  "#e83e8c", // pink
];

const ColorGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 4px;
  padding: 8px;
  min-width: 120px;
`;

const ColorSwatch = styled.button<{ color: string; selected?: boolean }>`
  width: 20px;
  height: 20px;
  border-radius: 4px;
  border: 2px solid
    ${({ selected, theme }) => (selected ? theme.accent : "transparent")};
  background-color: ${({ color }) => color};
  cursor: pointer;
  transition: border-color 0.15s ease;

  &:hover {
    border-color: ${({ theme }) => theme.accent};
  }

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.accent};
  }
`;

const ColorPickerContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const ColorPickerHeader = styled.div`
  font-size: 12px;
  font-weight: 500;
  color: ${({ theme }) => theme.textSecondary};
  text-align: center;
`;

const ClearColorButton = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.textSecondary};
  font-size: 12px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  text-decoration: underline;

  &:hover {
    background: ${({ theme }) => theme.backgroundSecondary};
  }
`;

const TableCellColorPicker = observer(() => {
  const { t } = useTranslation();
  const editor = useEditor();

  const handleColorSelect = React.useCallback(
    (color: string | null) => {
      editor?.commands.setCellBackgroundColor({ color });
    },
    [editor]
  );

  return (
    <ColorPickerContainer>
      <ColorPickerHeader>{t("Cell Background")}</ColorPickerHeader>
      <ColorGrid>
        {COLORS.map((color) => (
          <ColorSwatch
            key={color}
            color={color}
            onClick={() => handleColorSelect(color)}
            title={color}
          />
        ))}
      </ColorGrid>
      <ClearColorButton onClick={() => handleColorSelect(null)}>
        {t("Clear color")}
      </ClearColorButton>
    </ColorPickerContainer>
  );
});

export default TableCellColorPicker;
