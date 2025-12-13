import { NodeSelection } from "prosemirror-state";
import { useCallback, useEffect, useRef, useState } from "react";
import styled from "styled-components";
import Flex from "@shared/components/Flex";
import Text from "@shared/components/Text";
import { EditorStyleHelper } from "@shared/editor/styles/EditorStyleHelper";
import { extraArea } from "@shared/styles";
import Input, { NativeInput, Outline } from "~/components/Input";
import { useEditor } from "./EditorContext";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
  const { view, commands } = useEditor();
  const { state } = view;
  const { selection } = state;

  // This component will be rendered only when the selection is image or video (NodeSelection types).
  const node = (selection as NodeSelection).node;
  const nodeType = node.type.name,
    width = node.attrs.width as number,
    height = node.attrs.height as number;

  const [localDimension, setLocalDimension] = useState<Dimension>(() => ({
    width: width ? String(width) : "",
    height: height ? String(height) : "",
    changed: "none",
  }));
  const [error, setError] = useState<{ width: boolean; height: boolean }>({
    width: false,
    height: false,
  });

  if (!boundsRef.current && ref.current) {
    const docWidth = parseInt(
      getComputedStyle(ref.current).getPropertyValue("--document-width")
    );
    const maxWidth = docWidth - EditorStyleHelper.padding * 2;
    const constrainedWidth = Math.min(width, maxWidth); // Ensure media width does not exceed the max width of the editor.
    const aspectRatio = height / constrainedWidth;

    const maxHeight = Math.round(maxWidth * aspectRatio);
    boundsRef.current = {
      width: { min: 50, max: maxWidth },
      height: { min: 50, max: maxHeight },
    };
  }

  const reset = useCallback(() => {
    setLocalDimension({
      width: width ? String(width) : "",
      height: height ? String(height) : "",
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

      setError((prev) => {
        if (!prev.width && !prev.height) {
          return prev;
        }
        return { width: false, height: false };
      });

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
    []
  );

  const handleBlur = useCallback(() => {
    const localWidthAsNumber = localDimension.width
        ? parseInt(localDimension.width, 10)
        : undefined,
      localHeightAsNumber = localDimension.height
        ? parseInt(localDimension.height, 10)
        : undefined;

    const isUnchanged =
      !localWidthAsNumber ||
      !localHeightAsNumber ||
      (localWidthAsNumber === width && localHeightAsNumber === height);

    const isError =
      error.width ||
      error.height ||
      (localDimension.changed === "width" &&
        localWidthAsNumber &&
        isOutsideBounds("width", localWidthAsNumber)); // check width bounds here since 'onChange' error checker is debounced.

    if (isUnchanged || isError) {
      reset();
      return;
    }

    const maxWidth = boundsRef.current!.width.max;
    // For images resized to the full width of the editor, natural width will be shown in the toolbar.
    // So, we constrain it here for computing aspect ratio.
    const constrainedWidth = Math.min(width, maxWidth);

    const aspectRatio =
      localDimension.changed === "width"
        ? height / constrainedWidth
        : constrainedWidth / height;

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
  }, [commands, width, height, localDimension, nodeType, error, reset]);

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

  // Sync dimension changes from outside.
  useEffect(() => {
    if (
      width !== Number(localDimension.width) ||
      height !== Number(localDimension.height)
    ) {
      reset();
    }
  }, [width, height, reset]);

  // hacky debounce for checking error.
  useEffect(() => {
    const timeout = setTimeout(() => {
      const isWidthError = localDimension.width
        ? Number(localDimension.width) !== width &&
          isOutsideBounds("width", Number(localDimension.width))
        : false;
      const isHeightError = localDimension.height
        ? Number(localDimension.height) !== height &&
          isOutsideBounds("height", Number(localDimension.height))
        : false;

      if (isWidthError || isHeightError) {
        setError({
          width: isWidthError,
          height: isHeightError,
        });
      }
    }, 200);

    return () => clearTimeout(timeout);
  }, [width, height, localDimension, isOutsideBounds]);

  return (
    <StyledFlex ref={ref} align="center">
      <StyledInput
        label={t("Image width")}
        labelHidden
        placeholder={t("Width")}
        value={localDimension.width}
        onChange={handleChange("width")}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        $error={error.width}
      />
      <Text size="xsmall" type="tertiary">
        ×
      </Text>
      <StyledInput
        label={t("Image height")}
        labelHidden
        placeholder={t("Height")}
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
