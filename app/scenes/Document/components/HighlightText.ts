import styled from "styled-components";
import { s, truncateMultiline } from "@shared/styles";
import Text from "~/components/Text";

/**
 * Highlighted text associated with a comment.
 */
export const HighlightedText = styled(Text)`
  position: relative;
  color: ${s("textSecondary")};
  font-size: 14px;
  padding: 0 8px;
  margin: 4px 0;
  display: inline-block;

  ${truncateMultiline(3)}

  &:after {
    content: "";
    width: 2px;
    position: absolute;
    left: 0;
    top: 2px;
    bottom: 2px;
    background: ${s("commentMarkBackground")};
    border-radius: 2px;
  }
`;
