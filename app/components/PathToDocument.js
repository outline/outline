// @flow
import { observer } from "mobx-react";
import { GoToIcon } from "outline-icons";
import * as React from "react";
import styled from "styled-components";
import type { DocumentPath } from "stores/CollectionsStore";
import Collection from "models/Collection";
import Document from "models/Document";
import Checkbox from "components/Checkbox";
import CollectionIcon from "components/CollectionIcon";
import Flex from "components/Flex";

type Props = {
  result: DocumentPath,
  document?: ?Document,
  collection: ?Collection,
  checked?: boolean,
  onSelect?: (DocumentPath) => void,
  style?: Object,
  ref?: (?React.ElementRef<"div">) => void,
};

@observer
class PathToDocument extends React.Component<Props> {
  handleClick = (ev: SyntheticEvent<>) => {
    ev.preventDefault();
    const { onSelect, result } = this.props;
    onSelect && onSelect(result);
  };

  render() {
    const { result, collection, document, ref, style, checked } = this.props;
    const Component = document ? ResultWrapperLink : ResultWrapper;

    if (!result) return <div />;

    return (
      <Component
        ref={ref}
        onClick={this.handleClick}
        href=""
        style={style}
        role="option"
        selectable
      >
        <Flex>
          {collection && <CollectionIcon collection={collection} />}
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
        {checked && (
          <ChechboxWrapper>
            <Checkbox onChange={() => {}} checked={checked} />
          </ChechboxWrapper>
        )}
      </Component>
    );
  }
}

const DocumentTitle = styled(Flex)``;

const ChechboxWrapper = styled(Flex)`
  align-content: center;
  margin: 0 5px;
`;

const Title = styled.span`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const StyledGoToIcon = styled(GoToIcon)`
  fill: ${(props) => props.theme.divider};
`;

const ResultWrapper = styled.div``;

const ResultWrapperLink = styled.div`
  padding: 8px 4px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  user-select: none;

  color: ${(props) => props.theme.text};
  cursor: default;

  ${DocumentTitle} {
    display: none;
  }

  svg {
    flex-shrink: 0;
  }

  &:hover,
  &:active,
  &:focus {
    background: ${(props) => props.theme.listItemHoverBackground};
    outline: none;

    ${DocumentTitle} {
      display: flex;
    }
  }
`;

export default PathToDocument;
