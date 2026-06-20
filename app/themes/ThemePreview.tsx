import { readableColor } from "polished";
import * as React from "react";
import styled from "styled-components";
import type { ThemeDefinition } from "./core/types";

type Props = {
  theme: ThemeDefinition;
  selected: boolean;
  onSelect: () => void;
};

/**
 * A small, live preview card for a theme — a miniature UI mock rendered from the
 * palette itself (no image assets), plus the theme name and light/dark badge.
 *
 * @param theme the theme definition to preview.
 * @param selected whether this theme is the active selection.
 * @param onSelect invoked when the card is chosen.
 * @returns the preview card element.
 */
export function ThemePreview({ theme, selected, onSelect }: Props) {
  const { colors: c } = theme;
  return (
    <Card
      type="button"
      onClick={onSelect}
      $selected={selected}
      $accent={c.accent}
      aria-pressed={selected}
      title={theme.name}
    >
      <Mock style={{ background: c.canvas, borderColor: c.border }}>
        <Side style={{ background: c.sidebar }}>
          <Dot style={{ background: c.textMuted }} />
          <Dot style={{ background: c.textMuted }} />
          <Dot style={{ background: c.accent }} />
        </Side>
        <Body>
          <Line style={{ background: c.text, width: "80%" }} />
          <Line style={{ background: c.textMuted, width: "60%" }} />
          <Line style={{ background: c.textMuted, width: "70%" }} />
          <Chip
            style={{ background: c.accent, color: readableColor(c.accent) }}
          >
            Aa
          </Chip>
        </Body>
      </Mock>
      <Label>
        <Name>{theme.name}</Name>
        <Badge>{theme.mode === "dark" ? "🌙" : "☀️"}</Badge>
      </Label>
    </Card>
  );
}

const Card = styled.button<{ $selected: boolean; $accent: string }>`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 6px;
  border-radius: 8px;
  cursor: pointer;
  background: ${(props) => props.theme.backgroundSecondary};
  border: 2px solid
    ${(props) => (props.$selected ? props.$accent : "transparent")};
  outline: ${(props) =>
    props.$selected ? "none" : `1px solid ${props.theme.divider}`};
  transition: border-color 100ms ease;

  &:hover {
    border-color: ${(props) => props.$accent};
  }
`;

const Mock = styled.div`
  display: flex;
  height: 72px;
  border-radius: 5px;
  border: 1px solid;
  overflow: hidden;
`;

const Side = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 26%;
  padding: 6px 5px;
`;

const Dot = styled.div`
  height: 4px;
  width: 80%;
  border-radius: 2px;
`;

const Body = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
  padding: 8px;
`;

const Line = styled.div`
  height: 4px;
  border-radius: 2px;
`;

const Chip = styled.div`
  margin-top: auto;
  align-self: flex-start;
  font-size: 9px;
  font-weight: 600;
  line-height: 1;
  padding: 3px 6px;
  border-radius: 4px;
`;

const Label = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  padding: 0 2px;
`;

const Name = styled.span`
  font-size: 12px;
  font-weight: 500;
  color: ${(props) => props.theme.text};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Badge = styled.span`
  font-size: 11px;
  line-height: 1;
`;
