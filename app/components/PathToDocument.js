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
  onSuccess?: () => void,
  ref?: (?React.ElementRef<"div">) => void,
};

@observer
class PathToDocument extends React.Component<Props> {
  handleClick = async (ev: SyntheticEvent<>) => {
    ev.preventDefault();
    const { document, result, onSuccess } = this.props;
    if (!document) return;

    if (result.type === "document") {
      await document.move(result.collectionId, result.id);
    } else {
      await document.move(result.collectionId, null);
    }

    if (onSuccess) onSuccess();
  };

  render() {
    const { result, collection, document, ref } = this.props;
    const Component = document ? ResultWrapperLink : ResultWrapper;

    if (!result) return <div />;

    return (
      <Component ref={ref} onClick={this.handleClick} href="" selectable>
        {collection && <CollectionIcon collection={collection} />}
        {result.path
          .map((doc) => <Title key={doc.id}>{doc.title}</Title>)
          .reduce((prev, curr) => [prev, <StyledGoToIcon />, curr])}
        {document && (
          <Flex>
            {" "}
            <StyledGoToIcon /> <Title>{document.title}</Title>
          </Flex>
        )}
      </Component>
    );
  }
}

const Title = styled.span`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const StyledGoToIcon = styled(GoToIcon)`
  fill: ${(props) => props.theme.divider};
`;

const ResultWrapper = styled.div`
  display: flex;
  margin-bottom: 10px;
  margin-left: -4px;
  user-select: none;

  color: ${(props) => props.theme.text};
  cursor: default;
`;

const ResultWrapperLink = styled(ResultWrapper.withComponent("a"))`
  margin: 0 -8px;
  padding: 8px 4px;
  border-radius: 8px;

  &:hover,
  &:active,
  &:focus {
    background: ${(props) => props.theme.listItemHoverBackground};
    outline: none;
  }
`;

export default PathToDocument;
