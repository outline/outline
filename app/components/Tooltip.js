// @flow
import * as React from 'react';
import styled from 'styled-components';
import Tippy from '@tippy.js/react';

type Props = {
  tooltip: React.Node,
  placement?: 'top' | 'bottom' | 'left' | 'right',
  children: React.Node,
  delay?: number,
  className?: string,
  block?: boolean,
};

class Tooltip extends React.Component<Props> {
  shouldComponentUpdate() {
    return false;
  }

  render() {
    const {
      tooltip,
      delay = 50,
      children,
      block,
      className,
      ...rest
    } = this.props;
    const Component = block ? 'div' : 'span';

    return (
      <StyledTippy
        arrow
        arrowType="round"
        animation="shift-away"
        content={tooltip}
        delay={delay}
        duration={[200, 150]}
        inertia
        {...rest}
      >
        <Component className={className}>{children}</Component>
      </StyledTippy>
    );
  }
}

const StyledTippy = styled(Tippy)`
  font-size: 13px;
  background-color: ${props => props.theme.tooltipBackground};
  color: ${props => props.theme.tooltipText};

  svg {
    fill: ${props => props.theme.tooltipBackground};
  }
`;

export default Tooltip;
