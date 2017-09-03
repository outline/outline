// @flow
import React from 'react';
import styled from 'styled-components';
import CheckIcon from 'components/Icon/CheckIcon';
import { fadeAndScaleIn } from 'styles/animations';

type Props = {
  onClick: Function,
  showCheckmark: boolean,
  disabled?: boolean,
  isNew?: boolean,
};

class SaveAction extends React.Component {
  props: Props;

  onClick = (event: MouseEvent) => {
    if (this.props.disabled) return;

    event.preventDefault();
    this.props.onClick();
  };

  render() {
    const { showCheckmark, disabled, isNew } = this.props;

    return (
      <Link
        onClick={this.onClick}
        title="Save changes (Cmd+Enter)"
        disabled={disabled}
      >
        {showCheckmark && <SavedIcon />}
        {isNew ? 'Publish' : 'Save'}
      </Link>
    );
  }
}

const Link = styled.a`
  display: flex;
  align-items: center;
  opacity: ${props => (props.disabled ? 0.5 : 1)};
  pointer-events: ${props => (props.disabled ? 'none' : 'auto')};
  cursor: ${props => (props.disabled ? 'default' : 'pointer')};
`;

const SavedIcon = styled(CheckIcon)`
  animation: ${fadeAndScaleIn} 250ms ease;
  display: inline-block;
  margin-right: 4px;
  width: 18px;
  height: 18px;

  svg {
    width: 18px;
    height: 18px;
  }
`;

export default SaveAction;
