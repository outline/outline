import type { NodeSelection } from "prosemirror-state";
import * as Toolbar from "@radix-ui/react-toolbar";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import Flex from "@shared/components/Flex";
import Text from "@shared/components/Text";
import { embedDefaultHeight } from "@shared/editor/components/Embed";
import { contentWidth } from "@shared/editor/lib/contentWidth";
import {
  pdfNaturalHeight,
  pdfNaturalWidth,
  resolvePDFDimensions,
} from "@shared/editor/lib/pdf";
import { extraArea } from "@shared/styles";
import Input, { NativeInput, Outline } from "~/components/Input";
import { useEditor } from "./EditorContext";
import { AspectRatioLockButton } from "./AspectRatioLockButton";
import Tooltip from "./Tooltip";
import { useTranslation } from "react-i18next";

type Dimension = {
  width: string;
  height: string;
  changed: "width" | "height" | "none";
};

interface Props {
  /** Tooltip shown when the dimension inputs are hovered. */
  tooltip?: string;
}

/**
 * Toolbar inputs to change the width and height of the selected media node.
 *
 * @param props - the component props.
 * @returns the dimension inputs.
 */
export function MediaDimension({ tooltip }: Props) {
  const isDraggingRef = useRef(false);
  const { t } = useTranslation();
  const { view, commands } = useEditor();
  const { state } = view;
  const { selection } = state;

  // This component will be rendered for specific media nodes like image, video or pdfs (NodeSelection types).
  const node = (selection as NodeSelection).node;
  const nodeType = node.type.name;
  const nodeWidth = node.attrs.width as number | null | undefined;
  const nodeHeight = node.attrs.height as number | null | undefined;
  const [maxWidth] = useState(() => contentWidth(view.dom));

  // Embeds without a stored size fill the editor width at their default height.
  const { width, height } =
    nodeType === "attachment"
      ? resolvePDFDimensions(nodeWidth, nodeHeight)
      : nodeType === "embed"
        ? {
            width: nodeWidth || maxWidth,
            height: nodeHeight ?? embedDefaultHeight,
          }
        : { width: nodeWidth ?? 0, height: nodeHeight ?? 0 };

  // Only PDFs and embeds can be unlocked, images and videos keep their natural aspect ratio.
  const canUnlock = nodeType === "attachment" || nodeType === "embed";
  const isLocked = !canUnlock || node.attrs.lockAspectRatio !== false;

  // Full-width images store their natural width, so the editor width gives their
  // aspect ratio. PDFs and embeds always store dimensions with a matching ratio.
  const ratioWidth = canUnlock ? width : Math.min(width, maxWidth);

  const [localDimension, setLocalDimension] = useState<Dimension>(() => ({
    width: width ? String(width) : "",
    height: height ? String(height) : "",
    changed: "none",
  }));
  const [error, setError] = useState<{ width: boolean; height: boolean }>({
    width: false,
    height: false,
  });

  const bounds = useMemo(() => {
    // Unlocked height does not change the width, so limit it to a full-width page.
    const aspectRatio = isLocked
      ? height / ratioWidth
      : pdfNaturalHeight / pdfNaturalWidth;

    return {
      width: { min: 50, max: maxWidth },
      height: { min: 50, max: Math.round(maxWidth * aspectRatio) },
    };
  }, [height, ratioWidth, maxWidth, isLocked]);

  const reset = useCallback(() => {
    setLocalDimension({
      width: width ? String(width) : "",
      height: height ? String(height) : "",
      changed: "none",
    });
    setError({ width: false, height: false });
  }, [width, height]);

  const isOutsideBounds = useCallback(
    (type: "width" | "height", value: number) =>
      value < bounds[type].min || value > bounds[type].max,
    [bounds]
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

    // Check bounds here since the 'onChange' error checker is debounced.
    const isError =
      error.width ||
      error.height ||
      (localDimension.changed === "width" &&
        localWidthAsNumber &&
        isOutsideBounds("width", localWidthAsNumber)) ||
      (localDimension.changed === "height" &&
        localHeightAsNumber &&
        isOutsideBounds("height", localHeightAsNumber));

    if (isUnchanged || isError) {
      reset();
      return;
    }

    const aspectRatio =
      localDimension.changed === "width"
        ? height / ratioWidth
        : ratioWidth / height;

    const isIndependent = canUnlock && !isLocked;
    const finalWidth =
      isIndependent || localDimension.changed === "width"
        ? localWidthAsNumber
        : Math.round(aspectRatio * localHeightAsNumber);
    const finalHeight =
      isIndependent || localDimension.changed === "height"
        ? localHeightAsNumber
        : Math.round(aspectRatio * localWidthAsNumber);

    if (nodeType === "image") {
      commands["resizeImage"]({
        width: finalWidth,
        height: finalHeight,
      });
    } else if (nodeType === "attachment") {
      commands["resizeAttachment"]({
        width: finalWidth,
        height: finalHeight,
      });
    } else if (nodeType === "video") {
      commands["resizeVideo"]({
        width: finalWidth,
        height: finalHeight,
      });
    } else if (nodeType === "embed") {
      commands["resizeEmbed"]({
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
    error,
    reset,
    isOutsideBounds,
    ratioWidth,
    canUnlock,
    isLocked,
  ]);

  const handleToggleLock = useCallback(() => {
    commands[
      nodeType === "embed"
        ? "toggleEmbedAspectRatioLock"
        : "toggleAttachmentAspectRatioLock"
    ]();
    setError({ width: false, height: false });
  }, [commands, nodeType]);

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

  // Sync dimension changes from outside, without clobbering in-progress edits
  // to the inputs (which also change `localDimension`).
  const prevSizeRef = useRef({ width, height });
  useEffect(() => {
    const prev = prevSizeRef.current;
    prevSizeRef.current = { width, height };

    if (isDraggingRef.current) {
      return;
    }
    if (prev.width !== width || prev.height !== height) {
      reset();
    }
  }, [width, height, reset]);

  // Listen to drag resize updates in real-time.
  useEffect(() => {
    const handleDragResize = (event: Event) => {
      const customEvent = event as CustomEvent<{
        width: number;
        height?: number;
        isDragging?: boolean;
      }>;
      const {
        width: newWidth,
        height: newHeight,
        isDragging,
      } = customEvent.detail;

      if (isDragging !== undefined) {
        isDraggingRef.current = isDragging;
      }

      const dimensions =
        nodeType === "attachment"
          ? resolvePDFDimensions(newWidth, newHeight)
          : { width: newWidth, height: newHeight };

      setLocalDimension({
        width: dimensions.width ? String(dimensions.width) : "",
        height: dimensions.height ? String(dimensions.height) : "",
        changed: "none",
      });
    };

    window.addEventListener("media-drag-resize", handleDragResize);
    return () => {
      window.removeEventListener("media-drag-resize", handleDragResize);
    };
  }, [nodeType]);

  // Debounce validation so errors are not shown while typing.
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
    <StyledFlex align="center">
      <Tooltip content={tooltip}>
        <Flex align="center">
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
        </Flex>
      </Tooltip>
      {canUnlock && (
        <Tooltip content={t("Lock aspect ratio")}>
          <Toolbar.Button asChild>
            <AspectRatioLockButton
              isLocked={isLocked}
              onClick={handleToggleLock}
            />
          </Toolbar.Button>
        </Tooltip>
      )}
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
    height: 22px;
    padding: 0;
    text-align: center;

    ${(props) => props.$error && `color: ${props.theme.danger}`};
  }
`;
