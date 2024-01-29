import * as React from "react";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { s } from "../../styles";

type Props = {
  /** Callback triggered when the caption is blurred */
  onBlur: (event: React.FocusEvent<HTMLParagraphElement>) => void;
  /** Callback triggered when keyboard is used within the caption */
  onKeyDown: (event: React.KeyboardEvent<HTMLParagraphElement>) => void;
  /** Whether the parent node is selected */
  isSelected: boolean;
  /** Placeholder text to display when the caption is empty */
  placeholder: string;
  /** Additional CSS styles to apply to the caption */
  style?: React.CSSProperties;
  children: React.ReactNode;
};

/**
 * A component that renders a caption for an image or video.
 */
function Caption({ placeholder, children, isSelected, ...rest }: Props) {
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
      $isSelected={isSelected}
      onMouseDown={handleMouseDown}
      onPaste={handlePaste}
      className="caption"
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

const Content = styled.p<{ $isSelected: boolean }>`
  border: 0;
  display: block;
  font-style: italic;
  font-weight: normal;
  color: ${s("textSecondary")};
  padding: 8px 0 4px;
  line-height: 16px;
  text-align: center;
  min-height: 1em;
  outline: none;
  background: none;
  resize: none;
  user-select: text;
  margin: 0 !important;
  cursor: text;

  ${breakpoint("tablet")`
    font-size: 13px;
  `};

  &:empty:not(:focus) {
    display: ${(props) => (props.$isSelected ? "block" : "none")}};
  }

  &:empty:before {
    color: ${s("placeholder")};
    content: attr(data-caption);
    pointer-events: none;
  }
`;

export default Caption;
