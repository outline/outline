// @flow
import * as React from 'react';
import styled from 'styled-components';
import HelpText from 'components/HelpText';

export type Props = {
  checked?: boolean,
  label?: string,
  className?: string,
  note?: string,
};

const LabelText = styled.span`
  font-weight: 500;
  margin-left: 10px;
`;

const Wrapper = styled.div`
  padding-bottom: 8px;
`;

const Label = styled.label`
  display: flex;
  align-items: center;
`;

export default function Checkbox({
  label,
  note,
  className,
  short,
  ...rest
}: Props) {
  return (
    <React.Fragment>
      <Wrapper>
        <Label>
          <input type="checkbox" {...rest} />
          {label && <LabelText>{label}</LabelText>}
        </Label>
        {note && <HelpText small>{note}</HelpText>}
      </Wrapper>
    </React.Fragment>
  );
}
