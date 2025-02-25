import * as React from "react";
import styled from "styled-components";
import { s } from "../../styles";
import { EditorStyleHelper } from "../styles/EditorStyleHelper";

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
function Caption({ placeholder, children, isSelected, width, ...rest }: Props) {
  const handlePaste = (event: React.ClipboardEvent<HTMLParagraphElement>) => {
    event.preventDefault();
    const text = event.clipboardData.getData("text/plain");
    window.document.execCommand("insertText", false, text);
  };

  const handleMouseDown = (ev: React.MouseEvent<HTMLParagraphElement>) => {
    // always prevent clicks in caption from bubbling to the editor
    ev.stopPropagation();
  };

  return (
    <Content
      $width={width}
      $isSelected={isSelected}
      onMouseDown={handleMouseDown}
      onPaste={handlePaste}
      className={EditorStyleHelper.imageCaption}
      tabIndex={-1}
      role="textbox"
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
    display: ${(props) => (props.$isSelected ? "block" : "none")}};
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
