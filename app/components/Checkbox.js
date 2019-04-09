// @flow
import * as React from 'react';
import styled from 'styled-components';
import HelpText from 'components/HelpText';

export type Props = {
  checked?: boolean,
  label?: string,
  className?: string,
  note?: string,
  small?: boolean,
};

const LabelText = styled.span`
  font-weight: 500;
  margin-left: ${props => (props.small ? '6px' : '10px')};
  ${props => (props.small ? `color: ${props.theme.textSecondary}` : '')};
`;

const Wrapper = styled.div`
  padding-bottom: 8px;
  ${props => (props.small ? 'font-size: 14px' : '')};
`;

const Label = styled.label`
  display: flex;
  align-items: center;
`;

export default function Checkbox({
  label,
  note,
  className,
  small,
  short,
  ...rest
}: Props) {
  return (
    <React.Fragment>
      <Wrapper small={small}>
        <Label>
          <input type="checkbox" {...rest} />
          {label && <LabelText small={small}>{label}</LabelText>}
        </Label>
        {note && <HelpText small>{note}</HelpText>}
      </Wrapper>
    </React.Fragment>
  );
}
