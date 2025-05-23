import { NodeSelection } from "prosemirror-state";
import { useCallback, useEffect, useRef, useState } from "react";
import styled from "styled-components";
import Flex from "@shared/components/Flex";
import Text from "@shared/components/Text";
import { EditorStyleHelper } from "@shared/editor/styles/EditorStyleHelper";
import { extraArea } from "@shared/styles";
import Input, { NativeInput, Outline } from "~/components/Input";
import useBoolean from "~/hooks/useBoolean";
import { useEditor } from "./EditorContext";

const MinWidth = 50;

export function MediaDimension() {
  const ref = useRef<HTMLDivElement>(null);
  const maxWidthRef = useRef<number>();
  const { view, commands } = useEditor();
  const { state } = view;
  const { selection } = state;

  if (!maxWidthRef.current && ref.current) {
    const docWidth = parseInt(
      getComputedStyle(ref.current).getPropertyValue("--document-width")
    );
    maxWidthRef.current = docWidth - EditorStyleHelper.padding * 2;
  }

  // This component will be rendered only when the selection is image or video (NodeSelection types).
  const node = (selection as NodeSelection).node;
  const nodeType = node.type.name,
    width = node.attrs.width as number,
    height = node.attrs.height as number;

  const [localWidth, setLocalWidth] = useState<string>(String(width));
  const [errored, setErrored, resetErrored] = useBoolean();

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { value } = e.target;
      const isNumber = /^\d+$/.test(value);

      if (value && (!isNumber || value === "0")) {
        return;
      }

      const valueAsNumber = Number(value);

      if (valueAsNumber < MinWidth || valueAsNumber > maxWidthRef.current!) {
        setErrored();
      } else {
        resetErrored();
      }

      setLocalWidth(value);
    },
    [setErrored, resetErrored]
  );

  const handleBlur = useCallback(() => {
    if (!localWidth) {
      resetErrored();
      setLocalWidth(String(width)); // Reset to original width if empty
      return;
    }

    const localWidthValue = parseInt(localWidth, 10);
    if (localWidthValue === width) {
      resetErrored();
      return;
    }

    if (localWidthValue < MinWidth || localWidthValue > maxWidthRef.current!) {
      resetErrored();
      setLocalWidth(String(width)); // Reset to original width if out of bounds
      return;
    }

    const aspectRatio = height / width;

    if (nodeType === "image") {
      commands["resizeImage"]({
        width: localWidthValue,
        height: localWidthValue * aspectRatio,
      });
    }
  }, [commands, localWidth, width, height, nodeType, resetErrored]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        handleBlur();
      } else if (e.key === "Escape") {
        resetErrored();
        setLocalWidth(String(width)); // Reset to original width on escape
      }
    },
    [width, handleBlur, resetErrored]
  );

  useEffect(() => {
    if (width !== Number(localWidth)) {
      setLocalWidth(String(width)); // Sync drag resize updates
    }
  }, [width]);

  return (
    <StyledFlex ref={ref} align="center">
      <StyledInput
        value={localWidth}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        margin={0}
        $error={errored}
      />
      <Text size="xsmall" type="tertiary">
        x
      </Text>
      <StyledInput value={height} margin={0} readOnly />
    </StyledFlex>
  );
}

const StyledFlex = styled(Flex)`
  pointer-events: all;
  position: relative;

  ${extraArea(4)}
`;

const StyledInput = styled(Input)<{ $error?: boolean }>`
  width: 50px;
  z-index: 1;

  ${Outline} {
    background: transparent;
    border-color: transparent;
  }

  ${NativeInput} {
    height: 24px;
    padding: 0;
    text-align: center;

    ${(props) => props.$error && `color: ${props.theme.danger}`};
  }
`;
