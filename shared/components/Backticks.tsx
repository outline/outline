import * as React from "react";
import styled from "styled-components";
import { s } from "../styles";

const BacktickSpan = styled.span`
  font-family: ${s("fontFamilyMono")};
  background: ${s("codeBackground")};
  border-radius: 3px;
  padding: 2px 4px;
  font-size: 90%;
`;

interface Props {
  /** The content to be rendered that may contain backticks. */
  content: string;
}

/**
 * Component to render backticked content with styling.
 * @param props - Props object containing the content to be rendered.
 * @returns JSX.Element - The rendered component.
 */
export const Backticks: React.FC<Props> = ({ content }) => {
  // Regex to match text between backticks
  const regex = /`([^`]+)`/g;
  const parts = content.split(regex);

  return (
    <>
      {parts.map((part, i) => {
        // Even indices are normal text, odd indices are backticked content
        if (i % 2 === 0) {
          return part;
        }
        return <BacktickSpan key={i}>{part}</BacktickSpan>;
      })}
    </>
  );
};
