import copy from "copy-to-clipboard";
import debounce from "lodash/debounce";
import { CheckmarkIcon, CopyIcon } from "outline-icons";
import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import {
  HexColorInput,
  HexAlphaColorPicker,
  HexColorPicker,
} from "react-colorful";
import styled, { css, useTheme } from "styled-components";
import { s } from "../styles";
import { darken } from "polished";

type Props = {
  onSelect: (color: string) => void;
  /** The currently active color */
  activeColor?: string | null;
  alpha: boolean;
};

const DEFAULT_COLOR = "#7e3d3db3";

function ColorPicker({ activeColor, onSelect, alpha }: Props) {
  const [color, setColor] = useState(activeColor || DEFAULT_COLOR);
  const [copied, setCopied] = useState(false);
  const theme = useTheme();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const applyColor = useCallback(
    (newColor: string) => {
      const activeElement = document.activeElement as HTMLElement | null;
      const hadFocusInside = wrapperRef.current?.contains(activeElement);

      onSelect(newColor);

      if (hadFocusInside && activeElement) {
        activeElement.focus();
      }
    },
    [onSelect]
  );

  const debouncedApplyColor = useMemo(
    () => debounce(applyColor, 250),
    [applyColor]
  );

  useEffect(
    () => () => {
      debouncedApplyColor.cancel();
    },
    [debouncedApplyColor]
  );

  const handleColorChangePicker = (newColor: string) => {
    setColor(newColor);
    debouncedApplyColor(newColor);
  };

  const handleColorChangeInput = (newColor: string) => {
    setColor(newColor);
    applyColor(newColor);
  };

  const handleCopy = useCallback(() => {
    copy(color);
    buttonRef.current?.focus();
    setCopied(true);
    setTimeout(() => setCopied(false), 500);
  }, [color]);

  return (
    <Wrapper ref={wrapperRef} tabIndex={-1}>
      {alpha ? (
        <StyledHexAlphaColorPicker
          color={color}
          onChange={handleColorChangePicker}
        />
      ) : (
        <StyledHexNonAlphaColorPicker
          color={color}
          onChange={handleColorChangePicker}
        />
      )}

      <InputRow>
        <StyledHexColorInput
          color={color}
          onChange={handleColorChangeInput}
          prefixed
          alpha={alpha}
        />
        <CopyButton ref={buttonRef} onClick={handleCopy} type="button">
          {copied ? (
            <CheckmarkIcon size={16} color={darken(0.2, theme.brand.green)} />
          ) : (
            <CopyIcon size={16} />
          )}
        </CopyButton>
      </InputRow>
    </Wrapper>
  );
}

const Wrapper = styled.div`
  padding: 4px;
  display: flex;
  flex-direction: column;
`;

const colorPickerStyles = css`
  &.react-colorful {
    width: auto;

    & > .react-colorful__saturation {
      border-radius: 4px 4px 0 0;
    }

    & .react-colorful__pointer {
      width: 14px;
      height: 14px;
    }

    & .react-colorful__interactive:focus .react-colorful__pointer {
      transform: translate(-50%, -50%) scale(1.25);
    }

    & > .react-colorful__hue {
      height: 8px;
      border-radius: 0 0 4px 4px;
      margin-bottom: 8px;
    }
  }
`;

const StyledHexNonAlphaColorPicker = styled(HexColorPicker)`
  ${colorPickerStyles}
`;

const StyledHexAlphaColorPicker = styled(HexAlphaColorPicker)`
  ${colorPickerStyles}

  &.react-colorful > .react-colorful__alpha {
    height: 8px;
    border-radius: 4px;
    margin-top: 8px;
    margin-bottom: 8px;
  }
`;

const InputRow = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 4px;
  margin-top: 8px;
`;

const StyledHexColorInput = styled(HexColorInput)`
  flex: 1;
  padding: 4px 6px;
  border: 1px solid ${s("inputBorder")};
  border-radius: 4px;
  font-size: 12px;
  background: ${s("background")};
  color: ${s("text")};

  &:focus {
    outline: none;
    border-color: ${s("accent")};
  }
`;

const CopyButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border: 1px solid ${s("inputBorder")};
  border-radius: 4px;
  background: ${s("background")};
  color: ${s("textSecondary")};
  cursor: pointer;

  &:hover {
    background: ${s("backgroundSecondary")};
    color: ${s("text")};
  }
`;

export default ColorPicker;
