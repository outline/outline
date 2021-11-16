import * as React from "react";
// @ts-expect-error ts-migrate(7016) FIXME: Could not find a declaration file for module 'stri... Remove this comment to see the full error message
import replace from "string-replace-to-array";
import styled from "styled-components";

type Props = {
  highlight: (string | null | undefined) | RegExp;
  processResult?: (tag: string) => string;
  text: string;
  caseSensitive?: boolean;
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
        ? // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'tag' implicitly has an 'any' type.
          replace(text, regex, (tag) => (
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
