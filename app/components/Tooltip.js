// @flow
import * as React from 'react';
import styled from 'styled-components';
import Tippy from '@tippy.js/react';

type Props = {
  tooltip: React.Node,
  shortcut?: React.Node,
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
      shortcut,
      tooltip,
      delay = 50,
      children,
      block,
      className,
      ...rest
    } = this.props;
    const Component = block ? 'div' : 'span';

    let content = tooltip;

    if (shortcut) {
      content = (
        <React.Fragment>
          {tooltip} &middot; <Shortcut>{shortcut}</Shortcut>
        </React.Fragment>
      );
    }

    return (
      <StyledTippy
        arrow
        arrowType="round"
        animation="shift-away"
        content={content}
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

const Shortcut = styled.kbd`
  position: relative;
  top: -2px;

  display: inline-block;
  padding: 2px 4px;
  font: 10px 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier,
    monospace;
  line-height: 10px;
  color: ${props => props.theme.tooltipBackground};
  vertical-align: middle;
  background-color: ${props => props.theme.tooltipText};
  border-radius: 3px;
`;

const StyledTippy = styled(Tippy)`
  font-size: 13px;
  background-color: ${props => props.theme.tooltipBackground};
  color: ${props => props.theme.tooltipText};

  svg {
    fill: ${props => props.theme.tooltipBackground};
  }
`;

export default Tooltip;
