// @flow
import React, { Component } from 'react';
import { observer } from 'mobx-react';
import { Link } from 'react-router-dom';
import Document from 'models/Document';
import styled from 'styled-components';
import { color } from 'styles/constants';
import Icon from 'components/Icon';
import PublishingInfo from './components/PublishingInfo';

type Props = {
  document: Document,
  highlight?: ?string,
  showCollection?: boolean,
  innerRef?: Function,
};

const StyledStar = styled(({ solid, ...props }) => <Icon {...props} />).attrs({
  type: 'Star',
  color: color.text,
})`
  width: 16px;
  height: 16px;
  top: 1px;
  margin-left: 4px;
  opacity: ${props => (props.solid ? '1 !important' : 0)};
  transition: all 100ms ease-in-out;

  ${props => props.solid && 'polygon { fill: #000};'}

  &:hover {
    transform: scale(1.1);
  }
  &:active {
    transform: scale(0.95);
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
      opacity: .5;

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
            ? <a onClick={this.unstar}>
                <StyledStar solid />
              </a>
            : <a onClick={this.star}>
                <StyledStar />
              </a>}
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
