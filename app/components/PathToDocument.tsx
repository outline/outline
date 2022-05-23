import { observer } from "mobx-react";
import { GoToIcon } from "outline-icons";
import * as React from "react";
import styled from "styled-components";
import { DocumentPath } from "~/stores/CollectionsStore";
import Collection from "~/models/Collection";
import Document from "~/models/Document";
import CollectionIcon from "~/components/CollectionIcon";
import Flex from "~/components/Flex";

type Props = {
  result: DocumentPath;
  document?: Document | null | undefined;
  collection: Collection | null | undefined;
  onSuccess?: () => void;
  style?: React.CSSProperties;
  ref?: (element: React.ElementRef<"div"> | null | undefined) => void;
};

@observer
class PathToDocument extends React.Component<Props> {
  handleClick = async (ev: React.SyntheticEvent) => {
    ev.preventDefault();
    const { document, result, onSuccess } = this.props;
    if (!document) {
      return;
    }

    if (result.type === "document") {
      await document.move(result.collectionId, result.id);
    } else {
      await document.move(result.collectionId);
    }

    if (onSuccess) {
      onSuccess();
    }
  };

  render() {
    const { result, collection, document, ref, style } = this.props;
    const Component = document ? ResultWrapperLink : ResultWrapper;
    if (!result) {
      return <div />;
    }

    return (
      // @ts-expect-error ts-migrate(2604) FIXME: JSX element type 'Component' does not have any con... Remove this comment to see the full error message
      <Component
        ref={ref}
        onClick={this.handleClick}
        href=""
        style={style}
        role="option"
        selectable
      >
        {collection && <CollectionIcon collection={collection} />}
        &nbsp;
        {result.path
          .map((doc) => <Title key={doc.id}>{doc.title}</Title>)
          // @ts-expect-error ts-migrate(2739) FIXME: Type 'Element[]' is missing the following properti... Remove this comment to see the full error message
          .reduce((prev, curr) => [prev, <StyledGoToIcon />, curr])}
        {document && (
          <DocumentTitle>
            {" "}
            <StyledGoToIcon /> <Title>{document.title}</Title>
          </DocumentTitle>
        )}
      </Component>
    );
  }
}

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
  display: flex;
  margin-bottom: 10px;
  user-select: none;

  color: ${(props) => props.theme.text};
  cursor: default;

  svg {
    flex-shrink: 0;
  }
`;

const ResultWrapperLink = styled(ResultWrapper.withComponent("a"))`
  padding: 8px 4px;

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
