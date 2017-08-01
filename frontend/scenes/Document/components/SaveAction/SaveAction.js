// @flow
import React from 'react';
import styled from 'styled-components';
import Button from 'components/Button';
import CheckIcon from 'components/Icon/CheckIcon';
import { color } from 'styles/constants';
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
      <Button
        onClick={this.onClick}
        title="Save changes (Cmd+Enter)"
        disabled={disabled}
        icon={showCheckmark && <SavedIcon />}
        nude
      >
        {isNew ? 'Publish' : 'Save'}
      </Button>
    );
  }
}

const SavedIcon = styled(CheckIcon)`
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 8px;
  margin-right: -8px;
  animation: ${fadeAndScaleIn} 250ms ease;

  svg {
    fill: ${color.slateDark};
    width: 18px;
    height: 18px;
  }
`;

export default SaveAction;
