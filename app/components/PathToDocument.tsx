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
  documentPath: DocumentPath;
  currentDocument?: Document | null | undefined;
  collection: Collection | null | undefined;
  href?: string;
  onClick?: (ev: React.SyntheticEvent) => void;
  style?: React.CSSProperties;
  ref?: (arg0: React.ElementRef<"div"> | null | undefined) => void;
};

@observer
class PathToDocument extends React.Component<Props> {
  handleClick = async (ev: React.SyntheticEvent) => {
    if (this.props.onClick) {
      this.props.onClick(ev);
    }
  };

  render() {
    const {
      documentPath,
      collection,
      currentDocument,
      ref,
      style,
      href,
    } = this.props;
    const Component = currentDocument ? ResultWrapperLink : ResultWrapper;
    if (!documentPath) {
      return <div />;
    }

    return (
      // @ts-expect-error ts-migrate(2604) FIXME: JSX element type 'Component' does not have any con... Remove this comment to see the full error message
      <Component
        ref={ref}
        onClick={this.handleClick}
        href={href ?? ""}
        style={style}
        role="option"
        selectable
      >
        {collection && <CollectionIcon collection={collection} />}
        &nbsp;
        {documentPath.path
          .map((doc) => <Title key={doc.id}>{doc.title}</Title>)
          // @ts-expect-error ts-migrate(2739) FIXME: Type 'Element[]' is missing the following properti... Remove this comment to see the full error message
          .reduce((prev, curr) => [prev, <StyledGoToIcon />, curr])}
        {currentDocument && (
          <DocumentTitle>
            <StyledGoToIcon /> <Title>{currentDocument.title}</Title>
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
