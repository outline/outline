// @flow
import React from 'react';
import _ from 'lodash';
import styled from 'styled-components';

type Props = {
  content: string,
  truncate?: number,
  placeholder?: ?string,
};

class Title extends React.Component {
  props: Props;

  render() {
    let title;
    if (this.props.truncate) {
      title = _.truncate(this.props.content, { length: this.props.truncate });
    } else {
      title = this.props.content;
    }

    let usePlaceholder;
    if (this.props.children === null && this.props.placeholder) {
      title = this.props.placeholder;
      usePlaceholder = true;
    }

    return (
      <span>
        {title && <span>&nbsp;/&nbsp;</span>}
        <TitleText title={this.props.content} untitled={usePlaceholder}>
          {title}
        </TitleText>
      </span>
    );
  }
}

const TitleText = styled.span`
  opacity: ${props => (props.untitled ? 0.5 : 1)};
`;

export default Title;
