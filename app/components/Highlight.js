// @flow
import * as React from "react";
import replace from "string-replace-to-array";
import styled from "styled-components";

type Props = {
  highlight: ?string | RegExp,
  processResult?: (tag: string) => string,
  text: string,
  caseSensitive?: boolean,
};

function Highlight({
  highlight,
  processResult,
  caseSensitive,
  text,
  ...rest
}: Props) {
  let regex;
  let index = 0;
  if (highlight instanceof RegExp) {
    regex = highlight;
  } else {
    regex = new RegExp(
      (highlight || "").replace(/[-\\^$*+?.()|[\]{}]/g, "\\$&"),
      caseSensitive ? "g" : "gi"
    );
  }
  return (
    <span {...rest}>
      {highlight
        ? replace(text, regex, (tag) => (
            <Mark key={index++}>
              {processResult ? processResult(tag) : tag}
            </Mark>
          ))
        : text}
    </span>
  );
}

const Mark = styled.mark`
  background: ${(props) => props.theme.searchHighlight};
  border-radius: 2px;
  padding: 0 4px;
`;

export default Highlight;
