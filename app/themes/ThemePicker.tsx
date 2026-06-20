import * as React from "react";
import styled from "styled-components";
import { themeList } from "./core/registry";
import { ThemePreview } from "./ThemePreview";

type Mode = "default" | "advanced";

type Props = {
  /** The currently selected theme id (a team preference), or null for stock. */
  value: string | null | undefined;
  /** Called when the selection changes; null clears back to stock Outline. */
  onChange: (id: string | null) => void;
  /** The stock Outline appearance controls, shown in "Default" mode. */
  defaultSlot: React.ReactNode;
};

/**
 * Controlled theme section with two modes: "Default" renders the stock Outline
 * appearance controls (light/dark + accent colors) unchanged, while "Advanced"
 * shows a grid of selectable full-surface themes with live previews.
 *
 * The selection is a workspace (team) setting; the parent persists `value` and
 * receives changes via `onChange`. Switching to "Default" clears the selection,
 * restoring stock behavior exactly.
 *
 * @param value the currently selected theme id, or null/undefined for stock.
 * @param onChange invoked with the chosen theme id, or null to clear.
 * @param defaultSlot the stock appearance controls to render in Default mode.
 * @returns the theme picker element.
 */
export function ThemePicker({ value, onChange, defaultSlot }: Props) {
  const [mode, setMode] = React.useState<Mode>(value ? "advanced" : "default");

  const chooseDefault = () => {
    setMode("default");
    onChange(null);
  };

  return (
    <Wrapper>
      <Segmented role="tablist">
        <Tab
          type="button"
          role="tab"
          aria-selected={mode === "default"}
          $active={mode === "default"}
          onClick={chooseDefault}
        >
          Default
        </Tab>
        <Tab
          type="button"
          role="tab"
          aria-selected={mode === "advanced"}
          $active={mode === "advanced"}
          onClick={() => setMode("advanced")}
        >
          Advanced
        </Tab>
      </Segmented>

      {mode === "default" ? (
        <DefaultArea>{defaultSlot}</DefaultArea>
      ) : (
        <>
          <Hint>
            Choose a full-surface theme for the whole workspace. Press Save to
            apply it for everyone.
          </Hint>
          <Grid>
            {themeList.map((theme) => (
              <ThemePreview
                key={theme.id}
                theme={theme}
                selected={value === theme.id}
                onSelect={() => onChange(theme.id)}
              />
            ))}
          </Grid>
        </>
      )}
    </Wrapper>
  );
}

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
`;

const Segmented = styled.div`
  display: inline-flex;
  align-self: flex-start;
  padding: 2px;
  border-radius: 8px;
  background: ${(props) => props.theme.backgroundTertiary};
`;

const Tab = styled.button<{ $active: boolean }>`
  appearance: none;
  border: 0;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  padding: 5px 14px;
  border-radius: 6px;
  color: ${(props) =>
    props.$active ? props.theme.text : props.theme.textSecondary};
  background: ${(props) =>
    props.$active ? props.theme.background : "transparent"};
  box-shadow: ${(props) => (props.$active ? props.theme.menuShadow : "none")};
  transition: background 100ms ease;
`;

const Hint = styled.p`
  margin: 0;
  font-size: 13px;
  color: ${(props) => props.theme.textSecondary};
`;

const DefaultArea = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 10px;
`;
