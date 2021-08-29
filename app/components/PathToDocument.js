// @flow
import { observer } from "mobx-react";
import { GoToIcon } from "outline-icons";
import * as React from "react";
import styled from "styled-components";
import type { DocumentPath } from "stores/CollectionsStore";
import Collection from "models/Collection";
import Document from "models/Document";
import CollectionIcon from "components/CollectionIcon";
import Flex from "components/Flex";

type Props = {
  result: DocumentPath,
  document?: ?Document,
  collection: ?Collection,
  selected?: boolean,
  setSelectedPath?: (DocumentPath) => void,
  style?: Object,
  ref?: (?React.ElementRef<"div">) => void,
};

const PathToDocument = ({
  result,
  collection,
  document,
  ref,
  style,
  selected,
  setSelectedPath,
}: Props) => {
  if (!result) return <div />;

  return (
    <ResultWrapper
      ref={ref}
      onClick={() => {
        setSelectedPath && setSelectedPath(result);
      }}
      style={style}
      role="option"
      selectable
      selected={selected}
    >
      <Flex>
        {collection && (
          <CollectionIcon collection={collection} useLuminance={selected} />
        )}
        &nbsp;
        {result.path
          .map((doc) => <Title key={doc.id}>{doc.title}</Title>)
          .reduce((prev, curr) => [prev, <StyledGoToIcon />, curr])}
        {document && (
          <DocumentTitle>
            {" "}
            <StyledGoToIcon /> <Title>{document.title}</Title>
          </DocumentTitle>
        )}
      </Flex>
    </ResultWrapper>
  );
};

const DocumentTitle = styled(Flex)``;

const Title = styled.span`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const StyledGoToIcon = styled(GoToIcon)`
  fill: ${(props) => props.theme.divider};
`;

const ResultWrapper = styled.div`
  padding: 8px 4px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  user-select: none;
  background: ${(props) => (props.selected ? props.theme.selected : "")};
  color: ${(props) => (props.selected ? "white" : props.theme.text)};
  cursor: default;
  border-radius: 4px;

  ${DocumentTitle} {
    display: ${(props) => (props.selected ? "flex" : "none")};
  }

  svg {
    flex-shrink: 0;
  }

  &:hover,
  &:active,
  &:focus {
    background: ${(props) =>
      props.selected ? "" : props.theme.listItemHoverBackground};
    outline: none;

    ${DocumentTitle} {
      display: flex;
    }
  }
`;

export default observer(PathToDocument);
