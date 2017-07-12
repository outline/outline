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
        href
        onClick={this.onClick}
        style={{ opacity: disabled ? 0.5 : 1 }}
        title="Save changes (Cmd+Enter)"
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
