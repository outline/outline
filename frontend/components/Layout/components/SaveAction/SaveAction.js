// @flow
import React from 'react';
import Button from 'components/Button';

type Props = {
  onClick: Function,
  disabled?: boolean,
  isNew?: boolean,
};

const SaveAction = ({ onClick, disabled, isNew }: Props) => {
  return (
    <Button
      onClick={onClick}
      title="Save changes (Cmd+Enter)"
      disabled={disabled}
    >
      {isNew ? 'Publish' : 'Save'}
    </Button>
  );
};

export default SaveAction;
