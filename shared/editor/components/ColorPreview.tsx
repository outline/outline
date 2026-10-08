import copy from "copy-to-clipboard";
import { darken } from "polished";
import type { MouseEvent } from "react";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { s } from "../../styles";
import { toColorFormats } from "../../utils/color";
import type { EditorNotice } from "../types";

interface Props {
  /** The CSS color to preview, in its original notation. */
  color: string;
  /** Callback used to surface a notice to the user. */
  onNotice?: EditorNotice;
}

/**
 * The contents of the color hover card – a large preview of the color above the
 * equivalent hex, rgb, and hsl notations. Clicking a notation copies it.
 */
export function ColorPreview({ color, onNotice }: Props) {
  const { t } = useTranslation();

  const preview = useMemo(() => {
    try {
      return {
        formats: toColorFormats(color),
        // A darker shade of the color itself keeps the edge from reading as a
        // separate element, whatever the color.
        borderColor: darken(0.1, color),
      };
    } catch {
      return undefined;
    }
  }, [color]);

  const handleClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      copy(event.currentTarget.value);
      onNotice?.(t("Copied to clipboard"));
    },
    [onNotice, t]
  );

  if (!preview) {
    return null;
  }

  const { formats, borderColor } = preview;

  return (
    <>
      <Preview style={{ borderColor }}>
        <PreviewColor style={{ backgroundColor: color }} />
      </Preview>
      <Formats>
        {(["hex", "rgb", "hsl"] as const).map((format) => (
          <Format
            key={format}
            type="button"
            value={formats[format]}
            title={t("Click to copy")}
            onMouseDown={(event) => event.preventDefault()}
            onClick={handleClick}
          >
            <Label>{format.toUpperCase()}</Label>
            <Value>{formats[format]}</Value>
          </Format>
        ))}
      </Formats>
    </>
  );
}

const Preview = styled.div`
  height: 64px;
  overflow: hidden;
  border-radius: 6px;
  border: 1px solid transparent;

  /* Checkerboard so that translucent colors read as translucent. */
  background-color: ${s("background")};
  background-image:
    linear-gradient(45deg, ${s("inputBorder")} 25%, transparent 25%),
    linear-gradient(-45deg, ${s("inputBorder")} 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, ${s("inputBorder")} 75%),
    linear-gradient(-45deg, transparent 75%, ${s("inputBorder")} 75%);
  background-size: 12px 12px;
  background-position:
    0 0,
    0 6px,
    6px -6px,
    -6px 0px;
`;

const PreviewColor = styled.div`
  width: 100%;
  height: 100%;
`;

const Formats = styled.div`
  display: flex;
  flex-direction: column;

  /* The negative bottom margin keeps 8px below the last row of text. */
  margin: 4px 0 -4px;
`;

const Label = styled.span`
  flex-shrink: 0;
  width: 32px;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.04em;
  color: ${s("textTertiary")};
  transition: color 100ms ease;
`;

const Value = styled.span`
  font-family: ${s("fontFamilyMono")};
  font-size: 12px;
  color: ${s("textSecondary")};
  white-space: nowrap;
  user-select: all;
  transition: color 100ms ease;
`;

const Format = styled.button`
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 4px 0;
  border: 0;
  background: none;
  font: inherit;
  text-align: left;
  cursor: var(--pointer);

  &:hover {
    ${Label} {
      color: ${s("textSecondary")};
    }

    ${Value} {
      color: ${s("text")};
    }
  }
`;
