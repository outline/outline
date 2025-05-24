import { NodeSelection } from "prosemirror-state";
import { useCallback, useEffect, useRef, useState } from "react";
import styled from "styled-components";
import Flex from "@shared/components/Flex";
import Text from "@shared/components/Text";
import { EditorStyleHelper } from "@shared/editor/styles/EditorStyleHelper";
import { extraArea } from "@shared/styles";
import Input, { NativeInput, Outline } from "~/components/Input";
import { useEditor } from "./EditorContext";

type Dimension = {
  width: string;
  height: string;
  changed: "width" | "height" | "none";
};

export function MediaDimension() {
  const ref = useRef<HTMLDivElement>(null);
  const boundsRef = useRef<{
    width: { min: number; max: number };
    height: { min: number; max: number };
  }>();
  const { view, commands } = useEditor();
  const { state } = view;
  const { selection } = state;

  // This component will be rendered only when the selection is image or video (NodeSelection types).
  const node = (selection as NodeSelection).node;
  const nodeType = node.type.name,
    width = node.attrs.width as number,
    height = node.attrs.height as number;

  const [localDimension, setLocalDimension] = useState<Dimension>(() => ({
    width: String(width),
    height: String(height),
    changed: "none",
  }));
  const [error, setError] = useState<{ width: boolean; height: boolean }>({
    width: false,
    height: false,
  });

  if (!boundsRef.current && ref.current) {
    const aspectRatio = height / width;
    const docWidth = parseInt(
      getComputedStyle(ref.current).getPropertyValue("--document-width")
    );
    const maxWidth = docWidth - EditorStyleHelper.padding * 2;
    const maxHeight = maxWidth * aspectRatio;
    boundsRef.current = {
      width: { min: 50, max: maxWidth },
      height: { min: 50, max: maxHeight },
    };
  }

  const reset = useCallback(() => {
    setLocalDimension({
      width: String(width),
      height: String(height),
      changed: "none",
    });
    setError({ width: false, height: false });
  }, [width, height]);

  const isOutsideBounds = useCallback(
    (type: "width" | "height", value: number) => {
      const bounds = boundsRef.current!;
      return value < bounds[type].min || value > bounds[type].max;
    },
    []
  );

  const handleChange = useCallback(
    (type: "width" | "height") => (e: React.ChangeEvent<HTMLInputElement>) => {
      const { value } = e.target;
      const isNumber = /^\d+$/.test(value);

      if (value && (!isNumber || value === "0")) {
        return;
      }

      const valueAsNumber = Number(value);

      if (isOutsideBounds(type, valueAsNumber)) {
        setError((prev) => ({
          ...prev,
          [type]: true,
        }));
      } else {
        setError({ width: false, height: false });
      }

      setLocalDimension((prev) => {
        if (type === "width") {
          return {
            ...prev,
            width: value,
            changed: "width",
          };
        }
        return {
          ...prev,
          height: value,
          changed: "height",
        };
      });
    },
    [isOutsideBounds]
  );

  const handleBlur = useCallback(() => {
    if (!localDimension.width || !localDimension.height) {
      reset();
      return;
    }

    const localWidthAsNumber = parseInt(localDimension.width, 10),
      localHeightAsNumber = parseInt(localDimension.height, 10);
    if (localWidthAsNumber === width && localHeightAsNumber === height) {
      reset();
      return;
    }

    if (
      isOutsideBounds("width", localWidthAsNumber) ||
      isOutsideBounds("height", localHeightAsNumber)
    ) {
      reset();
      return;
    }

    const aspectRatio =
      localDimension.changed === "width" ? height / width : width / height;

    const finalWidth =
      localDimension.changed === "width"
        ? localWidthAsNumber
        : Math.round(aspectRatio * localHeightAsNumber);
    const finalHeight =
      localDimension.changed === "height"
        ? localHeightAsNumber
        : Math.round(aspectRatio * localWidthAsNumber);

    if (nodeType === "image") {
      commands["resizeImage"]({
        width: finalWidth,
        height: finalHeight,
      });
    }
  }, [
    commands,
    width,
    height,
    localDimension,
    nodeType,
    isOutsideBounds,
    reset,
  ]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        handleBlur();
      } else if (e.key === "Escape") {
        reset();
      }
    },
    [handleBlur, reset]
  );

  useEffect(() => {
    if (
      width !== Number(localDimension.width) ||
      height !== Number(localDimension.height)
    ) {
      reset();
    }
  }, [width, height, reset]);

  return (
    <StyledFlex ref={ref} align="center">
      <StyledInput
        value={localDimension.width}
        onChange={handleChange("width")}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        $error={error.width}
      />
      <Text size="xsmall" type="tertiary">
        x
      </Text>
      <StyledInput
        value={localDimension.height}
        onChange={handleChange("height")}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        $error={error.height}
      />
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
    margin: 0;
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
