// @flow
import React from 'react';
import styled from 'styled-components';
import { color } from 'shared/styles/constants';

type Props = {
  onClick: (redirect: ?boolean) => *,
  disabled?: boolean,
  isDraft?: boolean,
  isSaving?: boolean,
};

class SaveAction extends React.Component {
  props: Props;

  onClick = (ev: MouseEvent) => {
    if (this.props.disabled) return;

    ev.preventDefault();
    this.props.onClick();
  };

  render() {
    const { isSaving, isDraft, disabled } = this.props;

    return (
      <Link
        onClick={this.onClick}
        title="Save changes (Cmd+Enter)"
        disabled={disabled}
        isSaving={isSaving}
        isDraft={isDraft}
      >
        {isSaving ? 'Saving…' : isDraft ? 'Publish' : 'Save'}
      </Link>
    );
  }
}

const Link = styled.a`
  display: flex;
  align-items: center;
  color: ${props =>
    props.isSaving ? 'inherit' : `${color.primary} !important`};
  font-weight: ${props => (props.isSaving ? 'inherit' : '500')};
  opacity: ${props => (props.disabled ? 0.5 : 1)};
  pointer-events: ${props => (props.disabled ? 'none' : 'auto')};
  cursor: ${props => (props.disabled ? 'default' : 'pointer')};
`;

export default SaveAction;
