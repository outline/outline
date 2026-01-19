import copy from "copy-to-clipboard";
import debounce from "lodash/debounce";
import { CheckmarkIcon, CopyIcon } from "outline-icons";
import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { HexColorPicker, HexColorInput } from "react-colorful";
import styled, { useTheme } from "styled-components";
import { s } from "@shared/styles";
import { darken } from "polished";

type Props = {
  onSelect: (color: string) => void;
  /** The currently active color */
  activeColor?: string | null;
};

function ColorPicker({ activeColor, onSelect }: Props) {
  const [color, setColor] = useState(activeColor || "");
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
      <StyledHexColorPicker color={color} onChange={handleColorChangePicker} />
      <InputRow>
        <StyledHexColorInput
          color={color}
          onChange={handleColorChangeInput}
          prefixed
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
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const StyledHexColorPicker = styled(HexColorPicker)`
  &.react-colorful {
    width: auto;
    height: 150px;

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
    }
  }
`;

const InputRow = styled.div`
  display: flex;
  gap: 4px;
`;

const StyledHexColorInput = styled(HexColorInput)`
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
