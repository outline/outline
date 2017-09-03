// @flow
import React, { Component } from 'react';
import { observer } from 'mobx-react';
import { Link } from 'react-router-dom';
import Document from 'models/Document';
import styled from 'styled-components';
import { color } from 'styles/constants';
import PublishingInfo from 'components/PublishingInfo';
import StarIcon from 'components/Icon/StarIcon';

type Props = {
  document: Document,
  highlight?: ?string,
  showCollection?: boolean,
  innerRef?: Function,
};

const StyledStar = styled(StarIcon)`
  top: 2px;
  position: relative;
  margin-left: 4px;
  opacity: ${props => (props.solid ? '1 !important' : 0)};
  transition: opacity 100ms ease-in-out;

  svg {
    width: 1em;
    height: 1em;
  }
`;

const DocumentLink = styled(Link)`
  display: block;
  margin: 0 -16px;
  padding: 10px 16px;
  border-radius: 8px;
  border: 2px solid transparent;
  max-height: 50vh;
  min-width: 100%;
  overflow: hidden;

  &:hover,
  &:active,
  &:focus {
    background: ${color.smokeLight};
    border: 2px solid ${color.smoke};
    outline: none;

    ${StyledStar} {
      opacity: .25;

      &:hover {
        opacity: 1;
      }
    }
  }

  &:focus {
    border: 2px solid ${color.slateDark};
  }

  h3 {
    margin-top: 0;
    margin-bottom: .25em;
  }
`;

@observer class DocumentPreview extends Component {
  props: Props;

  star = (ev: SyntheticEvent) => {
    ev.preventDefault();
    ev.stopPropagation();
    this.props.document.star();
  };

  unstar = (ev: SyntheticEvent) => {
    ev.preventDefault();
    ev.stopPropagation();
    this.props.document.unstar();
  };

  render() {
    const { document, showCollection, innerRef, ...rest } = this.props;

    return (
      <DocumentLink to={document.url} innerRef={innerRef} {...rest}>
        <h3>
          {document.title}
          {document.starred
            ? <a onClick={this.unstar}><StyledStar solid /></a>
            : <a onClick={this.star}><StyledStar /></a>}
        </h3>
        <PublishingInfo
          document={document}
          collection={showCollection ? document.collection : undefined}
        />
      </DocumentLink>
    );
  }
}

export default DocumentPreview;
