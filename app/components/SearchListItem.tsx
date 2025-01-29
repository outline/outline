import {
  useFocusEffect,
  useRovingTabIndex,
} from "@getoutline/react-roving-tabindex";
import { observer } from "mobx-react";
import * as React from "react";
import { Link } from "react-router-dom";
import styled, { css } from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { s, hover, ellipsis } from "@shared/styles";
import Document from "~/models/Document";
import Highlight, { Mark } from "~/components/Highlight";
import { sharedDocumentPath } from "~/utils/routeHelpers";

type Props = {
  document: Document;
  highlight: string;
  context: string | undefined;
  showParentDocuments?: boolean;
  showCollection?: boolean;
  showPublished?: boolean;
  shareId?: string;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
};
const SEARCH_RESULT_REGEX = /<b\b[^>]*>(.*?)<\/b>/gi;

function replaceResultMarks(tag: string) {
  // don't use SEARCH_RESULT_REGEX here as it causes
  // an infinite loop to trigger a regex inside it's own callback
  return tag.replace(/<b\b[^>]*>(.*?)<\/b>/gi, "$1");
}

function DocumentListItem(
  props: Props,
  ref: React.RefObject<HTMLAnchorElement>
) {
  const { document, highlight, context, shareId, ...rest } = props;

  let itemRef: React.Ref<HTMLAnchorElement> =
    React.useRef<HTMLAnchorElement>(null);
  if (ref) {
    itemRef = ref;
  }

  const { focused, ...rovingTabIndex } = useRovingTabIndex(itemRef, false);
  useFocusEffect(focused, itemRef);

  return (
    <DocumentLink
      ref={itemRef}
      dir={document.dir}
      to={{
        pathname: shareId
          ? sharedDocumentPath(shareId, document.url)
          : document.url,
        state: {
          title: document.titleWithDefault,
        },
      }}
      {...rest}
      {...rovingTabIndex}
      onClick={(ev) => {
        if (rest.onClick) {
          rest.onClick(ev);
        }
        rovingTabIndex.onClick(ev);
      }}
    >
      <Content>
        <Heading dir={document.dir}>
          <Title
            text={document.titleWithDefault}
            highlight={highlight}
            dir={document.dir}
          />
        </Heading>

        {
          <ResultContext
            text={context}
            highlight={highlight ? SEARCH_RESULT_REGEX : undefined}
            processResult={replaceResultMarks}
          />
        }
      </Content>
    </DocumentLink>
  );
}

const Content = styled.div`
  flex-grow: 1;
  flex-shrink: 1;
  min-width: 0;
`;

const DocumentLink = styled(Link)<{
  $isStarred?: boolean;
  $menuOpen?: boolean;
}>`
  display: flex;
  align-items: center;
  padding: 6px 12px;
  max-height: 50vh;
  cursor: var(--pointer);

  &:not(:last-child) {
    margin-bottom: 4px;
  }

  &:focus-visible {
    outline: none;
  }

  ${breakpoint("tablet")`
    width: auto;
  `};

  &:${hover},
  &:active,
  &:focus,
  &:focus-within {
    background: ${s("listItemHoverBackground")};
  }

  ${(props) =>
    props.$menuOpen &&
    css`
      background: ${s("listItemHoverBackground")};
    `}
`;

const Heading = styled.h4<{ rtl?: boolean }>`
  display: flex;
  justify-content: ${(props) => (props.rtl ? "flex-end" : "flex-start")};
  align-items: center;
  height: 22px;
  margin-top: 0;
  margin-bottom: 0.25em;
  overflow: hidden;
  white-space: nowrap;
  color: ${s("text")};
`;

const Title = styled(Highlight)`
  max-width: 90%;
  ${ellipsis()}

  ${Mark} {
    padding: 0;
  }
`;

const ResultContext = styled(Highlight)`
  display: block;
  color: ${s("textTertiary")};
  font-size: 14px;
  margin-top: -0.25em;
  margin-bottom: 0;
  ${ellipsis()}

  ${Mark} {
    padding: 0;
  }
`;

export default observer(React.forwardRef(DocumentListItem));
