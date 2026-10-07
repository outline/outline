import * as React from "react";
import styled from "styled-components";
import { s } from "../../styles";
import { getDataTransferFiles } from "../../utils/files";
import { EditorStyleHelper } from "../styles/EditorStyleHelper";
import { useTranslation } from "react-i18next";

type Props = {
  /** Callback triggered when the caption is blurred */
  onBlur: (event: React.FocusEvent<HTMLParagraphElement>) => void;
  /** Callback triggered when keyboard is used within the caption */
  onKeyDown: (event: React.KeyboardEvent<HTMLParagraphElement>) => void;
  /** Whether the parent node is selected */
  isSelected: boolean;
  /** Placeholder text to display when the caption is empty */
  placeholder: string;
  /** Width of the caption */
  width: number;
  /** Additional CSS styles to apply to the caption */
  style?: React.CSSProperties;
  children: React.ReactNode;
};

/**
 * A component that renders a caption for an image or video.
 */
function Caption({
  placeholder,
  children,
  isSelected,
  width,
  onKeyDown,
  ...rest
}: Props) {
  const { t } = useTranslation();
  const ref = React.useRef<HTMLParagraphElement>(null);

  // The caption is not part of the document, so drags within it must not reach
  // the editor, which would act on the document selection instead. Native
  // listeners are used because they run before the editor's, React's do not.
  React.useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }

    const handleDrag = (event: DragEvent) => {
      // File drops are left alone so that they still upload.
      if (getDataTransferFiles(event).length) {
        return;
      }
      event.stopPropagation();
    };

    element.addEventListener("dragstart", handleDrag);
    element.addEventListener("drop", handleDrag);

    return () => {
      element.removeEventListener("dragstart", handleDrag);
      element.removeEventListener("drop", handleDrag);
    };
  }, []);

  const handlePaste = (event: React.ClipboardEvent<HTMLParagraphElement>) => {
    event.preventDefault();
    const text = event.clipboardData.getData("text/plain");
    window.document.execCommand("insertText", false, text);
  };

  const handleMouseDown = (ev: React.MouseEvent<HTMLParagraphElement>) => {
    // always prevent clicks in caption from bubbling to the editor
    ev.stopPropagation();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLParagraphElement>) => {
    // Cmd/Ctrl-A should select the caption text, not the whole document.
    if ((event.metaKey || event.ctrlKey) && event.key === "a") {
      event.preventDefault();
      event.stopPropagation();
      const selection = window.getSelection();
      const range = window.document.createRange();
      range.selectNodeContents(event.currentTarget);
      selection?.removeAllRanges();
      selection?.addRange(range);
      return;
    }
    onKeyDown(event);
  };

  return (
    <Content
      ref={ref}
      $width={width}
      $isSelected={isSelected}
      onMouseDown={handleMouseDown}
      onPaste={handlePaste}
      onKeyDown={handleKeyDown}
      className={EditorStyleHelper.imageCaption}
      tabIndex={-1}
      aria-label={t("Caption")}
      role="textbox"
      draggable={false}
      contentEditable
      suppressContentEditableWarning
      data-caption={placeholder}
      {...rest}
    >
      {children}
    </Content>
  );
}

const Content = styled.p<{ $width: number; $isSelected: boolean }>`
  cursor: text;
  width: ${(props) => props.$width}px;
  min-width: 200px;
  max-width: 100%;

  &:empty:not(:focus) {
    display: ${(props) => (props.$isSelected ? "block" : "none")};
  }

  &:empty::before {
    color: ${s("placeholder")};
    content: attr(data-caption);
    pointer-events: none;

    @media print {
      display: none;
    }
  }
`;

export default Caption;
