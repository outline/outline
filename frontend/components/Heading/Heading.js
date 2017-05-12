// @flow
import React from 'react';
import { observer } from 'mobx-react';
import styled from 'styled-components';

type Props = {
  size?: number,
  children: React.Element<any>,
};
const fontSizes = [32, 24, 20, 16, 14, 12];

const styleHeading = (component: string) => styled[component]`
  margin: 0;
  font-size: ${props => fontSizes[props.size - 1]}px;
  font-weight: 500;
`;

class Heading extends React.Component {
  props: Props;

  render() {
    const { size, children, ...rest } = this.props;
    const Component = `h${size || 3}`;
    const StyledHeading = styleHeading(Component);

    return <StyledHeading size={size} {...rest}>{children}</StyledHeading>;
  }
}

export default observer(Heading);
